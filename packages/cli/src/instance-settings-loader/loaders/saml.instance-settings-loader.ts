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

const samlLoginBindingSchema = z.enum(['redirect', 'post'], {
	errorMap: () => ({
		message: 'N8N_SSO_SAML_LOGIN_BINDING must be one of: redirect, post',
	}),
});

const samlEnvSchema = z
	.object({
		samlMetadata: z.string(),
		samlMetadataUrl: z.string(),
		samlLoginEnabled: z.boolean(),
		samlLoginLabel: z.string(),
		samlLoginBinding: samlLoginBindingSchema,
		samlAcsBinding: z.enum(['redirect', 'post'], {
			errorMap: () => ({
				message: 'N8N_SSO_SAML_ACS_BINDING must be one of: redirect, post',
			}),
		}),
		samlIgnoreSsl: z.boolean(),
		samlAuthnRequestsSigned: z.boolean(),
		samlWantAssertionsSigned: z.boolean(),
		samlWantMessageSigned: z.boolean(),
		samlSigningPrivateKey: z.string(),
		samlSigningCertificate: z.string(),
		samlRelayState: z.string(),
		samlMappingEmail: z.string(),
		samlMappingFirstName: z.string(),
		samlMappingLastName: z.string(),
		samlMappingUserPrincipalName: z.string(),
		samlMappingInstanceRole: z.string(),
		samlMappingProjectRoles: z.string(),
	})
	.refine((data) => data.samlMetadata || data.samlMetadataUrl, {
		message:
			'At least one of N8N_SSO_SAML_METADATA or N8N_SSO_SAML_METADATA_URL is required when configuring SAML via environment variables',
	})
	.transform(
		({
			samlMetadata,
			samlMetadataUrl,
			samlLoginEnabled,
			samlLoginLabel,
			samlLoginBinding,
			samlAcsBinding,
			samlIgnoreSsl,
			samlAuthnRequestsSigned,
			samlWantAssertionsSigned,
			samlWantMessageSigned,
			samlSigningPrivateKey,
			samlSigningCertificate,
			samlRelayState,
			samlMappingEmail,
			samlMappingFirstName,
			samlMappingLastName,
			samlMappingUserPrincipalName,
			samlMappingInstanceRole,
			samlMappingProjectRoles,
		}) => {
			const mapping = buildMapping({
				samlMappingEmail,
				samlMappingFirstName,
				samlMappingLastName,
				samlMappingUserPrincipalName,
				samlMappingInstanceRole,
				samlMappingProjectRoles,
			});

			return {
				...(samlMetadata ? { metadata: samlMetadata } : {}),
				...(samlMetadataUrl ? { metadataUrl: samlMetadataUrl } : {}),
				loginEnabled: samlLoginEnabled,
				...(samlLoginLabel ? { loginLabel: samlLoginLabel } : {}),
				loginBinding: samlLoginBinding,
				acsBinding: samlAcsBinding,
				ignoreSSL: samlIgnoreSsl,
				authnRequestsSigned: samlAuthnRequestsSigned,
				wantAssertionsSigned: samlWantAssertionsSigned,
				wantMessageSigned: samlWantMessageSigned,
				...(samlSigningPrivateKey ? { signingPrivateKey: samlSigningPrivateKey } : {}),
				...(samlSigningCertificate ? { signingCertificate: samlSigningCertificate } : {}),
				relayState: samlRelayState,
				...(mapping ? { mapping } : {}),
			};
		},
	);

function buildMapping(fields: {
	samlMappingEmail: string;
	samlMappingFirstName: string;
	samlMappingLastName: string;
	samlMappingUserPrincipalName: string;
	samlMappingInstanceRole: string;
	samlMappingProjectRoles: string;
}) {
	const mapping: Record<string, unknown> = {};

	if (fields.samlMappingEmail) mapping.email = fields.samlMappingEmail;
	if (fields.samlMappingFirstName) mapping.firstName = fields.samlMappingFirstName;
	if (fields.samlMappingLastName) mapping.lastName = fields.samlMappingLastName;
	if (fields.samlMappingUserPrincipalName)
		mapping.userPrincipalName = fields.samlMappingUserPrincipalName;
	if (fields.samlMappingInstanceRole) mapping.n8nInstanceRole = fields.samlMappingInstanceRole;
	if (fields.samlMappingProjectRoles) {
		mapping.n8nProjectRoles = fields.samlMappingProjectRoles
			.split(',')
			.map((v) => v.trim())
			.filter(Boolean);
	}

	return Object.keys(mapping).length > 0 ? mapping : undefined;
}

