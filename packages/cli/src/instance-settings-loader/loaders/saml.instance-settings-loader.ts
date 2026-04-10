import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import { SAML_PREFERENCES_DB_KEY } from '@/modules/sso-saml/constants';

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

	isConfiguredByEnv(): boolean {
		return this.instanceSettingsLoaderConfig.ssoManagedByEnv;
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.instanceSettingsLoaderConfig.ssoManagedByEnv) return 'skipped';

		const result = samlEnvSchema.safeParse(this.instanceSettingsLoaderConfig);

		if (!result.success) {
			throw new OperationalError(result.error.issues[0].message);
		}

		const preferences = result.data;

		// Encrypt signing private key before storing
		if (preferences.signingPrivateKey) {
			preferences.signingPrivateKey = this.cipher.encrypt(preferences.signingPrivateKey);
		}

		await this.settingsRepository.save({
			key: SAML_PREFERENCES_DB_KEY,
			value: JSON.stringify(preferences),
			loadOnStartup: true,
		});

		// Activate SAML as the authentication method when login is enabled
		if (preferences.loginEnabled) {
			await this.settingsRepository.save(
				{
					key: 'userManagement.authenticationMethod',
					value: 'saml',
					loadOnStartup: true,
				},
				{ transaction: false },
			);
		}

		this.logger.debug('SAML configuration applied from environment variables');

		return 'created';
	}
}
