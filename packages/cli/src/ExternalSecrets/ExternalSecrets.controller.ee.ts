import { Authorized, Get, Post, RestController } from '@/decorators';
import { ExternalSecretsRequest } from '@/requests';
import { NotFoundError } from '@/ResponseHelper';
import { Response } from 'express';
import { Service } from 'typedi';
import { ProviderNotFoundError, ExternalSecretsService } from './ExternalSecrets.service.ee';
import { RequireGlobalScope } from '@/decorators/Scopes';

@Service()
@Authorized()
@RestController('/external-secrets')
export class ExternalSecretsController {
	constructor(private readonly secretsService: ExternalSecretsService) {}

	@Get('/providers')
	@RequireGlobalScope('externalSecretsStore:list')
	async getProviders() {
		return this.secretsService.getProviders();
	}

	@Get('/providers/:provider')
	@RequireGlobalScope('externalSecretsStore:read')
	async getProvider(req: ExternalSecretsRequest.GetProvider) {
		const providerName = req.params.provider;
		try {
			return this.secretsService.getProvider(providerName);
		} catch (e) {
			if (e instanceof ProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
	}

	@Post('/providers/:provider/test')
	@RequireGlobalScope('externalSecretsStore:read')
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
			if (e instanceof ProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
	}

	@Post('/providers/:provider')
	@RequireGlobalScope('externalSecretsStore:create')
	async setProviderSettings(req: ExternalSecretsRequest.SetProviderSettings) {
		const providerName = req.params.provider;
		try {
			await this.secretsService.saveProviderSettings(providerName, req.body, req.user.id);
		} catch (e) {
			if (e instanceof ProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
		return {};
	}

	@Post('/providers/:provider/connect')
	@RequireGlobalScope('externalSecretsStore:update')
	async setProviderConnected(req: ExternalSecretsRequest.SetProviderConnected) {
		const providerName = req.params.provider;
		try {
			await this.secretsService.saveProviderConnected(providerName, req.body.connected);
		} catch (e) {
			if (e instanceof ProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
		return {};
	}

	@Post('/providers/:provider/update')
	@RequireGlobalScope('externalSecretsStore:update')
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
			if (e instanceof ProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
	}

	@Get('/secrets')
	@RequireGlobalScope('externalSecret:list')
	getSecretNames() {
		return this.secretsService.getAllSecrets();
	}
}
