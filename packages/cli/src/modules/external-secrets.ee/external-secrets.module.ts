import type { BaseN8nModule } from '@n8n/decorators';
import { N8nModule, OnPubSubEvent } from '@n8n/decorators';
import { SecretsHelper } from 'n8n-core';

import { ExternalSecretsManager } from './external-secrets-manager.ee';
import './external-secrets.controller.ee';

@N8nModule()
export class ExternalSecretsModule implements BaseN8nModule {
	constructor(
		private readonly manager: ExternalSecretsManager,
		private readonly secretsHelper: SecretsHelper,
	) {}

	async initialize() {
		const { secretsHelper, manager } = this;
		await manager.init();
		secretsHelper.setManager(manager);
	}

	@OnPubSubEvent('reload-external-secrets-providers')
	async reloadProviders() {
		await this.manager.reloadAllProviders();
	}
}
