import type {
	SamlConfigurationPublicDto,
	SamlPreferences,
	UpdateSamlConfigurationPublicDto,
} from '@n8n/api-types';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import {
	getServiceProviderEntityId,
	getServiceProviderReturnUrl,
} from '@/modules/sso-saml/service-provider.ee';

export function toSamlConfigurationResponse(prefs: SamlPreferences): SamlConfigurationPublicDto {
	return {
		mapping: {
			email: prefs.mapping?.email ?? '',
			firstName: prefs.mapping?.firstName ?? '',
			lastName: prefs.mapping?.lastName ?? '',
			userPrincipalName: prefs.mapping?.userPrincipalName ?? '',
			emailVerified: prefs.mapping?.emailVerified ?? '',
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
		emailVerifiedRequired: prefs.emailVerifiedRequired ?? false,
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

export function toSamlPreferencesUpdate(
	data: UpdateSamlConfigurationPublicDto,
): Partial<SamlPreferences> {
	const {
		entityID: _entityID,
		returnUrl: _returnUrl,
		metadata,
		signingCertificate,
		signingPrivateKey,
		...writable
	} = data;

	return {
		...writable,
		...(metadata === CREDENTIAL_BLANKING_VALUE ? {} : { metadata }),
		...(signingCertificate === CREDENTIAL_BLANKING_VALUE ? {} : { signingCertificate }),
		...(signingPrivateKey === CREDENTIAL_BLANKING_VALUE ? {} : { signingPrivateKey }),
	};
}
