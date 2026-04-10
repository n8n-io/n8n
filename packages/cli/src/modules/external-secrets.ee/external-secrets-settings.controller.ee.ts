import { UpdateExternalSecretsSettingsDto } from '@n8n/api-types';
import { ModuleRegistry, Logger } from '@n8n/backend-common';
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
		private readonly moduleRegistry: ModuleRegistry,
		private readonly logger: Logger,
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
		try {
			await this.moduleRegistry.refreshModuleSettings('external-secrets');
		} catch (error) {
			this.logger.warn('Failed to sync external secrets settings to module registry', {
				cause: error instanceof Error ? error.message : String(error),
			});
		}

		return {
			systemRolesEnabled: await this.settingsService.isSystemRolesEnabled(),
		};
	}
}
