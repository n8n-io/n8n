import { Get, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { getHtmlSandboxCSP } from 'n8n-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { AppPageAuthService } from './app-page-auth.service';
import { AppServingService } from './app-serving.service';
import { injectInspectorScript } from './inject-inspector-script';
import { renderAppPage, renderAppPageNotFound } from './render-page';

/** Read by `@n8n/app-sdk`, which sends the token as the runtime API's bearer token. */
export const APP_PAGE_TOKEN_META_NAME = 'n8n-app-token';

/** Before `</head>` when there is one, else in front of the document. */
export function injectPageToken(html: string, token: string): string {
	const meta = `<meta name="${APP_PAGE_TOKEN_META_NAME}" content="${token}">`;
	const headEnd = html.search(/<\/head\s*>/i);
	return headEnd === -1 ? meta + html : html.slice(0, headEnd) + meta + html.slice(headEnd);
}

/** Express 5 hands a wildcard path over as its segments; an empty path has none. */
const pathSegments = (path: unknown): string[] => {
	if (Array.isArray(path))
		return path.filter((segment): segment is string => typeof segment === 'string');
	return typeof path === 'string' && path !== '' ? [path] : [];
};

@RootLevelController('/apps')
export class AppServingController {
	constructor(
		private readonly appServingService: AppServingService,
		private readonly appPageAuthService: AppPageAuthService,
	) {}

	/**
	 * Serves an App: a file of its active version's dist, or one of its pages
	 * when it has no version. Who may open either is the App's `authMode`,
	 * resolved by `AppPageAuthService`.
	 *
	 * `skipAuth` because the auth middleware would clear the visitor's editor
	 * session cookie: a top-level navigation cannot send the `browser-id` header
	 * the middleware expects.
	 */
	@Get('/:namespace{/*path}', { skipAuth: true, usesTemplates: true })
	async serve(req: Request, res: Response) {
		const segments = pathSegments(req.params.path);
		// Reserved for the runtime API; a built app must not get its index.html here.
		if (segments[0] === 'api') {
			res.status(404).json({ code: 'not_found', message: 'Not found' });
			return;
		}
		const resolved = await this.appServingService.resolve(req.params.namespace, segments);

		// A built app links its assets relative to its base URL, and the page cookie
		// is scoped to `/apps/<ns>/`, so the root document has to carry the trailing slash.
		const { pathname, search } = new URL(req.originalUrl, 'http://n8n');
		if (resolved && segments.length === 0 && !pathname.endsWith('/')) {
			res.redirect(302, `/apps/${req.params.namespace}/${search}`);
			return;
		}

		if (resolved?.kind === 'static') {
			const isDocument = path.extname(resolved.filePath) === '.html';
			const visitor = await this.appPageAuthService.admit(req, res, resolved.app, {
				recheckAccess: isDocument,
			});
			if (!visitor) return;
			if (isDocument) {
				const token = this.appPageAuthService.issuePageToken(req, res, resolved.app, visitor);
				await this.sendHtml(res, resolved.filePath, token);
				return;
			}
			this.sendStaticFile(res, resolved.filePath);
			return;
		}

		if (resolved) {
			const visitor = await this.appPageAuthService.admit(req, res, resolved.app, {
				recheckAccess: true,
			});
			if (!visitor) return;
		}

		// The same policy every other public HTML surface in n8n serves, which puts
		// this document on an opaque origin.
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());

		if (!resolved) {
			res
				.status(404)
				.type('html')
				.send(await renderAppPageNotFound());
			return;
		}

		res.type('html').send(await renderAppPage(resolved.context));
	}

	/** HTML is the entry point: it carries the page token, so no cache may keep it, and a reload shows a new version. */
	private async sendHtml(res: Response, filePath: string, token: string) {
		let html: string;
		try {
			html = await readFile(filePath, 'utf8');
		} catch {
			res.status(404).type('text').send('Not found');
			return;
		}
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		res.setHeader('Cache-Control', 'no-store');
		res.type('html').send(injectInspectorScript(injectPageToken(html, token)));
	}

	private sendStaticFile(res: Response, filePath: string) {
		// Every file gets the sandbox policy: a browser renders `.htm`, `.svg` and
		// friends as documents too, and the policy is harmless on the rest.
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		// Assets revalidate (ETag makes that a 304), because a build may reference
		// them by an unhashed name that changes content across versions.
		res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

		// `dotfiles: 'allow'` because the cache lives under `.n8n`, which `send`
		// would otherwise treat as a hidden path and refuse.
		res.sendFile(filePath, { cacheControl: false, dotfiles: 'allow' }, (error) => {
			if (error && !res.headersSent) res.status(404).type('text').send('Not found');
		});
	}
}
