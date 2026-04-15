import { OIDC_PROMPT_VALUES } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { z } from 'zod';

import { InstanceBootstrappingError } from '../instance-bootstrapping.error';

import { OIDC_PREFERENCES_DB_KEY } from '@/modules/sso-oidc/constants';
import { PROVISIONING_PREFERENCES_DB_KEY } from '@/modules/provisioning.ee/constants';

import { provisioningSchema, ssoProtocolSchema } from './sso-schemas';

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
		oidcPrompt: z.enum(OIDC_PROMPT_VALUES, {
			errorMap: () => ({
				message: `N8N_SSO_OIDC_PROMPT must be one of: ${OIDC_PROMPT_VALUES.join(', ')}`,
			}),
		}),
		oidcAcrValues: z.string(),
	})
	.transform((input) => ({
		clientId: input.oidcClientId,
		clientSecret: input.oidcClientSecret,
		discoveryEndpoint: input.oidcDiscoveryEndpoint,
		loginEnabled: input.oidcLoginEnabled,
		prompt: input.oidcPrompt,
		authenticationContextClassReference: input.oidcAcrValues
			? input.oidcAcrValues
					.split(',')
					.map((v) => v.trim())
					.filter(Boolean)
			: [],
	}));

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

	async run(): Promise<'created' | 'skipped'> {
		const { ssoManagedByEnv, oidcClientId, oidcClientSecret, oidcDiscoveryEndpoint } =
			this.instanceSettingsLoaderConfig;

		if (!ssoManagedByEnv) {
			if (oidcClientId || oidcClientSecret || oidcDiscoveryEndpoint) {
				this.logger.warn(
					'N8N_SSO_OIDC_* env vars are set but N8N_SSO_MANAGED_BY_ENV is not enabled — ignoring SSO env vars',
				);
			}
			return 'skipped';
		}

		const protocolResult = ssoProtocolSchema.safeParse(this.instanceSettingsLoaderConfig);
		if (!protocolResult.success) {
			throw new InstanceBootstrappingError(protocolResult.error.issues[0].message);
		}

		if (protocolResult.data.ssoProtocol !== 'oidc') {
			return 'skipped';
		}

		this.logger.info('N8N_SSO_MANAGED_BY_ENV is enabled — applying OIDC SSO env vars');

		const oidcResult = oidcEnvSchema.safeParse(this.instanceSettingsLoaderConfig);
		if (!oidcResult.success) {
			throw new InstanceBootstrappingError(oidcResult.error.issues[0].message);
		}

		const provisioningResult = provisioningSchema.safeParse(this.instanceSettingsLoaderConfig);
		if (!provisioningResult.success) {
			throw new InstanceBootstrappingError(provisioningResult.error.issues[0].message);
		}

		const oidc = oidcResult.data;
		const provisioning = provisioningResult.data;

		await this.settingsRepository.upsert(
			{
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify({
					...oidc,
					clientSecret: this.cipher.encrypt(oidc.clientSecret),
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);

		await this.settingsRepository.upsert(
			{
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(provisioning),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);

		this.logger.debug('OIDC configuration applied from environment variables');

		return 'created';
	}
}
