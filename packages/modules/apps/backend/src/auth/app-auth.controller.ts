import { Get, RootLevelController } from '@n8n/decorators';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';

import { AppAuthService } from './app-auth.service';
import { AppPreviewService } from '../preview/app-preview.service';

const middlewares = [cookieParser()];

@RootLevelController('/', { surface: 'apps' })
export class AppAuthController {
	constructor(
		private readonly auth: AppAuthService,
		private readonly preview: AppPreviewService,
	) {}

	@Get('/_n8n/auth/:appId/login', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: true,
		middlewares,
	})
	async startSignIn(req: Request, res: Response) {
		const app = await this.auth.requireApp(req, String(req.params.appId));
		const returnPath = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
		await this.auth.begin(app, returnPath, res);
	}

	@Get('/_n8n/auth/:appId/callback', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: true,
		middlewares,
	})
	async completeSignIn(req: Request, res: Response) {
		await this.auth.complete(req, res, String(req.params.appId));
	}

	@Get('/_n8n/preview', { skipAuth: true, usesTemplates: true, ipRateLimit: true, middlewares })
	async startPreview(req: Request, res: Response) {
		await this.preview.exchange(req, res);
	}
}
