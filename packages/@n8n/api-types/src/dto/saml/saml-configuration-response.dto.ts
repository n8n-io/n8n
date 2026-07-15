import type { SamlPreferences } from './saml-preferences.dto';

/**
 * Public API response shape for the SAML SSO configuration group.
 */
export type SamlConfigurationResponse = SamlPreferences & {
	entityID: string;
	returnUrl: string;
};
