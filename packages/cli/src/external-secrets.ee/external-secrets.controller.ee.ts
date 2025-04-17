import { Response } from 'express';

import { Get, Post, RestController, GlobalScope } from '@/decorators';
import { ExternalSecretsProviderNotFoundError } from '@/errors/external-secrets-provider-not-found.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExternalSecretsRequest } from '@/requests';

import { ExternalSecretsService } from './external-secrets.service.ee';

@RestController('/external-secrets')
export class ExternalSecretsController {
	constructor(private readonly secretsService: ExternalSecretsService) {}

	@Get('/providers')
	@GlobalScope('externalSecretsProvider:list')
	async getProviders() {
		return await this.secretsService.getProviders();
	}

	@Get('/providers/:provider')
	@GlobalScope('externalSecretsProvider:read')
	async getProvider(req: ExternalSecretsRequest.GetProvider) {
		const providerName = req.params.provider;
		try {
			return this.secretsService.getProvider(providerName);
		} catch (e) {
			if (e instanceof ExternalSecretsProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
	}

	@Post('/providers/:provider/test')
	@GlobalScope('externalSecretsProvider:read')
	async testProviderSettings(req: ExternalSecretsRequest.TestProviderSettings, res: Response) {
		const providerName = req.params.provider;
		try {
			const result = await this.secretsService.testProviderSettings(providerName, req.body);
			if (result.success) {
				res.statusCode = 200;
			} else {
				res.statusCode = 400;
			}
			return result;
		} catch (e) {
			if (e instanceof ExternalSecretsProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
	}

	@Post('/providers/:provider')
	@GlobalScope('externalSecretsProvider:create')
	async setProviderSettings(req: ExternalSecretsRequest.SetProviderSettings) {
		const providerName = req.params.provider;
		try {
			await this.secretsService.saveProviderSettings(providerName, req.body, req.user.id);
		} catch (e) {
			if (e instanceof ExternalSecretsProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
		return {};
	}

	@Post('/providers/:provider/connect')
	@GlobalScope('externalSecretsProvider:update')
	async setProviderConnected(req: ExternalSecretsRequest.SetProviderConnected) {
		const providerName = req.params.provider;
		try {
			await this.secretsService.saveProviderConnected(providerName, req.body.connected);
		} catch (e) {
			if (e instanceof ExternalSecretsProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
		return {};
	}

	@Post('/providers/:provider/update')
	@GlobalScope('externalSecretsProvider:sync')
	async updateProvider(req: ExternalSecretsRequest.UpdateProvider, res: Response) {
		const providerName = req.params.provider;
		try {
			const resp = await this.secretsService.updateProvider(providerName);
			if (resp) {
				res.statusCode = 200;
			} else {
				res.statusCode = 400;
			}
			return { updated: resp };
		} catch (e) {
			if (e instanceof ExternalSecretsProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
	}

	@Get('/secrets')
	@GlobalScope('externalSecret:list')
	getSecretNames() {
		return this.secretsService.getAllSecrets();
	}
}
