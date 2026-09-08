import { UserRepository } from '@n8n/db';
import { RootLevelController, type StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { getHtmlSandboxCSP } from 'n8n-core';
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Socket } from 'node:net';

import { userHasScopes } from '@/permissions.ee/check-access';

import {
	APP_PREVIEW_PATH_PREFIX,
	AppPreviewService,
	type AppPreviewEntry,
} from './app-preview.service';

/** The resolve step attaches the live entry the path token names. */
export type AppPreviewRequest = IncomingMessage & {
	appPreview?: AppPreviewEntry;
	originalUrl?: string;
};

const SANDBOX_RESTARTED_HEADER = 'x-sandbox-restarted';

/**
 * Reverse proxy from `/apps-preview/<token>/…` to the dev server in the
 * thread's sandbox. The token in the path is the credential
 * (`AppPreviewService.resolveToken`), so the router skips session auth: the
 * document is loaded in an opaque-origin iframe and its sub-resources carry
 * no cookies anyway, and the editor cookie must never reach the sandbox.
 */
@RootLevelController(APP_PREVIEW_PATH_PREFIX)
export class AppPreviewProxyController {
	static routers: StaticRouterMetadata[] = [
		{
			path: '/',
			router: Router().use(
				async (req, res, next) =>
					await Container.get(AppPreviewProxyController).handle(req, res, next),
			),
			skipAuth: true,
		},
	];

	private readonly proxy = createProxyMiddleware<AppPreviewRequest, Response>({
		// Replaced per request by `router`; the dev server lives behind the sandbox service the entry names.
		target: 'http://127.0.0.1',
		router: (req) => req.appPreview?.sandbox.url,
		changeOrigin: true,
		// Express hands the router a URL relative to the mount; the upgrade path arrives whole.
		pathRewrite: (path, req) =>
			`/sandboxes/${req.appPreview?.sandboxId}/ports/${req.appPreview?.port}${req.originalUrl ?? path}`,
		on: {
			proxyReq: (proxyReq, req) => {
				proxyReq.removeHeader('cookie');
				proxyReq.removeHeader('authorization');
				if (req.appPreview?.sandbox.apiKey) {
					proxyReq.setHeader('X-Api-Key', req.appPreview.sandbox.apiKey);
				}
				fixRequestBody(proxyReq, req);
			},
			proxyReqWs: (proxyReq, req) => {
				proxyReq.removeHeader('cookie');
				proxyReq.removeHeader('authorization');
				if (req.appPreview?.sandbox.apiKey) {
					proxyReq.setHeader('X-Api-Key', req.appPreview.sandbox.apiKey);
				}
			},
			proxyRes: (proxyRes, req) => {
				delete proxyRes.headers['content-security-policy'];
				delete proxyRes.headers['x-frame-options'];
				delete proxyRes.headers['set-cookie'];
				// Same opaque-origin policy the built app is served with.
				proxyRes.headers['content-security-policy'] = getHtmlSandboxCSP();
				if (proxyRes.headers['content-type']?.includes('text/html')) {
					// The URL is the credential; keep it out of third-party referrers.
					proxyRes.headers['referrer-policy'] = 'no-referrer';
				}
				const restarted =
					proxyRes.statusCode === 409 && proxyRes.headers[SANDBOX_RESTARTED_HEADER] !== undefined;
				if ((restarted || proxyRes.statusCode === 502) && req.appPreview) {
					this.appPreviewService.markDead(req.appPreview);
				}
			},
			error: (error, req, res) => {
				const code = 'code' in error ? error.code : undefined;
				if ((code === 'ECONNREFUSED' || code === 'ECONNRESET') && req.appPreview) {
					this.appPreviewService.markDead(req.appPreview);
				}
				if ('writeHead' in res) {
					if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' });
					res.end('Bad Gateway');
				} else {
					res.destroy();
				}
			},
		},
	});

	constructor(
		private readonly appPreviewService: AppPreviewService,
		private readonly userRepository: UserRepository,
	) {}

	async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
		const [, token, ...rest] = req.path.split('/');
		const entry = token ? this.appPreviewService.resolveToken(token) : undefined;
		if (!entry) {
			res.status(404).type('text').send('Not found');
			return;
		}
		// Vite only serves its base with the trailing slash, like the built app does.
		if (rest.length === 0) {
			const { search } = new URL(req.originalUrl, 'http://n8n');
			res.redirect(302, `${APP_PREVIEW_PATH_PREFIX}/${token}/${search}`);
			return;
		}
		if (this.isDocumentRequest(req) && !(await this.stillHasAccess(entry))) {
			res.status(404).type('text').send('Not found');
			return;
		}
		(req as AppPreviewRequest).appPreview = entry;
		await this.proxy(req, res, next);
	}

	/** Proxies the Vite HMR WebSocket; the sandbox never sees the editor's cookie. */
	setupUpgrade(server: HttpServer): void {
		server.on('upgrade', (req: AppPreviewRequest, socket: Socket, head: Buffer) => {
			const pathname = URL.parse(req.url ?? '', 'http://localhost')?.pathname;
			if (!pathname?.startsWith(`${APP_PREVIEW_PATH_PREFIX}/`)) return;
			const entry = this.appPreviewService.resolveToken(pathname.split('/')[2] ?? '');
			if (!entry) {
				socket.destroy();
				return;
			}
			delete req.headers.cookie;
			delete req.headers.authorization;
			req.appPreview = entry;
			this.proxy.upgrade(req, socket, head);
		});
	}

	/** The iframe document, as opposed to the modules and assets it loads with a wildcard Accept. */
	private isDocumentRequest(req: Request): boolean {
		return req.method === 'GET' && (req.headers.accept ?? '').includes('text/html');
	}

	/**
	 * The token carries the minting user; a member removed from the project
	 * loses the preview on the next reload, not only when the token expires.
	 */
	private async stillHasAccess(entry: AppPreviewEntry): Promise<boolean> {
		const user = await this.userRepository.findByIdWithRole(entry.userId);
		if (!user) return false;
		return await userHasScopes(user, ['app:read'], false, { projectId: entry.projectId });
	}
}