@Service()
export class SamlInstanceSettingsLoader {
	constructor(
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		const { ssoManagedByEnv, samlMetadata, samlMetadataUrl } = this.instanceSettingsLoaderConfig;

		if (!ssoManagedByEnv) {
			if (samlMetadata || samlMetadataUrl) {
				this.logger.warn(
					'N8N_SSO_SAML_* env vars are set but N8N_SSO_MANAGED_BY_ENV is not enabled — ignoring SSO env vars',
				);
			}
			return 'skipped';
		}

		const { samlLoginEnabled, oidcLoginEnabled } = this.instanceSettingsLoaderConfig;

		if (samlLoginEnabled && oidcLoginEnabled) {
			throw new OperationalError(
				'N8N_SSO_SAML_LOGIN_ENABLED and N8N_SSO_OIDC_LOGIN_ENABLED cannot both be true. Only one SSO protocol can be enabled at a time.',
			);
		}

		const hasSamlEnvVars = !!(samlMetadata || samlMetadataUrl);

		if (samlLoginEnabled) {
			return await this.applyStrictConfig();
		}

		if (hasSamlEnvVars) {
			return await this.applySoftConfig();
		}

		return await this.applyDisabledConfig();
	}

	private async applyStrictConfig(): Promise<'created'> {
		this.logger.info('SAML login is enabled — applying SAML SSO env vars');

		const samlResult = samlEnvSchema.safeParse(this.instanceSettingsLoaderConfig);
		if (!samlResult.success) {
			throw new OperationalError(samlResult.error.issues[0].message);
		}

		const provisioningResult = provisioningSchema.safeParse(this.instanceSettingsLoaderConfig);
		if (!provisioningResult.success) {
			throw new OperationalError(provisioningResult.error.issues[0].message);
		}

		const preferences = samlResult.data;

		if (preferences.signingPrivateKey) {
			preferences.signingPrivateKey = this.cipher.encrypt(preferences.signingPrivateKey);
		}

		await this.settingsRepository.save({
			key: SAML_PREFERENCES_DB_KEY,
			value: JSON.stringify(preferences),
			loadOnStartup: true,
		});

		await this.settingsRepository.upsert(
			{
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(provisioningResult.data),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);

		await setCurrentAuthenticationMethod('saml');
		await this.disableStaleOtherProtocol();

		this.logger.debug('SAML configuration applied from environment variables');

		return 'created';
	}

	private async applySoftConfig(): Promise<'created'> {
		this.logger.info('SAML login is disabled but env vars are set — validating SAML config');

		const samlResult = samlEnvSchema.safeParse(this.instanceSettingsLoaderConfig);
		if (!samlResult.success) {
			this.logger.warn(
				`SAML env vars are set but invalid — skipping SAML config: ${samlResult.error.issues[0].message}`,
			);
			await this.writeLoginEnabled(false);
			await this.updateAuthMethod(false);
			return 'created';
		}

		const preferences = samlResult.data;

		if (preferences.signingPrivateKey) {
			preferences.signingPrivateKey = this.cipher.encrypt(preferences.signingPrivateKey);
		}

		await this.settingsRepository.save({
			key: SAML_PREFERENCES_DB_KEY,
			value: JSON.stringify(preferences),
			loadOnStartup: true,
		});

		await this.updateAuthMethod(false);

		this.logger.debug('SAML configuration pre-staged from environment variables (login disabled)');

		return 'created';
	}

	private async applyDisabledConfig(): Promise<'created'> {
		this.logger.debug('No SAML env vars set — writing loginEnabled=false to DB');

		await this.writeLoginEnabled(false);
		await this.updateAuthMethod(false);

		return 'created';
	}

	private async writeLoginEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.save({
			key: SAML_PREFERENCES_DB_KEY,
			value: JSON.stringify({ loginEnabled: enabled }),
			loadOnStartup: true,
		});
	}

	private async updateAuthMethod(loginEnabled: boolean): Promise<void> {
		if (loginEnabled) {
			await setCurrentAuthenticationMethod('saml');
		} else if (getCurrentAuthenticationMethod() === 'saml') {
			await setCurrentAuthenticationMethod('email');
		}
	}

	private async disableStaleOtherProtocol(): Promise<void> {
		const oidcPrefs = await this.settingsRepository.findOne({
			where: { key: OIDC_PREFERENCES_DB_KEY },
		});
		if (oidcPrefs) {
			const parsed = jsonParse<Record<string, unknown>>(oidcPrefs.value);
			if (parsed.loginEnabled) {
				parsed.loginEnabled = false;
				oidcPrefs.value = JSON.stringify(parsed);
				await this.settingsRepository.save(oidcPrefs);
			}
		}
	}
}
