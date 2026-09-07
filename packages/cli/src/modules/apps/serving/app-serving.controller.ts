import { Get, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { getHtmlSandboxCSP } from 'n8n-core';

import { AppServingService } from './app-serving.service';
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
	 * Serves a page of an App to anyone with the URL.
	 *
	 * `skipAuth` because no App is protected yet, and because the auth middleware
	 * would clear the visitor's editor session cookie: a top-level navigation
	 * cannot send the `browser-id` header the middleware expects. Whichever auth
	 * an App later declares gets resolved in this handler instead.
	 */
	@Get('/:namespace{/*path}', { skipAuth: true, usesTemplates: true })
	async servePage(req: Request, res: Response) {
		// The same policy every other public HTML surface in n8n serves, which puts
		// this document on an opaque origin.
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());

		const page = await this.appServingService.resolvePage(
			req.params.namespace,
			pathSegments(req.params.path),
		);

		if (!page) {
			res
				.status(404)
				.type('html')
				.send(await renderAppPageNotFound());
			return;
		}

		res.type('html').send(await renderAppPage(page));
	}
}
