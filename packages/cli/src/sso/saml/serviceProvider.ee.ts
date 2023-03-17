/* eslint-disable @typescript-eslint/naming-convention */
import { getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';
import type { ServiceProviderInstance } from 'samlify';
import { ServiceProvider } from 'samlify';
import { SamlUrls } from './constants';
import type { SamlPreferences } from './types/samlPreferences';

let serviceProviderInstance: ServiceProviderInstance | undefined;

// TODO:SAML: make these configurable for the end user
export function getServiceProviderInstance(prefs: SamlPreferences): ServiceProviderInstance {
	if (serviceProviderInstance === undefined) {
		serviceProviderInstance = ServiceProvider({
			entityID: getInstanceBaseUrl() + SamlUrls.restMetadata,
			authnRequestsSigned: prefs.authnRequestsSigned,
			wantAssertionsSigned: prefs.wantAssertionsSigned,
			wantMessageSigned: prefs.wantMessageSigned,
			signatureConfig: prefs.signatureConfig,
			nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
			assertionConsumerService: [
				{
					isDefault: prefs.acsBinding === 'post',
					Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
					Location: getInstanceBaseUrl() + SamlUrls.restAcs,
				},
				{
					isDefault: prefs.acsBinding === 'redirect',
					Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-REDIRECT',
					Location: getInstanceBaseUrl() + SamlUrls.restAcs,
				},
			],
		});
	}

	return serviceProviderInstance;
}
