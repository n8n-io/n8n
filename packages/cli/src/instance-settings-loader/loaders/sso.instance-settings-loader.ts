import { OIDC_PROMPT_VALUES } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import { PROVISIONING_PREFERENCES_DB_KEY } from '@/modules/provisioning.ee/constants';
import { OIDC_PREFERENCES_DB_KEY } from '@/modules/sso-oidc/constants';
import { SAML_PREFERENCES_DB_KEY } from '@/modules/sso-saml/constants';
import {
	getCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

const PROVISIONING_MODES = ['disabled', 'instance_role', 'instance_and_project_roles'] as const;

const provisioningSchema = z
	.object({
		ssoUserRoleProvisioning: z.enum(PROVISIONING_MODES, {
			errorMap: () => ({
				message: `N8N_SSO_USER_ROLE_PROVISIONING must be one of: ${PROVISIONING_MODES.join(', ')}`,
			}),
		}),
	})
	.transform((input) => ({
		scopesProvisionInstanceRole:
			input.ssoUserRoleProvisioning === 'instance_role' ||
			input.ssoUserRoleProvisioning === 'instance_and_project_roles',
		scopesProvisionProjectRoles: input.ssoUserRoleProvisioning === 'instance_and_project_roles',
	}));

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
export class SsoInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.ssoManagedByEnv) {
			this.logger.debug('ssoManagedByEnv is disabled — skipping SSO config');
			return 'skipped';
		}

		const { samlLoginEnabled, oidcLoginEnabled } = this.config;

		if (samlLoginEnabled && oidcLoginEnabled) {
			throw new OperationalError(
				'N8N_SSO_SAML_LOGIN_ENABLED and N8N_SSO_OIDC_LOGIN_ENABLED cannot both be true. Only one SSO protocol can be enabled at a time.',
			);
		}

		if (samlLoginEnabled || oidcLoginEnabled) {
			await this.writeProvisioning();
		}

		await this.applySamlConfig();
		await this.applyOidcConfig();
		await this.syncAuthMethod();

		return 'created';
	}

	private async applySamlConfig(): Promise<void> {
		if (!this.config.samlLoginEnabled) {
			await this.writeSamlLoginDisabled();
			return;
		}

		this.logger.info('SAML login is enabled — applying SAML SSO env vars');
		const parsed = samlEnvSchema.safeParse(this.config);
		if (!parsed.success) {
			throw new OperationalError(parsed.error.issues[0].message);
		}
		await this.writeSamlPreferences(parsed.data);
	}

	private async applyOidcConfig(): Promise<void> {
		if (!this.config.oidcLoginEnabled) {
			await this.writeOidcLoginDisabled();
			return;
		}

		this.logger.info('OIDC login is enabled — applying OIDC SSO env vars');
		const parsed = oidcEnvSchema.safeParse(this.config);
		if (!parsed.success) {
			throw new OperationalError(parsed.error.issues[0].message);
		}
		await this.writeOidcPreferences(parsed.data);
	}

	private async syncAuthMethod(): Promise<void> {
		const { samlLoginEnabled, oidcLoginEnabled } = this.config;

		if (samlLoginEnabled) {
			await setCurrentAuthenticationMethod('saml');
			return;
		}

		if (oidcLoginEnabled) {
			await setCurrentAuthenticationMethod('oidc');
			return;
		}

		const current = getCurrentAuthenticationMethod();
		if (current === 'saml' || current === 'oidc') {
			await setCurrentAuthenticationMethod('email');
		}
	}

	private async writeSamlPreferences(preferences: Record<string, unknown>): Promise<void> {
		await this.settingsRepository.save({
			key: SAML_PREFERENCES_DB_KEY,
			value: JSON.stringify(preferences),
			loadOnStartup: true,
		});
	}

	private async writeSamlLoginDisabled(): Promise<void> {
		await this.settingsRepository.save({
			key: SAML_PREFERENCES_DB_KEY,
			value: JSON.stringify({ loginEnabled: false }),
			loadOnStartup: true,
		});
	}

	private async writeOidcPreferences(preferences: {
		clientSecret: string;
		[key: string]: unknown;
	}): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify({
					...preferences,
					clientSecret: await this.cipher.encryptV2(preferences.clientSecret),
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	}

	private async writeOidcLoginDisabled(): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify({ loginEnabled: false }),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	}

	private async writeProvisioning(): Promise<void> {
		const parsed = provisioningSchema.safeParse(this.config);
		if (!parsed.success) {
			throw new OperationalError(parsed.error.issues[0].message);
		}

		await this.settingsRepository.upsert(
			{
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(parsed.data),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	}
}
