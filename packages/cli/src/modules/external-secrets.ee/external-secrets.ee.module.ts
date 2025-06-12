import type { BaseN8nModule } from '@n8n/decorators';
import { N8nModule } from '@n8n/decorators';
import { ExternalSecretsProxy } from 'n8n-core';

import { ExternalSecretsManager } from './external-secrets-manager.ee';
import './external-secrets.controller.ee';

@N8nModule()
export class ExternalSecretsModule implements BaseN8nModule {
	constructor(
		private readonly manager: ExternalSecretsManager,
		private readonly externalSecretsProxy: ExternalSecretsProxy,
	) {}

	async initialize() {
		const { externalSecretsProxy, manager } = this;
		await manager.init();
		externalSecretsProxy.setManager(manager);
	}
}
