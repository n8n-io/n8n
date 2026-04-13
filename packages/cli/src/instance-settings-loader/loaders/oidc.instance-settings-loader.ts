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

const PROVISIONING_MODES = ['disabled', 'instance_role', 'instance_and_project_roles'] as const;

const ssoEnvSchema = z
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
		ssoUserRoleProvisioning: z.enum(PROVISIONING_MODES, {
			errorMap: () => ({
				message: `N8N_SSO_USER_ROLE_PROVISIONING must be one of: ${PROVISIONING_MODES.join(', ')}`,
			}),
		}),
	})
	.transform((input) => ({
		oidc: {
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
		},
		provisioning: {
			scopesProvisionInstanceRole:
				input.ssoUserRoleProvisioning === 'instance_role' ||
				input.ssoUserRoleProvisioning === 'instance_and_project_roles',
			scopesProvisionProjectRoles: input.ssoUserRoleProvisioning === 'instance_and_project_roles',
		},
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

	isConfiguredByEnv(): boolean {
		return this.instanceSettingsLoaderConfig.ssoManagedByEnv;
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

		this.logger.info('N8N_SSO_MANAGED_BY_ENV is enabled — applying OIDC SSO env vars');

		const result = ssoEnvSchema.safeParse(this.instanceSettingsLoaderConfig);

		if (!result.success) {
			throw new InstanceBootstrappingError(result.error.issues[0].message);
		}

		const { oidc, provisioning } = result.data;

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
