import * as saml from 'samlify';
import { sampleIPMetadata } from './constants';

let identityProviderInstance: saml.IdentityProviderInstance | undefined;

export function getIdentityProviderInstance(): saml.IdentityProviderInstance {
	if (identityProviderInstance === undefined) {
		identityProviderInstance = saml.IdentityProvider({
			metadata: sampleIPMetadata,
		});
	}

	return identityProviderInstance;
}
