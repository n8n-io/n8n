/* eslint-disable @typescript-eslint/naming-convention */
import type { ServiceProviderInstance } from 'samlify';
import { SamlUrls } from './constants';
import type { SamlPreferences } from './types/samlPreferences';
import { InstanceService } from '@/services/instance.service';
import Container from 'typedi';

let serviceProviderInstance: ServiceProviderInstance | undefined;

export function getServiceProviderEntityId(baseUrl: string): string {
	return baseUrl + SamlUrls.restMetadata;
}

export function getServiceProviderReturnUrl(baseUrl: string): string {
	return baseUrl + SamlUrls.restAcs;
}

export function getServiceProviderConfigTestReturnUrl(baseUrl: string): string {
	return baseUrl + SamlUrls.configTestReturn;
}

// TODO:SAML: make these configurable for the end user
export function getServiceProviderInstance(
	prefs: SamlPreferences,
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	samlify: typeof import('samlify'),
): ServiceProviderInstance {
	const baseUrl = Container.get(InstanceService).getInstanceBaseUrl();

	if (serviceProviderInstance === undefined) {
		serviceProviderInstance = samlify.ServiceProvider({
			entityID: getServiceProviderEntityId(baseUrl),
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
					Location: getServiceProviderReturnUrl(baseUrl),
				},
				{
					isDefault: prefs.acsBinding === 'redirect',
					Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-REDIRECT',
					Location: getServiceProviderReturnUrl(baseUrl),
				},
			],
		});
	}

	return serviceProviderInstance;
}
