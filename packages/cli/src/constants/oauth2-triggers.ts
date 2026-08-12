/**
 * Form-trigger OAuth2 is opt-in. When the flag is off, `n8nUserAuth` form triggers
 * keep their existing cookie/HMAC auth and must not be exposed as OAuth protected
 * resources, so the resolvers short-circuit.
 */
export function isFormOAuth2Enabled(): boolean {
	return process.env.N8N_ENV_FEAT_FORM_TRIGGER_OAUTH2 === 'true';
}
