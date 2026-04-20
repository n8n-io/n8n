import { OIDC_PROMPT_VALUES } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse, OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import { PROVISIONING_PREFERENCES_DB_KEY } from '@/modules/provisioning.ee/constants';
import { OIDC_PREFERENCES_DB_KEY } from '@/modules/sso-oidc/constants';
import { SAML_PREFERENCES_DB_KEY } from '@/modules/sso-saml/constants';
import {
	getCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

import { provisioningSchema } from './sso-schemas';

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
			this.logger.debug('ssoManagedByEnv is disabled — skipping OIDC config');
			return 'skipped';
		}

		const { oidcLoginEnabled, samlLoginEnabled } = this.instanceSettingsLoaderConfig;

		if (oidcLoginEnabled && samlLoginEnabled) {
			throw new OperationalError(
				'N8N_SSO_OIDC_LOGIN_ENABLED and N8N_SSO_SAML_LOGIN_ENABLED cannot both be true. Only one SSO protocol can be enabled at a time.',
			);
		}

		if (oidcLoginEnabled) {
			return await this.applyStrictConfig();
		}

		const hasOidcEnvVars = !!(oidcClientId || oidcClientSecret || oidcDiscoveryEndpoint);
		if (hasOidcEnvVars) {
			return await this.applySoftConfig();
		}

		return await this.applyDisabledConfig();
	}

	private async applyStrictConfig(): Promise<'created'> {
		this.logger.info('OIDC login is enabled — applying OIDC SSO env vars');

		const oidcResult = oidcEnvSchema.safeParse(this.instanceSettingsLoaderConfig);
		if (!oidcResult.success) {
			throw new OperationalError(oidcResult.error.issues[0].message);
		}

		const provisioningResult = provisioningSchema.safeParse(this.instanceSettingsLoaderConfig);
		if (!provisioningResult.success) {
			throw new OperationalError(provisioningResult.error.issues[0].message);
		}

		const oidc = oidcResult.data;

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
				value: JSON.stringify(provisioningResult.data),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);

		await setCurrentAuthenticationMethod('oidc');
		await this.disableStaleOtherProtocol();

		this.logger.debug('OIDC configuration applied from environment variables');

		return 'created';
	}

	private async applySoftConfig(): Promise<'created'> {
		this.logger.info('OIDC login is disabled but env vars are set — validating OIDC config');

		const oidcResult = oidcEnvSchema.safeParse(this.instanceSettingsLoaderConfig);
		if (!oidcResult.success) {
			this.logger.warn(
				`OIDC env vars are set but invalid — skipping OIDC config: ${oidcResult.error.issues[0].message}`,
			);
			await this.writeLoginEnabled(false);
			await this.updateAuthMethod(false);
			return 'created';
		}

		const oidc = oidcResult.data;

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

		await this.updateAuthMethod(false);

		this.logger.debug('OIDC configuration pre-staged from environment variables (login disabled)');

		return 'created';
	}

	private async applyDisabledConfig(): Promise<'created'> {
		this.logger.debug('No OIDC env vars set — writing loginEnabled=false to DB');

		await this.writeLoginEnabled(false);
		await this.updateAuthMethod(false);

		return 'created';
	}

	private async writeLoginEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify({ loginEnabled: enabled }),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	}

	private async updateAuthMethod(loginEnabled: boolean): Promise<void> {
		if (loginEnabled) {
			await setCurrentAuthenticationMethod('oidc');
		} else if (getCurrentAuthenticationMethod() === 'oidc') {
			await setCurrentAuthenticationMethod('email');
		}
	}

	private async disableStaleOtherProtocol(): Promise<void> {
		const samlPrefs = await this.settingsRepository.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		if (samlPrefs) {
			const parsed = jsonParse<Record<string, unknown>>(samlPrefs.value);
			if (parsed.loginEnabled) {
				parsed.loginEnabled = false;
				samlPrefs.value = JSON.stringify(parsed);
				await this.settingsRepository.save(samlPrefs);
			}
		}
	}
}
