import { Service } from '@n8n/di';
import { ExternalSecretsProxy } from 'n8n-core';

import './external-secrets.controller.ee';
import { ExternalSecretsManager } from './external-secrets-manager.ee';

@Service()
export class ExternalSecretsInit {
	constructor(
		private readonly externalSecretsManager: ExternalSecretsManager,
		private readonly externalSecretsProxy: ExternalSecretsProxy,
	) {}

	async init() {
		await this.externalSecretsManager.init();
		this.externalSecretsProxy.setManager(this.externalSecretsManager);
	}
}
