import { Authorized, Get, Post, RestController } from '@/decorators';
import { ExternalSecretsRequest } from '@/requests';
import { NotFoundError } from '@/ResponseHelper';
import type { ExternalSecretsManager } from './SecretsManager.ee';

@Authorized(['global', 'owner'])
@RestController('/external-secrets')
export class ExternalSecretsController {
	private readonly secretsManager: ExternalSecretsManager;

	constructor({ secretsManager }: { secretsManager: ExternalSecretsManager }) {
		this.secretsManager = secretsManager;
	}

	@Get('/providers')
	async getProviders() {
		return this.secretsManager.getProvidersWithSettings().map(({ provider, settings }) => ({
			displayName: provider.displayName,
			name: provider.name,
			icon: provider.name,
			connected: !!settings.connected,
			connectedAt: !!settings.connectedAt,
		}));
	}

	@Get('/providers/:provider')
	async getProvider(req: ExternalSecretsRequest.GetProvider) {
		const providerName = req.params.provider;
		const providerAndSettings = this.secretsManager.getProviderWithSettings(providerName);
		if (!providerAndSettings) {
			throw new NotFoundError(`Could not find provider "${providerName}"`);
		}
		const { provider, settings } = providerAndSettings;
		return {
			displayName: provider.displayName,
			name: provider.name,
			icon: provider.name,
			connected: settings.connected,
			connectedAt: settings.connectedAt,
			properties: provider.properties,
			values: settings.settings,
		};
	}

	@Post('/providers/:provider')
	async setProviderSettings(req: ExternalSecretsRequest.SetProviderSettings) {
		const providerName = req.params.provider;
		await this.secretsManager.setProviderSettings(providerName, req.body);
		return {};
	}
}
