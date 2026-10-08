import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { RootLevelController, type StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { createProxyMiddleware, type RequestHandler } from 'http-proxy-middleware';
import type { Agent, ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import type { Agent as HttpsAgent } from 'node:https';
import type { Socket } from 'node:net';

import { SandboxPreviewAccess } from './sandbox-preview-access';
import {
	droppedRequestHeaders,
	hardenResponseHeaders,
	isCorsPreflight,
	preflightAnswerHeaders,
	previewAnswerHeaders,
} from './sandbox-preview-headers';
import { isDocumentRequest, parsePreviewUrl } from './sandbox-preview-request';
import {
	SANDBOX_PREVIEW_PATH_PREFIX,
	SandboxPreviewService,
	type SandboxPreviewEntry,
} from './sandbox-preview.service';

/** The sandbox service answers 409 with this header after the sandbox restarted. */
const SANDBOX_RESTARTED_HEADER = 'x-sandbox-restarted';

/** The body encodings that `rawBodyReader` decodes before it keeps the body. */
const DECODED_BODY_ENCODINGS: ReadonlySet<string> = new Set(['gzip', 'deflate']);

type ServiceProtocol = 'http' | 'https';

interface ProxyTarget {
	entry: SandboxPreviewEntry;
	forwardPath: string;
	apiKey?: string;
}

type PreviewRequest = IncomingMessage & { sandboxPreview?: ProxyTarget };

type PreviewProxy = RequestHandler<PreviewRequest, ServerResponse>;

function proxyTarget(req: PreviewRequest): ProxyTarget {
	if (!req.sandboxPreview) throw new UnexpectedError('The sandbox preview request has no target');
	return req.sandboxPreview;
}

/**
 * The n8n body parser reads each body before routing, so send the bytes that
 * it kept. It does not read a multipart body, which the proxy then streams.
 */
function forwardReadBody(proxyReq: ClientRequest, req: IncomingMessage): void {
	const body: unknown = req.rawBody;
	if (!Buffer.isBuffer(body) || body.length === 0) return;
	// The kept bytes are complete. They are decompressed only for the encodings that n8n decodes.
	const encoding = req.headers['content-encoding'];
	if (encoding !== undefined && DECODED_BODY_ENCODINGS.has(encoding)) {
		proxyReq.removeHeader('content-encoding');
	}
	proxyReq.removeHeader('transfer-encoding');
	proxyReq.setHeader('content-length', body.length);
	proxyReq.write(body);
}

/**
 * http-proxy pipes the answer and does not end the browser's answer when the
 * service stops in the middle of it. Without this, the frame waits with no
 * end and keeps one of the browser's connections to n8n.
 */
function endWhenUpstreamStops(proxyRes: IncomingMessage, res: ServerResponse): void {
	proxyRes.on('close', () => {
		if (!proxyRes.complete) res.destroy();
	});
}

/**
 * Reverse proxy from `/sandbox-preview/<token>/…` to the app on a port of an
 * n8n sandbox service sandbox. The token in the path is the credential, so the
 * router skips session auth. The editor cookie and the service API key never
 * reach the browser frame.
 *
 * The URL is a bearer credential for its whole TTL: whoever holds it reaches
 * the app while the user it was made for keeps access. The page-load check of
 * the browser's session is an extra check, not an access boundary.
 *
 * Path mode limits (no host mode in v1):
 * - The app gets only what follows the token, so it must use relative URLs or
 *   a base path. A root-absolute URL (`/src/main.ts`, `/rest`) resolves against
 *   n8n, not the app.
 * - HTTP only: no WebSocket, so no hot reload.
 * - No app cookies: n8n removes `Set-Cookie` and never forwards `Cookie`. The
 *   page has an opaque origin, so a fetch with credentials (`credentials:
 *   'include'`, `withCredentials`) fails its CORS check.
 * - Only the page headers in `PAGE_REQUEST_HEADERS` reach the app. A request
 *   with another custom header fails its preflight.
 * - n8n reads JSON, XML, form and text bodies before the proxy. A body that
 *   does not parse gets 422 from n8n, and a body over N8N_PAYLOAD_SIZE_MAX
 *   gets 413, so the app never sees those requests.
 */
@RootLevelController(SANDBOX_PREVIEW_PATH_PREFIX)
export class SandboxPreviewProxyController {
	static routers: StaticRouterMetadata[] = [
		{
			path: '/',
			router: Router().use(
				async (req, res, next) =>
					await Container.get(SandboxPreviewProxyController).handle(req, res, next),
			),
			// `handle` checks the token and the access of the URL's user.
			skipAuth: true,
		},
	];

	private readonly logger: Logger;

	/** One proxy for each protocol, because a keep-alive agent serves one protocol. */
	private readonly proxies: Partial<Record<ServiceProtocol, PreviewProxy>> = {};

	private agents?: { httpAgent: Agent; httpsAgent: HttpsAgent };

	constructor(
		logger: Logger,
		private readonly previewService: SandboxPreviewService,
		private readonly access: SandboxPreviewAccess,
		private readonly outboundHttp: OutboundHttp,
	) {
		this.logger = logger.scoped('agents');
	}

	async handle(req: Request & PreviewRequest, res: Response, next: NextFunction): Promise<void> {
		res.set(previewAnswerHeaders());
		const target = parsePreviewUrl(req.url);
		if (target.kind === 'invalid') return this.reply(res, 400, 'Bad Request');
		if (target.kind === 'no-token') return this.reply(res, 404, 'Not Found');
		const entry = this.previewService.resolveToken(target.token);
		if (!entry) return this.reply(res, 404, 'Not Found');
		if (target.kind === 'token-only') {
			// Relative, so that the redirect keeps a path prefix that a reverse proxy removed.
			res.redirect(302, `./${target.token}/${target.search}`);
			return;
		}
		if (isCorsPreflight(req.method, req.headers)) {
			res.set(preflightAnswerHeaders()).status(204).end();
			return;
		}
		if (!(await this.allowed(req, entry))) return this.reply(res, 403, 'Forbidden');
		const apiKey = await this.previewService.serviceApiKey();
		req.sandboxPreview = { entry, forwardPath: target.forwardPath, apiKey };
		await this.proxyFor(entry.serviceUrl)(req, res, next);
	}

	private async allowed(req: Request, entry: SandboxPreviewEntry): Promise<boolean> {
		if (!(await this.access.tokenUserAllowed(entry))) {
			// The URL is of no use now, so later requests get 404 and cost no check.
			this.previewService.markDead(entry);
			return false;
		}
		if (!isDocumentRequest(req.method, req.headers)) return true;
		return await this.access.sessionUserAllowed(req, entry);
	}

	private reply(res: Response, status: number, message: string): void {
		res.status(status).type('text/plain').send(message);
	}

	private proxyFor(serviceUrl: string): PreviewProxy {
		const protocol: ServiceProtocol = new URL(serviceUrl).protocol === 'https:' ? 'https' : 'http';
		const proxy = this.proxies[protocol] ?? this.createProxy(protocol);
		this.proxies[protocol] = proxy;
		return proxy;
	}

	private createProxy(protocol: ServiceProtocol): PreviewProxy {
		// Keep-alive saves a TCP and TLS handshake for each module and asset. The
		// service URL is admin-configured, and the instance proxy settings apply.
		this.agents ??= this.outboundHttp
			.transport({ useDefaultSsrfPolicy: 'unsafe' })
			.getNodeAgent({ keepAlive: true });
		return createProxyMiddleware<PreviewRequest, ServerResponse>({
			// `router` replaces this for every request: each entry names its own sandbox service.
			target: 'http://127.0.0.1',
			router: (req) => proxyTarget(req).entry.serviceUrl,
			pathRewrite: (_path, req) => {
				const { entry, forwardPath } = proxyTarget(req);
				return `${entry.path}${forwardPath}`;
			},
			changeOrigin: true,
			agent: protocol === 'https' ? this.agents.httpsAgent : this.agents.httpAgent,
			on: {
				proxyReq: (proxyReq, req) => this.onProxyRequest(proxyReq, req),
				proxyRes: (proxyRes, req, res) => this.onProxyResponse(proxyRes, req, res),
				error: (error, _req, res) => this.onProxyError(error, res),
			},
		});
	}

	private onProxyRequest(proxyReq: ClientRequest, req: PreviewRequest): void {
		for (const name of droppedRequestHeaders(proxyReq.getHeaderNames())) {
			proxyReq.removeHeader(name);
		}
		// The hop to the service is n8n's own, whatever the browser or a reverse proxy sent.
		proxyReq.setHeader('connection', 'keep-alive');
		const apiKey = req.sandboxPreview?.apiKey;
		if (apiKey) proxyReq.setHeader('x-api-key', apiKey);
		forwardReadBody(proxyReq, req);
	}

	private onProxyResponse(
		proxyRes: IncomingMessage,
		req: PreviewRequest,
		res: ServerResponse,
	): void {
		endWhenUpstreamStops(proxyRes, res);
		hardenResponseHeaders(proxyRes.headers);
		const restarted =
			proxyRes.statusCode === 409 && proxyRes.headers[SANDBOX_RESTARTED_HEADER] !== undefined;
		if (restarted && req.sandboxPreview) this.previewService.markDead(req.sandboxPreview.entry);
	}

	private onProxyError(error: Error, res: ServerResponse | Socket): void {
		this.logger.warn('Could not proxy an app preview to the sandbox service', {
			code: 'code' in error ? error.code : undefined,
		});
		if (!('writeHead' in res)) {
			res.destroy();
			return;
		}
		if (!res.headersSent) {
			res.writeHead(502, { ...previewAnswerHeaders(), 'content-type': 'text/plain' });
		}
		res.end('Bad Gateway');
	}
}
