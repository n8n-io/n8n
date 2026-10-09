import { isAuthenticatedRequest } from '@n8n/db';
import { Get, Middleware, RootLevelController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';
import { getHtmlSandboxCSP } from 'n8n-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { userHasScopes } from '@/permissions.ee/check-access';

import { AppAuthService } from '../app-auth.service';
import { APP_SERVING_PATH } from '../app-host.constants';
import { AppServingService, type ResolvedAppFile } from './app-serving.service';
import { injectInspectorScript } from './inject-inspector-script';
import { pathSegments } from './path-segments';

// App OAuth cookies replace the default n8n session check.
@RootLevelController(APP_SERVING_PATH)
export class AppServingController {
	constructor(
		private readonly appServingService: AppServingService,
		private readonly appAuthService: AppAuthService,
	) {}

	@Middleware()
	checkHost(req: Request, res: Response, next: NextFunction) {
		this.appAuthService.checkHost(req, res, next);
	}

	@Middleware()
	async authenticate(req: Request, res: Response, next: NextFunction) {
		await this.appAuthService.authenticate(req, res, next);
	}

	/** Serve the active build or its entry document for client-side routes. */
	@Get('/:namespace{/*path}', { skipAuth: true, usesTemplates: true })
	async serve(req: Request, res: Response) {
		const segments = pathSegments(req.params.path);
		// Reserved for the runtime API; a built app must not get its index.html here.
		if (segments[0] === 'api') {
			res.status(404).json({ code: 'not_found', message: 'Not found' });
			return;
		}
		if (segments.some((segment) => segment.startsWith('.'))) {
			res.status(404).end();
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

	/** Unpublished builds still require the builder's app access. */
	private async mayServe(req: Request, { app, version }: ResolvedAppFile): Promise<boolean> {
		if (version.id === app.activeVersionId) return true;
		return (
			isAuthenticatedRequest(req) &&
			(await userHasScopes(req.user, ['app:read'], false, { projectId: app.projectId }))
		);
	}

	private async sendStaticFile(res: Response, filePath: string) {
		// Every file gets the sandbox policy: a browser renders `.htm`, `.svg` and
		// friends as documents too, and the policy is harmless on the rest.
		// The separate host isolates the editor. Keep the app origin for cookie-backed requests.
		res.setHeader('Content-Security-Policy', `${getHtmlSandboxCSP()} allow-same-origin`);
		const isHtml = path.extname(filePath) === '.html';
		res.setHeader('Cache-Control', 'private, no-store');

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

		res.sendFile(
			path.basename(filePath),
			{
				root: path.dirname(filePath),
				cacheControl: false,
				dotfiles: 'deny',
			},
			(error) => {
				if (error && !res.headersSent) res.status(404).type('text').send('Not found');
			},
		);
	}
}
