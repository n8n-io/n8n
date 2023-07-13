import { Authorized, Get, Post, RestController } from '@/decorators';
import { ExternalSecretsRequest } from '@/requests';
import { NotFoundError } from '@/ResponseHelper';
import { ProviderNotFoundError, SecretsService } from './secrets.service.ee';

@Authorized(['global', 'owner'])
@RestController('/external-secrets')
export class ExternalSecretsController {
	constructor(private readonly secretsService: SecretsService) {}

	@Get('/providers')
	async getProviders() {
		return this.secretsService.getProviders();
	}

	@Get('/providers/:provider')
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
	async testProviderSettings(req: ExternalSecretsRequest.TestProviderSettings) {
		const providerName = req.params.provider;
		try {
			return await this.secretsService.testProviderSettings(providerName, req.body);
		} catch (e) {
			if (e instanceof ProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
	}

	@Post('/providers/:provider')
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
	async updateProvider(req: ExternalSecretsRequest.UpdateProvider) {
		const providerName = req.params.provider;
		try {
			return { updated: await this.secretsService.updateProvider(providerName) };
		} catch (e) {
			if (e instanceof ProviderNotFoundError) {
				throw new NotFoundError(`Could not find provider "${e.providerName}"`);
			}
			throw e;
		}
	}

	@Get('/secrets')
	getSecretNames() {
		return this.secretsService.getAllSecrets();
	}
}
