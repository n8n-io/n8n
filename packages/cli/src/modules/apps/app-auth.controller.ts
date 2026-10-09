import { Get, Middleware, RootLevelController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { AppAuthService } from './app-auth.service';
import { APP_CALLBACK_PATH, APP_LOGIN_ROUTE } from './app-host.constants';

// These routes start and complete the app's OAuth login instead of checking n8n-auth.
@RootLevelController('/')
export class AppAuthController {
	constructor(private readonly appAuthService: AppAuthService) {}

	@Middleware()
	checkHost(req: Request, res: Response, next: NextFunction) {
		this.appAuthService.checkHost(req, res, next);
	}

	@Get(APP_LOGIN_ROUTE, { skipAuth: true, usesTemplates: true })
	async login(req: Request, res: Response) {
		const versionId = typeof req.query.v === 'string' ? req.query.v : undefined;
		const authorizeUrl = await this.appAuthService.beginLogin(req.params.namespace, res, versionId);
		if (!authorizeUrl) res.status(404).end();
		else res.redirect(authorizeUrl);
	}

	@Get(APP_CALLBACK_PATH, { skipAuth: true, usesTemplates: true })
	async handleCallback(req: Request, res: Response) {
		res.redirect(await this.appAuthService.completeLogin(req, res));
	}
}
