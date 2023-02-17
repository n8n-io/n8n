import * as saml from 'samlify';
import { sampleSPMetadata } from './constants';

let serviceProviderInstance: saml.ServiceProviderInstance | undefined;

saml.setSchemaValidator({
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	validate: async (response: string) => {
		// TODO:SAML: implment validation
		return Promise.resolve('skipped');
	},
});

export function getServiceProviderInstance(): saml.ServiceProviderInstance {
	if (serviceProviderInstance === undefined) {
		serviceProviderInstance = saml.ServiceProvider({
			metadata: sampleSPMetadata,
		});
	}

	return serviceProviderInstance;
}
