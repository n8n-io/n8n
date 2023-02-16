import * as saml from 'samlify';
import { sampleSPMetadata } from './constants';

let serviceProviderInstance: saml.ServiceProviderInstance | undefined;

export function getServiceProviderInstance(): saml.ServiceProviderInstance {
	if (serviceProviderInstance === undefined) {
		serviceProviderInstance = saml.ServiceProvider({
			metadata: sampleSPMetadata,
		});
	}

	return serviceProviderInstance;
}
