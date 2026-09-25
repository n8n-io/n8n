import type {
	SamlConfigurationResponse,
	SamlPreferences,
	UpdateSamlConfigurationDto,
} from '@n8n/api-types';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import {
	getServiceProviderEntityId,
	getServiceProviderReturnUrl,
} from '@/modules/sso-saml/service-provider.ee';

/**
 * Normalize preferences into the public API response shape.
 *
 * Every writable PUT field is always present so a GET response can be sent back
 * as a PUT body. Secrets are redacted with the blanking placeholder when set, or
 * `""` when unset. Read-only `entityID` / `returnUrl` are included and ignored on write.
 */
export function toSamlConfigurationResponse(prefs: SamlPreferences): SamlConfigurationResponse {
	return {
		mapping: {
			email: prefs.mapping?.email ?? '',
			firstName: prefs.mapping?.firstName ?? '',
			lastName: prefs.mapping?.lastName ?? '',
			userPrincipalName: prefs.mapping?.userPrincipalName ?? '',
			n8nInstanceRole: prefs.mapping?.n8nInstanceRole ?? '',
			n8nProjectRoles: prefs.mapping?.n8nProjectRoles ?? [],
		},
		metadata: prefs.metadata ? CREDENTIAL_BLANKING_VALUE : '',
		metadataUrl: prefs.metadataUrl ?? '',
		ignoreSSL: prefs.ignoreSSL ?? false,
		loginBinding: prefs.loginBinding ?? 'redirect',
		loginEnabled: prefs.loginEnabled ?? false,
		loginLabel: prefs.loginLabel ?? '',
		authnRequestsSigned: prefs.authnRequestsSigned ?? false,
		wantAssertionsSigned: prefs.wantAssertionsSigned ?? true,
		wantMessageSigned: prefs.wantMessageSigned ?? true,
		signingPrivateKey: prefs.signingPrivateKey ? CREDENTIAL_BLANKING_VALUE : '',
		signingCertificate: prefs.signingCertificate ? CREDENTIAL_BLANKING_VALUE : '',
		acsBinding: prefs.acsBinding ?? 'post',
		signatureConfig: prefs.signatureConfig ?? {
			prefix: 'ds',
			location: {
				reference: '/samlp:Response/saml:Issuer',
				action: 'after',
			},
		},
		relayState: prefs.relayState ?? '',
		entityID: getServiceProviderEntityId(),
		returnUrl: getServiceProviderReturnUrl(),
	};
}

/**
 * Convert a validated PUT body into preferences for `setSamlPreferences`.
 * Treats redaction placeholders as "keep existing" (omit the field). The service
 * already does this for `signingPrivateKey`; we mirror it here for metadata and
 * signingCertificate, which the service does not handle the same way.
 */
export function toSamlPreferencesUpdate(
	data: UpdateSamlConfigurationDto,
): Partial<SamlPreferences> {
	const { metadata, signingCertificate, signingPrivateKey, ...rest } = data;

	return {
		...rest,
		...(metadata === CREDENTIAL_BLANKING_VALUE ? {} : { metadata }),
		...(signingCertificate === CREDENTIAL_BLANKING_VALUE ? {} : { signingCertificate }),
		...(signingPrivateKey === CREDENTIAL_BLANKING_VALUE ? {} : { signingPrivateKey }),
	};
}
