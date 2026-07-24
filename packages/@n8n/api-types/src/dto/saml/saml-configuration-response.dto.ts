import type { UpdateSamlConfigurationDto } from './saml-preferences.dto';

/**
 * Public API response shape for the SAML SSO configuration group.
 * Derived from the PUT body plus read-only service-provider fields so a GET
 * response can be sent back as a PUT body without drifting out of sync.
 */
export type SamlConfigurationResponse = UpdateSamlConfigurationDto & {
	entityID: string;
	returnUrl: string;
};
