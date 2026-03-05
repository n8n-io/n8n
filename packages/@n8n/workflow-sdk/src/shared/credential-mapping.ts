/**
 * Bidirectional mapping between simplified auth types and n8n credential types.
 * Used by both the compiler (simplified → SDK) and the generator (SDK → simplified).
 */

/** Map simplified auth type → n8n credential type */
export const AUTH_TYPE_TO_CREDENTIAL: Record<string, string> = {
	bearer: 'httpHeaderAuth',
	basic: 'httpBasicAuth',
	oauth2: 'oAuth2Api',
};

/** Map n8n credential type → simplified auth type */
export const CREDENTIAL_TO_AUTH_TYPE: Record<string, string> = {
	httpHeaderAuth: 'bearer',
	httpBasicAuth: 'basic',
	oAuth2Api: 'oauth2',
};
