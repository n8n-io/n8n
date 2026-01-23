import { Logger } from '@n8n/backend-common';
import { Get, ProjectScope, RestController, Middleware } from '@n8n/decorators';
import {} from '@n8n/decorators/src';
import { Request, Response, NextFunction } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ExternalSecretsConfig } from './external-secrets.config';

@RestController('/secret-providers/projects')
export class SecretProvidersProjectController {
	constructor(
		private readonly config: ExternalSecretsConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	@Middleware()
	checkFeatureFlag(_req: Request, _res: Response, next: NextFunction) {
		if (!this.config.externalSecretsForProjects) {
			throw new BadRequestError('External secrets for projects feature is not enabled');
		}
		next();
	}

	@Get('/:projectId/connections')
	@ProjectScope('externalSecretsProvider:list')
	async listConnectionsForAProject() {
		this.logger.debug('List all connections within a project');
		//TODO implement
		return await Promise.resolve([]);
	}
}
