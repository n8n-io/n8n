import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { EncryptionKeyProxy, InstanceSettings } from 'n8n-core';

import { KeyManagerService } from './key-manager.service';
import { isKeyRotationEnabled } from './key-rotation-flag';

@Service()
export class EncryptionBootstrapService {
	constructor(
		private readonly keyManager: KeyManagerService,
		private readonly instanceSettings: InstanceSettings,
		private readonly encryptionKeyProxy: EncryptionKeyProxy,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('encryption-key-manager');
	}

	async run(): Promise<void> {
		// Seeding is deployment-wide state: only a main that is allowed to seed
		// creates it. One-off CLI commands (`canSeedDeploymentState` false) and
		// workers/webhooks skip seeding but still get the read-path provider.
		if (this.instanceSettings.instanceType === 'main' && this.canSeed) {
			try {
				await this.keyManager.bootstrapLegacyCbcKey(this.instanceSettings.encryptionKey);
				await this.keyManager.bootstrapGcmKey();
			} catch (error) {
				// While the rotation write path is off, nothing reads these keys yet,
				// so a failed seed (e.g. restricted DB credentials) must not take the
				// instance down. Once rotation is on, the keys are load-bearing.
				if (isKeyRotationEnabled()) throw error;
				this.logger.warn('Encryption key seeding failed, will retry on next startup', {
					error: ensureError(error),
				});
			}
		}
		this.encryptionKeyProxy.setProvider(this.keyManager);
		this.logger.debug('Encryption key bootstrap complete');
	}

	private get canSeed(): boolean {
		return this.instanceSettings.canSeedDeploymentState;
	}
}
