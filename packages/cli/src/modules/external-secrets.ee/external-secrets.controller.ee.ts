import { Get, Post, RestController, GlobalScope, Middleware } from '@n8n/decorators';
import { Request, Response, NextFunction } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { ExternalSecretsProviders } from './external-secrets-providers.ee';
import { ExternalSecretsService } from './external-secrets.service.ee';
import { ExternalSecretsRequest } from './types';

@RestController('/external-secrets')
export class ExternalSecretsController {
	constructor(
		private readonly secretsService: ExternalSecretsService,
		private readonly secretsProviders: ExternalSecretsProviders,
	) {}

	@Middleware()
	validateProviderName(req: Request, _: Response, next: NextFunction) {
		if ('provider' in req.params) {
			const { provider } = req.params;
			if (!this.secretsProviders.hasProvider(provider)) {
				throw new NotFoundError(`Could not find provider "${provider}"`);
			}
		}
		next();
	}

	@Get('/providers')
	@GlobalScope('externalSecretsProvider:list')
	async getProviders() {
		return await this.secretsService.getProviders();
	}

	@Get('/providers/:provider')
	@GlobalScope('externalSecretsProvider:read')
	async getProvider(req: ExternalSecretsRequest.GetProvider) {
		const providerName = req.params.provider;
		return this.secretsService.getProvider(providerName);
	}

	@Post('/providers/:provider/test')
	@GlobalScope('externalSecretsProvider:read')
	async testProviderSettings(req: ExternalSecretsRequest.TestProviderSettings, res: Response) {
		const providerName = req.params.provider;
		const result = await this.secretsService.testProviderSettings(providerName, req.body);
		if (result.success) {
			res.statusCode = 200;
		} else {
			res.statusCode = 400;
		}
		return result;
	}

	@Post('/providers/:provider')
	@GlobalScope('externalSecretsProvider:create')
	async setProviderSettings(req: ExternalSecretsRequest.SetProviderSettings) {
		const providerName = req.params.provider;
		await this.secretsService.saveProviderSettings(providerName, req.body, req.user.id);
		return {};
	}

	@Post('/providers/:provider/connect')
	@GlobalScope('externalSecretsProvider:update')
	async setProviderConnected(req: ExternalSecretsRequest.SetProviderConnected) {
		const providerName = req.params.provider;
		await this.secretsService.saveProviderConnected(providerName, req.body.connected);
		return {};
	}

	@Post('/providers/:provider/update')
	@GlobalScope('externalSecretsProvider:sync')
	async updateProvider(req: ExternalSecretsRequest.UpdateProvider, res: Response) {
		const providerName = req.params.provider;
		const resp = await this.secretsService.updateProvider(providerName);
		if (resp) {
			res.statusCode = 200;
		} else {
			res.statusCode = 400;
		}
		return { updated: resp };
	}

	@Get('/secrets')
	@GlobalScope('externalSecret:list')
	getSecretNames() {
		return this.secretsService.getAllSecrets();
	}
}
