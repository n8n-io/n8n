import type { SecretProviderTypeResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Middleware, Param, RestController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { ExternalSecretsProviders } from './external-secrets-providers.ee';
import { ExternalSecretsConfig } from './external-secrets.config';

@RestController('/secret-providers/types')
export class SecretProvidersTypesController {
	constructor(
		private readonly config: ExternalSecretsConfig,
		private readonly logger: Logger,
		private readonly secretsProviders: ExternalSecretsProviders,
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

	@Get('/')
	@GlobalScope('externalSecretsProvider:list')
	listSecretProviderTypes(): SecretProviderTypeResponse[] {
		this.logger.debug('List provider connection types');
		const allProviders = this.secretsProviders.getAllProviders();
		return Object.values(allProviders).map((providerClass) => {
			const provider = new providerClass();
			return this.secretsProviders.toProviderTypeResponse(provider);
		});
	}

	@Get('/:type')
	@GlobalScope('externalSecretsProvider:list')
	getSecretProviderType(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('type') type: string,
	): SecretProviderTypeResponse {
		this.logger.debug('Get provider connection type', { type });
		if (!this.secretsProviders.hasProvider(type)) {
			throw new NotFoundError(`Provider type "${type}" not found`);
		}
		const providerClass = this.secretsProviders.getProvider(type);
		const provider = new providerClass();
		return this.secretsProviders.toProviderTypeResponse(provider);
	}
}
