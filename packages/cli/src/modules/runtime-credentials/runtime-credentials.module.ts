import { isEnvFeatureEnabled } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { RuntimeCredentialProxyService } from '@n8n/backend-services';

const isEnabled = () => isEnvFeatureEnabled('N8N_ENV_FEAT_RUNTIME_CREDENTIALS');

@BackendModule({ name: 'runtime-credentials' })
export class RuntimeCredentialsModule implements ModuleInterface {
	async init() {
		if (!isEnabled()) return;

		const { RuntimeCredentialsService } = await import('./runtime-credentials.service.js');
		const service = Container.get(RuntimeCredentialsService);
		service.init();
		await service.loadStoredRules();

		await import('./runtime-credentials-context-hook.js');
		await import('./runtime-credentials.config.js');
		await import('./runtime-credentials.controller.js');
		const { RuntimeCredentialsAccessService } = await import(
			'./runtime-credentials-access.service.js'
		);
		Container.get(RuntimeCredentialProxyService).registerProvider(
			Container.get(RuntimeCredentialsAccessService),
		);
	}

	async settings() {
		if (!isEnabled()) return { enabled: false, aliases: [] };

		const { RuntimeCredentialsService } = await import('./runtime-credentials.service.js');
		return { enabled: true, aliases: Container.get(RuntimeCredentialsService).getAliases() };
	}
}
