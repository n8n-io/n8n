import type { SamlConfigurationResponse, SamlPreferences } from '@n8n/api-types';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import {
	getServiceProviderEntityId,
	getServiceProviderReturnUrl,
} from '@/modules/sso-saml/service-provider.ee';

export function toSamlConfigurationResponse(prefs: SamlPreferences): SamlConfigurationResponse {
	return {
		...prefs,
		signingPrivateKey: prefs.signingPrivateKey ? CREDENTIAL_BLANKING_VALUE : undefined,
		entityID: getServiceProviderEntityId(),
		returnUrl: getServiceProviderReturnUrl(),
	};
}
