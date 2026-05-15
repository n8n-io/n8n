import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_INBOUND_SECRETS === 'true';
}

@BackendModule({ name: 'inbound-secrets' })
export class InboundSecretsModule implements ModuleInterface {
	async init() {
		if (!isFeatureFlagEnabled()) return;

		await import('./inbound-secrets.config');
	}
}
