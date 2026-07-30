export const FORM_TRIGGER_OAUTH2_ENV_FEATURE_FLAG = 'N8N_ENV_FEAT_FORM_TRIGGER_OAUTH2';

/**
 * Form-trigger OAuth2 is opt-in. When the flag is off, `n8nUserAuth` form triggers
 * keep their existing cookie/HMAC auth: they must not be exposed as OAuth protected
 * resources, and they establish no identity for dynamic credentials to resolve with.
 */
export function isFormOAuth2Enabled(): boolean {
	return process.env[FORM_TRIGGER_OAUTH2_ENV_FEATURE_FLAG] === 'true';
}
