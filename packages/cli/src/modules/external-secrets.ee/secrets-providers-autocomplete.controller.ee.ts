import { Logger } from '@n8n/backend-common';
import { GlobalScope, Get, RestController, Middleware } from '@n8n/decorators';
import { Request, Response, NextFunction } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ExternalSecretsConfig } from './external-secrets.config';

@RestController('/secret-providers/autocomplete')
export class SecretProvidersAutocompleteController {
	// Returns also the secret keys for a specific project
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

	@Get('/secrets/global')
	@GlobalScope('externalSecret:list')
	async listGlobalSecrets() {
		this.logger.debug('Listing global secrets');
		//TODO implement
		return await Promise.resolve();
	}

	@Get('/secrets/project/:projectId')
	@GlobalScope('externalSecret:list')
	async listProjectSecrets() {
		this.logger.debug('Listing secrets for project');
		//TODO implement
		return await Promise.resolve();
	}
}
