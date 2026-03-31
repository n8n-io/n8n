import { readFileSync } from 'fs';

import { OidcConfigDto } from '@n8n/api-types';
import { BootstrapConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { Cipher } from 'n8n-core';

import { OIDC_PREFERENCES_DB_KEY } from '@/modules/sso-oidc/constants';

@Service()
export class OidcBootstrapStep {
	constructor(
		private readonly config: BootstrapConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('bootstrap');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.ssoOidcConfigFile) return 'skipped';

		// Idempotency: skip if config already seeded
		const existing = await this.settingsRepository.findByKey(OIDC_PREFERENCES_DB_KEY);
		if (existing) return 'skipped';

		let raw: string;
		try {
			raw = readFileSync(this.config.ssoOidcConfigFile, 'utf8');
		} catch (error) {
			this.logger.warn('Bootstrap: failed to read OIDC config file', { error });
			return 'skipped';
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			this.logger.warn('Bootstrap: OIDC config file is not valid JSON', { error });
			return 'skipped';
		}

		const result = OidcConfigDto.safeParse(parsed);
		if (!result.success) {
			this.logger.warn('Bootstrap: OIDC config file has invalid shape', { error: result.error });
			return 'skipped';
		}

		const cfg = result.data;
		await this.settingsRepository.save({
			key: OIDC_PREFERENCES_DB_KEY,
			value: JSON.stringify({
				...cfg,
				clientSecret: this.cipher.encrypt(cfg.clientSecret),
			}),
			loadOnStartup: true,
		});

		return 'created';
	}
}
