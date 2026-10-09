import { Get, Middleware, RootLevelController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { AppAuthService } from '../app-auth.service';
import { APP_INSPECTOR_PATH } from '../app-host.constants';

import { INSPECTOR_SCRIPT_SOURCE } from './inspector-script';

/**
 * Serves the element-picker script at a path outside `/apps`, so it can never
 * collide with `AppServingController`'s `/apps/:namespace{/*path}` wildcard.
 */
@RootLevelController('/')
export class AppInspectorScriptController {
	constructor(private readonly appAuthService: AppAuthService) {}

	@Middleware()
	checkHost(req: Request, res: Response, next: NextFunction) {
		this.appAuthService.checkHost(req, res, next);
	}

	@Middleware()
	async authenticate(req: Request, res: Response, next: NextFunction) {
		await this.appAuthService.authenticate(req, res, next);
	}

	// App OAuth cookies replace the default n8n session check.
	@Get(APP_INSPECTOR_PATH, { skipAuth: true, usesTemplates: true })
	serve(_req: Request, res: Response) {
		res.type('application/javascript').send(INSPECTOR_SCRIPT_SOURCE);
	}
}
