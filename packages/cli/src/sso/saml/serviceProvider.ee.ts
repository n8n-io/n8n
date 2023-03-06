/* eslint-disable @typescript-eslint/naming-convention */
import { getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';
import type { ServiceProviderInstance } from 'samlify';
import { ServiceProvider } from 'samlify';
import { SamlUrls } from './constants';

let serviceProviderInstance: ServiceProviderInstance | undefined;

// TODO:SAML: make these configurable for the end user
export function getServiceProviderInstance(): ServiceProviderInstance {
	if (serviceProviderInstance === undefined) {
		serviceProviderInstance = ServiceProvider({
			entityID: getInstanceBaseUrl() + SamlUrls.restMetadata,
			authnRequestsSigned: false,
			wantAssertionsSigned: true,
			wantMessageSigned: true,
			nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
			assertionConsumerService: [
				{
					isDefault: true,
					Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
					Location: getInstanceBaseUrl() + SamlUrls.restAcs,
				},
				{
					isDefault: false,
					Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-REDIRECT',
					Location: getInstanceBaseUrl() + SamlUrls.restAcs,
				},
			],
		});
	}

	return serviceProviderInstance;
}
