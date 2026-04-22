import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { KeyManagerService } from './key-manager.service';

@Service()
export class EncryptionBootstrapService {
	constructor(
		private readonly keyManager: KeyManagerService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('encryption-key-manager');
	}

	async run(): Promise<void> {
		await this.keyManager.bootstrapLegacyKey(this.instanceSettings.encryptionKey);
		this.logger.debug('Encryption key bootstrap complete');
	}
}
