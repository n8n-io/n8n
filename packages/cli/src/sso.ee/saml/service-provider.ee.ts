import type { SamlPreferences } from '@n8n/api-types';
import { Container } from '@n8n/di';
import type { ServiceProviderInstance } from 'samlify';

import { UrlService } from '@/services/url.service';

let serviceProviderInstance: ServiceProviderInstance | undefined;

export function getServiceProviderEntityId(): string {
	return Container.get(UrlService).getInstanceBaseUrl() + '/rest/sso/saml/metadata';
}

export function getServiceProviderReturnUrl(): string {
	return Container.get(UrlService).getInstanceBaseUrl() + '/rest/sso/saml/acs';
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
			wantMessageSigned: prefs.wantMessageSigned,
			signatureConfig: prefs.signatureConfig,
			relayState: prefs.relayState,
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
