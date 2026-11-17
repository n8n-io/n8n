import { classifyRestError, EventService, serializePublicApiError } from '@n8n/backend-services';
import { createIpRateLimit, Get, Middleware, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { NotFoundError, UnexpectedError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { NextFunction, Response } from 'express';
import path from 'node:path';

import { AppBundleCache, etagOf } from './app-bundle-cache';
import { AppHostService } from './app-host.service';
import { injectInspectorScript } from './inspector-script';
import { AppsConfig } from '../apps.config';
import { AppAuthService, type AppRequest } from '../auth/app-auth.service';
import { AppPreviewService } from '../preview/app-preview.service';

const parseCookies = cookieParser();
const ipRateLimit = createIpRateLimit(Container.get(AppsConfig).rateLimitServe, 60_000);

@RootLevelController('/', { surface: 'apps' })
export class AppServingController {
	constructor(
		private readonly bundles: AppBundleCache,
		private readonly auth: AppAuthService,
		private readonly hosts: AppHostService,
		private readonly preview: AppPreviewService,
		private readonly events: EventService,
	) {}

	@Middleware()
	async parseCookies(req: AppRequest, res: Response, next: NextFunction) {
		await parseCookies(req, res, next);
	}

	@Middleware()
	async authenticate(req: AppRequest, res: Response, next: NextFunction) {
		const pathname = this.filePath(req.path);
		if (pathname === '_n8n' || pathname.startsWith('_n8n/')) {
			res.sendStatus(404);
			return;
		}
		if (this.hosts.previewNamespace(req)) {
			await this.preview.authenticate(req, res, next);
		} else {
			await this.auth.authenticate(req, res, next);
		}
	}

	// The controller middleware checks app access instead of the n8n session cookie.
	@Get('/{*path}', { skipAuth: true, ipRateLimit, middlewares: [compression()] })
	async serve(req: AppRequest, res: Response) {
		try {
			const context = req.appContext;
			const versionId = context?.versionId;
			if (!context || !versionId) throw new NotFoundError('App not found.');
			const bundle = await this.bundles.get(versionId);
			const name = this.filePath(req.path);
			const index = bundle.get('index.html');
			let file = name ? bundle.get(name) : index;
			const isNavigation = this.auth.isNavigation(req);
			if (!file && !path.posix.extname(name) && isNavigation) {
				file = index;
			}
			if (!file) throw new NotFoundError('App file not found.');
			if (isNavigation && file === index) {
				const userId = context.preview ? context.previewUserId : context.security?.subject.id;
				if (!userId) throw new UnexpectedError('Authenticated app request has no user ID.');
				this.events.emit('app-opened', {
					appId: context.app.id,
					versionId,
					userId,
					isPreview: context.preview === true,
				});
			}
			const inspected = context.preview && file.contentType.startsWith('text/html');
			const body = inspected
				? Buffer.from(injectInspectorScript(file.body.toString('utf8'), this.hosts.editorOrigin))
				: file.body;
			res.set({
				'Cache-Control': 'private, no-cache',
				ETag: inspected ? etagOf(body) : file.etag,
				'Content-Type': file.contentType,
				'X-Content-Type-Options': 'nosniff',
				'Referrer-Policy': 'same-origin',
			});
			res.send(body);
		} catch (error) {
			// Keep file errors out of the main server's form-page error handling.
			const response = serializePublicApiError(classifyRestError(ensureError(error)));
			if (res.headersSent) {
				res.destroy();
				return;
			}
			res.set('Cache-Control', 'no-store').status(response.status).json(response.body);
		}
	}

	private filePath(value: string): string {
		let decoded: string;
		try {
			decoded = decodeURIComponent(value);
		} catch {
			throw new NotFoundError('App file not found.');
		}
		if (
			/[\\\0]/.test(decoded) ||
			decoded.split('/').some((part) => part === '.' || part === '..')
		) {
			throw new NotFoundError('App file not found.');
		}
		return decoded.replace(/^\//, '');
	}
}
