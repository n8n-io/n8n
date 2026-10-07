import { Get, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { getHtmlSandboxCSP } from 'n8n-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { AuthService } from '@/auth/auth.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AppServingService, type ResolvedAppFile } from './app-serving.service';
import { injectInspectorScript } from './inject-inspector-script';
import { pathSegments } from './path-segments';

@RootLevelController('/apps')
export class AppServingController {
	constructor(
		private readonly appServingService: AppServingService,
		private readonly authService: AuthService,
	) {}

	/**
	 * Serves a published App to anyone with the URL: a file of its active
	 * version's dist, or `index.html` for client-side routes.
	 *
	 * `skipAuth` because no App is protected, and because the auth middleware
	 * would clear the visitor's editor session cookie: a top-level navigation
	 * cannot send the `browser-id` header the middleware expects.
	 */
	@Get('/:namespace{/*path}', { skipAuth: true, usesTemplates: true })
	async serve(req: Request, res: Response) {
		const segments = pathSegments(req.params.path);
		// Reserved for the runtime API; a built app must not get its index.html here.
		if (segments[0] === 'api') {
			res.status(404).json({ code: 'not_found', message: 'Not found' });
			return;
		}
		const requestedVersionId = typeof req.query.v === 'string' ? req.query.v : undefined;
		const resolved = await this.appServingService.resolve(
			req.params.namespace,
			segments,
			requestedVersionId,
		);
		// An unpublished build is for its builders only; a visitor gets the same
		// answer as for a version that does not exist.
		if (!resolved || !(await this.mayServe(req, resolved))) {
			res.status(404).type('text').send('Not found');
			return;
		}
		const { filePath } = resolved;

		// A built app links its assets relative to its base URL, so the root document
		// has to carry the trailing slash.
		const { pathname, search } = new URL(req.originalUrl, 'http://n8n');
		if (segments.length === 0 && !pathname.endsWith('/')) {
			res.redirect(302, `/apps/${req.params.namespace}/${search}`);
			return;
		}

		await this.sendStaticFile(res, filePath);
	}

	/**
	 * The active version is public. Any other build needs the session cookie of
	 * a user who may read the app; the document and its assets load in an
	 * iframe, which cannot send the browser-id header, so the cookie alone is
	 * checked, as for other embedded resources.
	 */
	private async mayServe(req: Request, { app, version }: ResolvedAppFile): Promise<boolean> {
		if (version.id === app.activeVersionId) return true;
		const cookie = this.authService.getCookieToken(req);
		if (!cookie) return false;
		try {
			const user = await this.authService.authenticateUserByCookie(cookie);
			return await userHasScopes(user, ['app:read'], false, { projectId: app.projectId });
		} catch {
			return false;
		}
	}

	private async sendStaticFile(res: Response, filePath: string) {
		// Every file gets the sandbox policy: a browser renders `.htm`, `.svg` and
		// friends as documents too, and the policy is harmless on the rest.
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		// HTML is the entry point and must revalidate so a new version shows up on
		// reload. Assets revalidate too (ETag makes that a 304), because a build
		// may reference them by an unhashed name that changes content across versions.
		const isHtml = path.extname(filePath) === '.html';
		res.setHeader('Cache-Control', isHtml ? 'no-cache' : 'public, max-age=0, must-revalidate');

		if (isHtml) {
			// Read rather than stream so the element-picker script can be spliced in;
			// entry documents are small, so this costs nothing measurable.
			try {
				const html = await readFile(filePath, 'utf8');
				res.type('html').send(injectInspectorScript(html));
			} catch {
				if (!res.headersSent) res.status(404).type('text').send('Not found');
			}
			return;
		}

		// The opaque-origin document fetches module scripts and `crossorigin` styles with
		// CORS and `Origin: null`. Sent unconditionally so a CDN copy fits every visitor.
		res.setHeader('Access-Control-Allow-Origin', 'null');

		// `dotfiles: 'allow'` because the cache lives under `.n8n`, which `send`
		// would otherwise treat as a hidden path and refuse.
		res.sendFile(filePath, { cacheControl: false, dotfiles: 'allow' }, (error) => {
			if (error && !res.headersSent) res.status(404).type('text').send('Not found');
		});
	}
}
