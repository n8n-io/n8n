import { Get, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { getHtmlSandboxCSP } from 'n8n-core';
import path from 'node:path';

import { AppServingService } from './app-serving.service';
import { renderAppPage, renderAppPageNotFound } from './render-page';

/** Express 5 hands a wildcard path over as its segments; an empty path has none. */
const pathSegments = (path: unknown): string[] => {
	if (Array.isArray(path))
		return path.filter((segment): segment is string => typeof segment === 'string');
	return typeof path === 'string' && path !== '' ? [path] : [];
};

const hasTrailingSlash = (url: string) => url.split('?')[0].endsWith('/');

@RootLevelController('/apps')
export class AppServingController {
	constructor(private readonly appServingService: AppServingService) {}

	/**
	 * Serves an App to anyone with the URL: a file of its active version's
	 * dist, or one of its pages when it has no version.
	 *
	 * `skipAuth` because no App is protected yet, and because the auth middleware
	 * would clear the visitor's editor session cookie: a top-level navigation
	 * cannot send the `browser-id` header the middleware expects. Whichever auth
	 * an App later declares gets resolved in this handler instead.
	 */
	@Get('/:namespace{/*path}', { skipAuth: true, usesTemplates: true })
	async serve(req: Request, res: Response) {
		const segments = pathSegments(req.params.path);
		const resolved = await this.appServingService.resolve(req.params.namespace, segments);

		if (resolved?.kind === 'static') {
			// A built app links its assets relative to its base URL, so the
			// root document has to carry the trailing slash.
			if (segments.length === 0 && !hasTrailingSlash(req.originalUrl)) {
				res.redirect(302, `/apps/${req.params.namespace}/`);
				return;
			}
			this.sendStaticFile(res, resolved.filePath);
			return;
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

	private sendStaticFile(res: Response, filePath: string) {
		// HTML is the entry point and must revalidate so a new version shows up
		// on reload; hashed assets can be cached for a while.
		if (path.extname(filePath) === '.html') {
			res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
			res.setHeader('Cache-Control', 'no-cache');
		} else {
			res.setHeader('Cache-Control', 'public, max-age=3600');
		}

		// `dotfiles: 'allow'` because the cache lives under `.n8n`, which `send`
		// would otherwise treat as a hidden path and refuse.
		res.sendFile(filePath, { cacheControl: false, dotfiles: 'allow' }, (error) => {
			if (error && !res.headersSent) res.status(404).type('text').send('Not found');
		});
	}
}
