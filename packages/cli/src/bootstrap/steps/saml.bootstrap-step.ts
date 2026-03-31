import { readFileSync } from 'fs';

import { SamlPreferences } from '@n8n/api-types';
import { BootstrapConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { Cipher } from 'n8n-core';

import { SAML_PREFERENCES_DB_KEY } from '@/modules/sso-saml/constants';

@Service()
export class SamlBootstrapStep {
	constructor(
		private readonly config: BootstrapConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('bootstrap');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.ssoSamlConfigFile) return 'skipped';

		// Idempotency: skip if config already seeded
		const existing = await this.settingsRepository.findByKey(SAML_PREFERENCES_DB_KEY);
		if (existing) return 'skipped';

		let raw: string;
		try {
			raw = readFileSync(this.config.ssoSamlConfigFile, 'utf8');
		} catch (error) {
			this.logger.warn('Bootstrap: failed to read SAML config file', { error });
			return 'skipped';
		}

		let prefs: SamlPreferences;
		try {
			prefs = JSON.parse(raw) as SamlPreferences;
		} catch (error) {
			this.logger.warn('Bootstrap: SAML config file is not valid JSON', { error });
			return 'skipped';
		}

		// Encrypt signing private key if provided, matching SamlService behaviour
		const toStore: SamlPreferences = prefs.signingPrivateKey
			? { ...prefs, signingPrivateKey: this.cipher.encrypt(prefs.signingPrivateKey) }
			: prefs;

		await this.settingsRepository.save({
			key: SAML_PREFERENCES_DB_KEY,
			value: JSON.stringify(toStore),
			loadOnStartup: true,
		});

		return 'created';
	}
}
