import { Logger } from '@n8n/backend-common';
import { Get, RestController, Middleware } from '@n8n/decorators';
import { GlobalScope } from '@n8n/decorators/src';
import { Request, Response, NextFunction } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ExternalSecretsConfig } from './external-secrets.config';

@RestController('/secret-providers/types')
export class SecretProvidersController {
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

	@Get('/')
	@GlobalScope('externalSecretsProvider:list')
	async listSecretProviderTypes() {
		this.logger.debug('List provider connection types');
		//TODO implement
		return await Promise.resolve([]);
	}

	@Get('/:type')
	@GlobalScope('externalSecretsProvider:list')
	async getSecretProviderType() {
		this.logger.debug('Get provider connection type');
		//TODO implement
		return await Promise.resolve({});
	}
}
