import type { SecretCompletionsResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Middleware, Param, RestController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ExternalSecretsConfig } from './external-secrets.config';
import { SecretsProvidersConnectionsService } from './secrets-providers-connections.service.ee';

@RestController('/secret-providers/completions')
export class SecretProvidersCompletionsController {
	constructor(
		private readonly config: ExternalSecretsConfig,
		private readonly logger: Logger,
		private readonly connectionsService: SecretsProvidersConnectionsService,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	@Middleware()
	checkFeatureFlag(_req: Request, _res: Response, next: NextFunction) {
		if (!this.config.externalSecretsForProjects) {
			this.logger.warn('External secrets for projects feature is not enabled');
			throw new BadRequestError('External secrets for projects feature is not enabled');
		}
		next();
	}

	@Get('/secrets/global')
	@GlobalScope('externalSecret:list')
	async listGlobalSecrets(): Promise<SecretCompletionsResponse> {
		this.logger.debug('Listing global secrets');
		const connections = await this.connectionsService.getGlobalCompletions();
		return this.connectionsService.toSecretCompletionsResponse(connections);
	}

	@Get('/secrets/project/:projectId')
	@GlobalScope('externalSecret:list')
	async listProjectSecrets(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<SecretCompletionsResponse> {
		this.logger.debug('Listing secrets for project');
		const connections = await this.connectionsService.getProjectCompletions(projectId);
		return this.connectionsService.toSecretCompletionsResponse(connections);
	}
}
