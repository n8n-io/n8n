import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import { OIDC_PREFERENCES_DB_KEY } from '@/modules/sso-oidc/constants';

const oidcEnvSchema = z
	.object({
		oidcClientId: z
			.string()
			.min(1, 'N8N_SSO_OIDC_CLIENT_ID is required when configuring OIDC via environment variables'),
		oidcClientSecret: z
			.string()
			.min(
				1,
				'N8N_SSO_OIDC_CLIENT_SECRET is required when configuring OIDC via environment variables',
			),
		oidcDiscoveryEndpoint: z.string().url('N8N_SSO_OIDC_DISCOVERY_ENDPOINT must be a valid URL'),
		oidcLoginEnabled: z.boolean(),
		oidcPrompt: z.enum(['none', 'login', 'consent', 'select_account', 'create'], {
			errorMap: () => ({
				message: 'N8N_SSO_OIDC_PROMPT must be one of: none, login, consent, select_account, create',
			}),
		}),
		oidcAcrValues: z.string(),
	})
	.transform(
		({
			oidcClientId,
			oidcClientSecret,
			oidcDiscoveryEndpoint,
			oidcLoginEnabled,
			oidcPrompt,
			oidcAcrValues,
		}) => ({
			clientId: oidcClientId,
			clientSecret: oidcClientSecret,
			discoveryEndpoint: oidcDiscoveryEndpoint,
			loginEnabled: oidcLoginEnabled,
			prompt: oidcPrompt,
			authenticationContextClassReference: oidcAcrValues
				? oidcAcrValues
						.split(',')
						.map((v) => v.trim())
						.filter(Boolean)
				: [],
		}),
	);

@Service()
export class OidcInstanceSettingsLoader {
	constructor(
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	isConfiguredByEnv(): boolean {
		return this.instanceSettingsLoaderConfig.ssoManagedByEnv;
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.instanceSettingsLoaderConfig.ssoManagedByEnv) return 'skipped';

		const result = oidcEnvSchema.safeParse(this.instanceSettingsLoaderConfig);

		if (!result.success) {
			throw new OperationalError(result.error.issues[0].message);
		}

		await this.settingsRepository.save({
			key: OIDC_PREFERENCES_DB_KEY,
			value: JSON.stringify({
				...result.data,
				clientSecret: this.cipher.encrypt(result.data.clientSecret),
			}),
			loadOnStartup: true,
		});

		this.logger.debug('OIDC configuration applied from environment variables');

		return 'created';
	}
}
