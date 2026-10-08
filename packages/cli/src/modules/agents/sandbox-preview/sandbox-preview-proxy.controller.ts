import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { RootLevelController, type StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { Router, type Request, type Response } from 'express';
import type { IncomingMessage } from 'node:http';

import { SandboxPreviewAccess } from './sandbox-preview-access';
import {
	forwardToService,
	type ForwardEvents,
	type ServiceTarget,
} from './sandbox-preview-forwarder';
import {
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

const isSandboxRestart = (answer: IncomingMessage) =>
	answer.statusCode === 409 && answer.headers[SANDBOX_RESTARTED_HEADER] !== undefined;

/**
 * Reverse proxy from `/sandbox-preview/<token>/…` to the app on a port of an
 * n8n sandbox service sandbox. The token in the path is the credential, so the
 * router skips session auth. The editor cookie and the service API key never
 * reach the browser frame.
 *
 * The URL is a bearer credential for its whole TTL: whoever holds it reaches
 * the app while the user it was made for keeps access (see
 * `SandboxPreviewAccess`). The page-load check of the browser's session is an
 * extra check, not an access boundary. A URL ends early when an admin turns
 * the sandbox off or points it at another service.
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
				async (req, res) => await Container.get(SandboxPreviewProxyController).serve(req, res),
			),
			// `handle` checks the token and the access of the URL's user.
			skipAuth: true,
		},
	];

	private readonly logger: Logger;

	private agents?: ServiceTarget['agents'];

	constructor(
		logger: Logger,
		private readonly previewService: SandboxPreviewService,
		private readonly access: SandboxPreviewAccess,
		private readonly outboundHttp: OutboundHttp,
	) {
		this.logger = logger.scoped('agents');
	}

	async serve(req: Request, res: Response): Promise<void> {
		try {
			await this.handle(req, res);
		} catch (error) {
			// The frame shows a short answer, and the details stay in the log.
			this.logger.error('Could not serve an app preview', { error: ensureError(error).message });
			if (res.headersSent) res.destroy();
			else this.reply(res, 500, 'Internal Server Error');
		}
	}

	private async handle(req: Request, res: Response): Promise<void> {
		res.set(previewAnswerHeaders());
		const target = parsePreviewUrl(req.url);
		if (target.kind === 'invalid') return this.reply(res, 400, 'Bad Request');
		if (target.kind === 'no-token') return this.reply(res, 404, 'Not Found');
		const entry = this.previewService.resolveToken(target.token);
		// A URL for a service that is no longer configured is revoked here.
		const service = entry && (await this.previewService.serviceCredentials(entry));
		if (!entry || !service) return this.reply(res, 404, 'Not Found');
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
		const request = { path: `${entry.path}${target.forwardPath}`, apiKey: service.apiKey };
		forwardToService(req, res, this.serviceTarget(entry, request), this.forwardEvents(entry));
	}

	private async allowed(req: Request, entry: SandboxPreviewEntry): Promise<boolean> {
		// Each page load checks access again. Scripts, assets and API calls may use a recent pass.
		const isDocument = isDocumentRequest(req.method, req.headers);
		if (!(await this.access.tokenUserAllowed(entry, { fresh: isDocument }))) {
			// The URL is of no use now, so later requests get 404 and cost no check.
			this.previewService.markDead(entry);
			return false;
		}
		if (!isDocument) return true;
		return await this.access.sessionUserAllowed(req, entry);
	}

	private reply(res: Response, status: number, message: string): void {
		res.status(status).type('text/plain').send(message);
	}

	private serviceTarget(
		entry: SandboxPreviewEntry,
		request: { path: string; apiKey?: string },
	): ServiceTarget {
		return { ...request, serviceUrl: entry.serviceUrl, agents: this.serviceAgents() };
	}

	/** A sandbox restart ends the URL. A fault is logged without the request path. */
	private forwardEvents(entry: SandboxPreviewEntry): ForwardEvents {
		return {
			onResponse: (answer) => {
				if (isSandboxRestart(answer)) this.previewService.markDead(entry);
			},
			onError: (error) => {
				this.logger.warn('Could not proxy an app preview to the sandbox service', {
					code: 'code' in error ? error.code : undefined,
				});
			},
		};
	}

	private serviceAgents(): ServiceTarget['agents'] {
		// The service URL is admin-configured and often an internal host. The
		// instance proxy settings apply.
		this.agents ??= this.outboundHttp
			.transport({ useDefaultSsrfPolicy: 'unsafe' })
			.getNodeAgent({ keepAlive: true });
		return this.agents;
	}
}
