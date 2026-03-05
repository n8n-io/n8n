import type { SecretCompletionsResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Middleware, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { ExternalSecretsConfig } from './external-secrets.config';
import { SecretsProviderAccessCheckService } from './secret-provider-access-check.service.ee';
import { SecretsProvidersConnectionsService } from './secrets-providers-connections.service.ee';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { sendErrorResponse } from '@/response-helper';

@RestController('/secret-providers/completions')
export class SecretProvidersCompletionsController {
	constructor(
		private readonly config: ExternalSecretsConfig,
		private readonly logger: Logger,
		private readonly connectionsService: SecretsProvidersConnectionsService,
		private readonly accessCheckService: SecretsProviderAccessCheckService,
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

	/**
	 * Global secrets are needed by anyone who can use secrets in any context,
	 * so access is granted if the user has `externalSecret:list` either globally
	 * or in at least one project (e.g. via a custom project role).
	 * There's no specific project for global secrets,
	 * so we can't use the @ProjectScope decorator here.
	 */
	@Get('/secrets/global')
	async listGlobalSecrets(
		req: AuthenticatedRequest,
		res: Response,
	): Promise<SecretCompletionsResponse | undefined> {
		const hasAccess = await this.accessCheckService.userHasGlobalScopeOrAnyProjectScope(
			req.user,
			'externalSecret:list',
		);

		if (!hasAccess) {
			sendErrorResponse(res, new ForbiddenError(RESPONSE_ERROR_MESSAGES.MISSING_SCOPE));
			return;
		}

		this.logger.debug('Listing global secrets');
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
