import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { SAML_PREFERENCES_DB_KEY } from '@/modules/sso-saml/constants';

import { InstanceBootstrappingError } from '../../instance-bootstrapping.error';

const samlEnvSchema = z
	.object({
		samlMetadata: z.string(),
		samlMetadataUrl: z.string(),
		samlLoginEnabled: z.boolean(),
	})
	.refine((data) => data.samlMetadata || data.samlMetadataUrl, {
		message:
			'At least one of N8N_SSO_SAML_METADATA or N8N_SSO_SAML_METADATA_URL is required when configuring SAML via environment variables',
	})
	.transform(({ samlMetadata, samlMetadataUrl, samlLoginEnabled }) => ({
		...(samlMetadata ? { metadata: samlMetadata } : {}),
		...(samlMetadataUrl ? { metadataUrl: samlMetadataUrl } : {}),
		loginEnabled: samlLoginEnabled,
	}));

@Service()
export class SamlInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private readonly settingsRepository: SettingsRepository,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async apply(): Promise<void> {
		if (!this.config.samlLoginEnabled) {
			await this.writeLoginDisabled();
			return;
		}

		this.logger.info('SAML login is enabled — applying SAML SSO env vars');
		const parsed = samlEnvSchema.safeParse(this.config);
		if (!parsed.success) {
			throw new InstanceBootstrappingError(parsed.error.issues[0].message);
		}
		await this.writePreferences(parsed.data);
	}

	private async writePreferences(preferences: Record<string, unknown>): Promise<void> {
		await this.settingsRepository.save({
			key: SAML_PREFERENCES_DB_KEY,
			value: JSON.stringify(preferences),
			loadOnStartup: true,
		});
	}

	private async writeLoginDisabled(): Promise<void> {
		await this.settingsRepository.save({
			key: SAML_PREFERENCES_DB_KEY,
			value: JSON.stringify({ loginEnabled: false }),
			loadOnStartup: true,
		});
	}
}
