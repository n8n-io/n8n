import type { SecretCompletionsResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Middleware, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { sendErrorResponse } from '@/response-helper';

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

	/**
	 * Global secrets are always used in the context of working with a credential,
	 * which themself are are always in the context of a project.
	 * Passing the project id help us check that the user wanting to access the global secrets
	 * has the permission to use secrets.
	 *
	 * On the system role the externalSecret:list scope is compatible with the credential create and edit scopes.
	 * As a result any user who can create or edit a project credential can use the global secrets.
	 */
	@Get('/secrets/global/:projectId')
	@ProjectScope('externalSecret:list')
	async listGlobalSecretsForProject(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<SecretCompletionsResponse> {
		this.logger.debug('Listing global secrets for project', { projectId });
		const connections = await this.connectionsService.getGlobalCompletions();
		return this.connectionsService.toSecretCompletionsResponse(connections);
	}

	@Get('/secrets/project/:projectId')
	@ProjectScope('externalSecret:list')
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
