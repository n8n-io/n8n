import { Get, Options, Post, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { getHtmlSandboxCSP } from 'n8n-core';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

import { AuthService } from '@/auth/auth.service';
import { TEMPLATES_DIR } from '@/constants';
import { UrlService } from '@/services/url.service';
import { applyCors } from '@/utils/cors.util';

import { AppRepository } from '../app.repository';
import { AppServingService } from './app-serving.service';
import { AppTokenService, bearerToken } from './app-token.service';
import { renderAppPageNotFound, renderAppPageUnpublished } from './render-page';
import { ViewerService } from './viewer.service';

/** Express 5 hands a wildcard path over as its segments; an empty path has none. */
const pathSegments = (path: unknown): string[] => {
	if (Array.isArray(path))
		return path.filter((segment): segment is string => typeof segment === 'string');
	return typeof path === 'string' && path !== '' ? [path] : [];
};

const CODE_QUERY_KEY = '_code';

const stringQuery = (query: Request['query']): Record<string, string> => {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(query)) {
		if (typeof value === 'string' && key !== CODE_QUERY_KEY) result[key] = value;
	}
	return result;
};

const withCode = (originalUrl: string, code: string) =>
	`${originalUrl}${originalUrl.includes('?') ? '&' : '?'}${CODE_QUERY_KEY}=${code}`;

const tokenRequestSchema = z.discriminatedUnion('grant', [
	z.object({ grant: z.literal('code'), code: z.string().min(1) }),
	z.object({ grant: z.literal('refresh'), refreshToken: z.string().min(1) }),
]);
type TokenRequest = z.infer<typeof tokenRequestSchema>;

const staticFiles = new Map<string, Promise<Buffer>>();
const readStaticFile = async (name: string) => {
	let file = staticFiles.get(name);
	if (!file) {
		file = readFile(join(TEMPLATES_DIR, name));
		staticFiles.set(name, file);
	}
	return await file;
};

/** A served page runs on an opaque origin, so its own fetches are cross-origin. */
const CORS_OPTIONS = { extraAllowedHeaders: ['Authorization'], maxAge: 600 };

@RootLevelController('/apps')
export class AppServingController {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly appServingService: AppServingService,
		private readonly appTokenService: AppTokenService,
		private readonly viewerService: ViewerService,
		private readonly authService: AuthService,
		private readonly urlService: UrlService,
	) {}

	/**
	 * Registered before the `:namespace` wildcard route below so `_static` is
	 * never matched as a namespace (`appNamespaceSchema` also rejects a leading
	 * underscore).
	 */
	@Get('/_static/app.css', { skipAuth: true })
	async serveStylesheet(_req: Request, res: Response) {
		res.setHeader('Cache-Control', 'public, max-age=86400');
		res.type('css').send(await readStaticFile('app.css'));
	}

	@Get('/_static/app.js', { skipAuth: true })
	async serveScript(_req: Request, res: Response) {
		res.setHeader('Cache-Control', 'public, max-age=86400');
		res.type('js').send(await readStaticFile('app.js'));
	}

	@Get('/_static/app-chat.js', { skipAuth: true })
	async serveChatScript(_req: Request, res: Response) {
		res.setHeader('Cache-Control', 'public, max-age=86400');
		res.type('js').send(await readStaticFile('app-chat.js'));
	}

	// `usesTemplates` because these handlers write the response themselves; the
	// registry's default handler would send a second time.
	@Options('/:namespace{/*path}', { skipAuth: true, usesTemplates: true })
	preflight(req: Request, res: Response) {
		applyCors(req, res, CORS_OPTIONS);
		res.status(204).end();
	}

	/** Exchanges the one-time code from the page URL, or a refresh token, for a token pair. */
	@Post('/:namespace/_auth/token', { skipAuth: true, usesTemplates: true })
	async issueToken(req: Request, res: Response) {
		applyCors(req, res, CORS_OPTIONS);
		res.setHeader('Cache-Control', 'no-store');

		const body = tokenRequestSchema.safeParse(req.body);
		const pair = body.success ? await this.grant(body.data) : null;
		if (!pair) {
			res.status(400).json({ error: 'invalid_grant' });
			return;
		}
		res.json(pair);
	}

	private async grant(request: TokenRequest) {
		return request.grant === 'code'
			? await this.appTokenService.exchangeCode(request.code)
			: await this.appTokenService.refresh(request.refreshToken);
	}

	/** A `draft` access token of this App (editor preview) asks for the current Page rows. */
	private isDraftRequest(req: Request, appId: string): boolean {
		const token = bearerToken(req);
		const payload = token === undefined ? null : this.appTokenService.verifyAccess(token);
		return payload?.appId === appId && payload.mode === 'draft';
	}

	/**
	 * Serves a page of an App's active version, or of its draft for a `draft`
	 * token (so the in-place redirect after an action in the editor preview
	 * lands on draft content).
	 *
	 * `skipAuth` because the auth middleware would clear the visitor's editor
	 * session cookie: a top-level navigation cannot send the `browser-id`
	 * header the middleware expects. `ViewerService` reads the credentials
	 * instead, and `app.auth` decides whether an anonymous visit is allowed.
	 */
	@Get('/:namespace{/*path}', { skipAuth: true, usesTemplates: true })
	async servePage(req: Request, res: Response) {
		applyCors(req, res, CORS_OPTIONS);
		// The same policy every other public HTML surface in n8n serves, which puts
		// this document on an opaque origin.
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		res.setHeader('Cache-Control', 'no-store');

		const app = await this.appRepository.findByNamespace(req.params.namespace);
		if (!app) {
			res
				.status(404)
				.type('html')
				.send(await renderAppPageNotFound());
			return;
		}

		const viewer = await this.viewerService.fromRequest(req, app.id);
		if (app.auth === 'n8n' && !viewer) {
			if (req.headers.authorization) {
				res.status(401).json({ error: 'Sign in required' });
				return;
			}
			res.redirect(
				`${this.urlService.getInstanceBaseUrl()}/signin?redirect=${encodeURIComponent(req.originalUrl)}`,
			);
			return;
		}

		const segments = pathSegments(req.params.path);
		const draft = this.isDraftRequest(req, app.id);
		const resolution = draft
			? await this.appServingService.resolveDraft(app, segments)
			: await this.appServingService.resolvePublished(app, segments);
		if (!resolution) {
			res
				.status(404)
				.type('html')
				.send(
					draft || app.activeVersionId
						? await renderAppPageNotFound()
						: await renderAppPageUnpublished(),
				);
			return;
		}

		// A navigation (no Bearer) lands with a one-time code in the URL, which the
		// served script exchanges for tokens; the render itself never reads the code.
		if (!req.headers.authorization && typeof req.query[CODE_QUERY_KEY] !== 'string') {
			const code = await this.appTokenService.issueCode({
				appId: app.id,
				viewerId: viewer?.id ?? null,
				sessionToken: viewer ? (this.authService.getCookieToken(req) ?? null) : null,
			});
			res.redirect(withCode(req.originalUrl, code));
			return;
		}

		const html = await this.appServingService.render(
			resolution,
			segments,
			stringQuery(req.query),
			this.urlService.getInstanceBaseUrl(),
			viewer,
		);
		res.type('html').send(html);
	}
}
