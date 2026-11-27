import type { SamlPreferences } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { ServiceProviderInstance } from 'samlify';

import { UrlService } from '@n8n/backend-services';

import { SamlAssertionIdCache } from './saml-assertion-id-cache';

let serviceProviderInstance: ServiceProviderInstance | undefined;

// The Entity ID is only a name that admins copy into the identity provider,
// so it keeps the default path even when the REST path is configured.
export function getServiceProviderEntityId(): string {
	return Container.get(UrlService).getInstanceBaseUrl() + '/rest/sso/saml/metadata';
}

export function getServiceProviderReturnUrl(): string {
	const restEndpoint = Container.get(GlobalConfig).endpoints.rest;
	return `${Container.get(UrlService).getInstanceBaseUrl()}/${restEndpoint}/sso/saml/acs`;
}

export function getServiceProviderConfigTestReturnUrl(): string {
	// TODO: what is this URL?
	return Container.get(UrlService).getInstanceBaseUrl() + '/config/test/return';
}

// TODO:SAML: make these configurable for the end user
export function getServiceProviderInstance(
	prefs: SamlPreferences,
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	samlify: typeof import('samlify'),
): ServiceProviderInstance {
	if (serviceProviderInstance === undefined) {
		serviceProviderInstance = samlify.ServiceProvider({
			entityID: getServiceProviderEntityId(),
			authnRequestsSigned: prefs.authnRequestsSigned,
			wantAssertionsSigned: prefs.wantAssertionsSigned,
			// samlify enforces this flag, and many identity providers sign only the assertion
			// by default. samlify still requires a valid signature on the response or the assertion.
			wantMessageSigned: false,
			signatureConfig: prefs.signatureConfig,
			// oxlint-disable-next-line typescript/no-deprecated -- Preserve the configured default RelayState for existing SAML setups.
			relayState: prefs.relayState,
			replayCache: Container.get(SamlAssertionIdCache),
			nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
			assertionConsumerService: [
				{
					isDefault: prefs.acsBinding === 'post',
					Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
					Location: getServiceProviderReturnUrl(),
				},
				{
					isDefault: prefs.acsBinding === 'redirect',
					Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-REDIRECT',
					Location: getServiceProviderReturnUrl(),
				},
			],
		});
	}

	return serviceProviderInstance;
}
