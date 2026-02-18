import type { SecretCompletionsResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Middleware, Param, RestController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { ExternalSecretsConfig } from './external-secrets.config';
import { SecretsProvidersConnectionsService } from './secrets-providers-connections.service.ee';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { sendErrorResponse } from '@/response-helper';

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
	checkFeatureFlag(req: Request, res: Response, next: NextFunction) {
		const path = req.path;

		if (path.startsWith('/secrets/global')) {
			const hasAccess =
				this.config.externalSecretsMultipleConnections || this.config.externalSecretsForProjects;

			if (!hasAccess) {
				this.logger.warn('External secrets multiple connections feature is not enabled');
				sendErrorResponse(
					res,
					new ForbiddenError('External secrets multiple connections feature is not enabled'),
				);
				return;
			}
		} else if (path.startsWith('/secrets/project/')) {
			if (!this.config.externalSecretsForProjects) {
				this.logger.warn('External secrets for projects feature is not enabled');
				sendErrorResponse(
					res,
					new ForbiddenError('External secrets for projects feature is not enabled'),
				);
				return;
			}
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
		this.logger.debug('Listing secrets for project', { projectId });
		const connections = await this.connectionsService.getProjectCompletions(projectId);
		return this.connectionsService.toSecretCompletionsResponse(connections);
	}
}
