import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE === 'true';
}

@BackendModule({
	name: 'token-exchange',
	licenseFlag: LICENSE_FEATURES.TOKEN_EXCHANGE,
	instanceTypes: ['main'],
})
export class TokenExchangeModule implements ModuleInterface {
	async init() {
		if (!isFeatureFlagEnabled()) {
			return;
		}

		const { TrustedKeyService } = await import('./services/trusted-key.service');
		await Container.get(TrustedKeyService).initialize();

		await import('./token-exchange.controller');
		await import('./controllers/embed-auth.controller');
	}
}
