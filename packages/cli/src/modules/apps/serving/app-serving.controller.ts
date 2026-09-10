import { Get, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { getHtmlSandboxCSP } from 'n8n-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { AppServingService } from './app-serving.service';
import { injectInspectorScript } from './inject-inspector-script';
import { renderAppPage, renderAppPageNotFound } from './render-page';

/** Express 5 hands a wildcard path over as its segments; an empty path has none. */
const pathSegments = (path: unknown): string[] => {
	if (Array.isArray(path))
		return path.filter((segment): segment is string => typeof segment === 'string');
	return typeof path === 'string' && path !== '' ? [path] : [];
};

@RootLevelController('/apps')
export class AppServingController {
	constructor(private readonly appServingService: AppServingService) {}

	/**
	 * Serves an App to anyone with the URL: a file of its active version's
	 * dist, or one of its pages when it has no version.
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
		const resolved = await this.appServingService.resolve(req.params.namespace, segments);

		// A built app links its assets relative to its base URL, so the root document
		// has to carry the trailing slash.
		const { pathname, search } = new URL(req.originalUrl, 'http://n8n');
		if (resolved && segments.length === 0 && !pathname.endsWith('/')) {
			res.redirect(302, `/apps/${req.params.namespace}/${search}`);
			return;
		}

		if (resolved?.kind === 'static') {
			await this.sendStaticFile(res, resolved.filePath);
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

		// `dotfiles: 'allow'` because the cache lives under `.n8n`, which `send`
		// would otherwise treat as a hidden path and refuse.
		res.sendFile(filePath, { cacheControl: false, dotfiles: 'allow' }, (error) => {
			if (error && !res.headersSent) res.status(404).type('text').send('Not found');
		});
	}
}
