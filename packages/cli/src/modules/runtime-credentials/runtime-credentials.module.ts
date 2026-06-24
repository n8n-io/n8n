import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { RuntimeCredentialProxyService } from '@/services/runtime-credential-proxy.service';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS === 'true';
}

@BackendModule({ name: 'runtime-credentials' })
export class RuntimeCredentialsModule implements ModuleInterface {
	async init() {
		if (!isFeatureFlagEnabled()) return;

		const { RuntimeCredentialsService } = await import('./runtime-credentials.service');
		Container.get(RuntimeCredentialsService).init();

		await import('./runtime-credentials-context-hook');
		await import('./runtime-credentials.config');
		const { RuntimeCredentialsAccessService } = await import(
			'./runtime-credentials-access.service'
		);
		Container.get(RuntimeCredentialProxyService).registerProvider(
			Container.get(RuntimeCredentialsAccessService),
		);
	}
}
