import { UpdateExternalSecretsSettingsDto } from '@n8n/api-types';
import { Body, GlobalScope, Middleware, Post, RestController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { sendErrorResponse } from '@/response-helper';

import { ExternalSecretsConfig } from './external-secrets.config';
import { ExternalSecretsSettingsService } from './external-secrets-settings.service.ee';

@RestController('/external-secrets/settings')
export class ExternalSecretsSettingsController {
	constructor(
		private readonly config: ExternalSecretsConfig,
		private readonly settingsService: ExternalSecretsSettingsService,
	) {}

	@Middleware()
	checkFeatureFlag(_req: Request, res: Response, next: NextFunction) {
		if (!this.config.externalSecretsRoleBasedAccess) {
			sendErrorResponse(
				res,
				new ForbiddenError('Role-based access for external secrets is not enabled'),
			);
			return;
		}
		next();
	}

	@Post('/')
	@GlobalScope('externalSecretsProvider:update')
	async updateSettings(
		_req: Request,
		_res: Response,
		@Body body: UpdateExternalSecretsSettingsDto,
	) {
		await this.settingsService.setSystemRolesEnabled(body.systemRolesEnabled);

		return {
			systemRolesEnabled: await this.settingsService.isSystemRolesEnabled(),
		};
	}
}
