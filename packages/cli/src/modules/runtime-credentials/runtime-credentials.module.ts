import { isEnvFeatureEnabled } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { RuntimeCredentialProxyService } from '@/services/runtime-credential-proxy.service';

@BackendModule({ name: 'runtime-credentials' })
export class RuntimeCredentialsModule implements ModuleInterface {
	async init() {
		if (!isEnvFeatureEnabled('N8N_ENV_FEAT_RUNTIME_CREDENTIALS')) return;

		const { RuntimeCredentialsService } = await import('./runtime-credentials.service.js');
		Container.get(RuntimeCredentialsService).init();

		await import('./runtime-credentials-context-hook.js');
		await import('./runtime-credentials.config.js');
		const { RuntimeCredentialsAccessService } = await import(
			'./runtime-credentials-access.service.js'
		);
		Container.get(RuntimeCredentialProxyService).registerProvider(
			Container.get(RuntimeCredentialsAccessService),
		);
	}
}
