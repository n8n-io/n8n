import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

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
		if (process.env.N8N_ENCRYPTION_KEY_IDENTIFICATION_ENABLED !== 'true') return;

		if (!this.instanceSettings.isLeader) return;

		try {
			await this.keyManager.getActiveKey();
			this.logger.debug('Active encryption key already present, skipping bootstrap');
			return;
		} catch (error) {
			if (!(error instanceof NotFoundError)) throw error;
		}

		const { id } = await this.keyManager.addKey(
			this.instanceSettings.encryptionKey,
			'aes-256-cbc',
			true,
		);
		this.logger.info('Seeded legacy encryption key into deployment_key table', { id });
	}
}
