import { UserRepository } from '@n8n/db';
import { RootLevelController, type StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { getHtmlSandboxCSP } from 'n8n-core';
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Socket } from 'node:net';
import path from 'node:path';

import { userHasScopes } from '@/permissions.ee/check-access';

import {
	APP_PREVIEW_PATH_PREFIX,
	AppPreviewService,
	type AppPreviewBuiltDist,
	type AppPreviewDevEntry,
	type AppPreviewEntry,
} from './app-preview.service';

/** The resolve step attaches the live entry the path token names. */
export type AppPreviewRequest = IncomingMessage & {
	appPreview?: AppPreviewEntry;
	originalUrl?: string;
};

const SANDBOX_RESTARTED_HEADER = 'x-sandbox-restarted';

/**
 * The path is forwarded verbatim under the key-bearing `/sandboxes/<id>/ports/<port>`
 * prefix, so no segment may climb out of it, encoded or not.
 */
function hasDotDotSegment(segments: string[]): boolean {
	return segments.some((segment) => {
		try {
			return decodeURIComponent(segment).split(/[\\/]/).includes('..');
		} catch {
			return true;
		}
	});
}

/**
 * Root-relative path of the requested file inside the built dist, or undefined
 * when the segments would leave it. Sandbox paths are POSIX whatever n8n runs
 * on, hence not `resolveDistPath` from the apps module. No segments resolve to
 * the dist itself, which the caller turns into `index.html`.
 */
function resolveBuiltPath(distDir: string, segments: string[]): string | undefined {
	const root = path.posix.normalize(distDir);
	const target = path.posix.normalize(path.posix.join(root, ...segments.filter(Boolean)));
	return target === root || target.startsWith(`${root}/`) ? target : undefined;
}

const devEntry = (req: AppPreviewRequest): AppPreviewDevEntry | undefined =>
	req.appPreview?.kind === 'dev' ? req.appPreview : undefined;

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
		router: (req) => devEntry(req)?.sandbox.url,
		changeOrigin: true,
		// Express hands the router a URL relative to the mount; the upgrade path arrives whole.
		pathRewrite: (requestPath, req) => {
			const entry = devEntry(req);
			return `/sandboxes/${entry?.sandboxId}/ports/${entry?.port}${req.originalUrl ?? requestPath}`;
		},
		on: {
			proxyReq: (proxyReq, req) => {
				proxyReq.removeHeader('cookie');
				proxyReq.removeHeader('authorization');
				const apiKey = devEntry(req)?.sandbox.apiKey;
				if (apiKey) proxyReq.setHeader('X-Api-Key', apiKey);
				fixRequestBody(proxyReq, req);
			},
			proxyReqWs: (proxyReq, req) => {
				proxyReq.removeHeader('cookie');
				proxyReq.removeHeader('authorization');
				const apiKey = devEntry(req)?.sandbox.apiKey;
				if (apiKey) proxyReq.setHeader('X-Api-Key', apiKey);
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
				if (restarted && req.appPreview) {
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

	async handle(req: Request & AppPreviewRequest, res: Response, next: NextFunction): Promise<void> {
		const [, token, ...rest] = req.path.split('/');
		const entry =
			token && !hasDotDotSegment(rest) ? this.appPreviewService.resolveToken(token) : undefined;
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
		if (entry.kind === 'built') {
			await this.serveBuilt(entry.dist, rest, req, res);
			return;
		}
		req.appPreview = entry;
		await this.proxy(req, res, next);
	}

	/** Proxies the Vite HMR WebSocket; the sandbox never sees the editor's cookie. A built preview has none. */
	setupUpgrade(server: HttpServer): void {
		server.on('upgrade', (req: AppPreviewRequest, socket: Socket, head: Buffer) => {
			const pathname = URL.parse(req.url ?? '', 'http://localhost')?.pathname;
			if (!pathname?.startsWith(`${APP_PREVIEW_PATH_PREFIX}/`)) return;
			const [, , token, ...rest] = pathname.split('/');
			const entry = hasDotDotSegment(rest)
				? undefined
				: this.appPreviewService.resolveToken(token ?? '');
			if (entry?.kind !== 'dev') {
				socket.destroy();
				return;
			}
			delete req.headers.cookie;
			delete req.headers.authorization;
			req.appPreview = entry;
			this.proxy.upgrade(req, socket, head);
		});
	}

	/**
	 * Serves a file of the built preview from the sandbox filesystem with the
	 * headers the built app gets from `AppServingController`; an unknown path
	 * falls back to `index.html` for the app's own routes.
	 */
	private async serveBuilt(
		dist: AppPreviewBuiltDist | undefined,
		segments: string[],
		req: Request,
		res: Response,
	): Promise<void> {
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			res.set('Allow', 'GET, HEAD').status(405).type('text').send('Method Not Allowed');
			return;
		}
		const target = dist && resolveBuiltPath(dist.dir, segments.map(decodeURIComponent));
		if (!dist || !target) {
			res.status(404).type('text').send('Not found');
			return;
		}
		const indexPath = `${dist.dir}/index.html`;
		const filePath = target === dist.dir ? indexPath : target;
		const file =
			(await this.readBuiltFile(dist, filePath)) ??
			(filePath === indexPath ? undefined : await this.readBuiltFile(dist, indexPath));
		if (!file) {
			res.status(404).type('text').send('Not found');
			return;
		}
		const isHtml = path.posix.extname(file.path) === '.html';
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		res.setHeader('Cache-Control', isHtml ? 'no-cache' : 'public, max-age=0, must-revalidate');
		if (isHtml) res.setHeader('Referrer-Policy', 'no-referrer');
		res.type(path.posix.extname(file.path) || 'bin').send(file.content);
	}

	/** Undefined when the path is missing or a directory. */
	private async readBuiltFile(
		dist: AppPreviewBuiltDist,
		filePath: string,
	): Promise<{ path: string; content: Buffer } | undefined> {
		try {
			const content = await dist.filesystem.readFile(filePath);
			return { path: filePath, content: Buffer.isBuffer(content) ? content : Buffer.from(content) };
		} catch {
			return undefined;
		}
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
