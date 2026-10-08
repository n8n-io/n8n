import { Logger } from '@n8n/backend-common';
import { UserRepository, type User } from '@n8n/db';
import { RootLevelController, type StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';

import { AuthService } from '@/auth/auth.service';
import { userHasScopes } from '@/permissions.ee/check-access';

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

interface ProxyTarget {
	entry: SandboxPreviewEntry;
	forwardPath: string;
}

type PreviewRequest = IncomingMessage & { sandboxPreview?: ProxyTarget };

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
	// The kept bytes are decompressed and complete.
	proxyReq.removeHeader('content-encoding');
	proxyReq.removeHeader('transfer-encoding');
	proxyReq.setHeader('content-length', body.length);
	proxyReq.write(body);
}

/**
 * Reverse proxy from `/sandbox-preview/<token>/…` to the app on a port of an
 * n8n sandbox service sandbox. The token in the path is the credential, so the
 * router skips session auth. The editor cookie and the service API key never
 * reach the browser frame.
 *
 * Path mode limits (no host mode in v1):
 * - The app gets only what follows the token, so it must use relative URLs or
 *   a base path. A root-absolute URL (`/src/main.ts`, `/rest`) resolves against
 *   n8n, not the app.
 * - HTTP only: no WebSocket, so no hot reload.
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
			// `handle` checks the token and, for each page load, the viewer's access.
			skipAuth: true,
		},
	];

	private readonly logger: Logger;

	private readonly proxy = createProxyMiddleware<PreviewRequest, ServerResponse>({
		// `router` replaces this for every request: each entry names its own sandbox service.
		target: 'http://127.0.0.1',
		router: (req) => proxyTarget(req).entry.serviceUrl,
		pathRewrite: (_path, req) => {
			const { entry, forwardPath } = proxyTarget(req);
			return `${entry.path}${forwardPath}`;
		},
		changeOrigin: true,
		on: {
			proxyReq: (proxyReq, req) => this.onProxyRequest(proxyReq, req),
			proxyRes: (proxyRes, req) => this.onProxyResponse(proxyRes, req),
			error: (error, _req, res) => {
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
			},
		},
	});

	constructor(
		logger: Logger,
		private readonly previewService: SandboxPreviewService,
		private readonly authService: AuthService,
		private readonly userRepository: UserRepository,
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
		if (isDocumentRequest(req.method, req.headers) && !(await this.viewerHasAccess(req, entry))) {
			return this.reply(res, 403, 'Forbidden');
		}
		req.sandboxPreview = { entry, forwardPath: target.forwardPath };
		await this.proxy(req, res, next);
	}

	private reply(res: Response, status: number, message: string): void {
		res.status(status).type('text/plain').send(message);
	}

	private onProxyRequest(proxyReq: ClientRequest, req: PreviewRequest): void {
		for (const name of droppedRequestHeaders(proxyReq.getHeaderNames())) {
			proxyReq.removeHeader(name);
		}
		const apiKey = req.sandboxPreview?.entry.apiKey;
		if (apiKey) proxyReq.setHeader('x-api-key', apiKey);
		forwardReadBody(proxyReq, req);
	}

	private onProxyResponse(proxyRes: IncomingMessage, req: PreviewRequest): void {
		hardenResponseHeaders(proxyRes.headers);
		const restarted =
			proxyRes.statusCode === 409 && proxyRes.headers[SANDBOX_RESTARTED_HEADER] !== undefined;
		if (restarted && req.sandboxPreview) this.previewService.markDead(req.sandboxPreview.entry);
	}

	/**
	 * Checked on each page load, so a viewer who lost the project loses the
	 * preview at the next reload, not only when the token expires.
	 */
	private async viewerHasAccess(req: Request, entry: SandboxPreviewEntry): Promise<boolean> {
		const viewer = await this.viewer(req, entry);
		if (!viewer || viewer.disabled) return false;
		return await userHasScopes(viewer, ['agent:execute'], false, { projectId: entry.projectId });
	}

	/** The browser's session user when it sends a session cookie, else the user of the token. */
	private async viewer(req: Request, entry: SandboxPreviewEntry): Promise<User | null> {
		const cookie = this.authService.getCookieToken(req);
		if (!cookie) return await this.userRepository.findByIdWithRole(entry.userId);
		// A session that does not validate gets no fallback to the user of the token.
		return await this.authService.authenticateUserByCookie(cookie).catch(() => null);
	}
}
