/**
 * Form-trigger OAuth2 is opt-in. When the flag is off, `n8nUserAuth` form triggers
 * keep their existing cookie/HMAC auth and must not be exposed as OAuth protected
 * resources, so the resolvers short-circuit.
 */
export function isFormOAuth2Enabled(): boolean {
	return process.env.N8N_ENV_FEAT_FORM_TRIGGER_OAUTH2 === 'true';
}

/**
 * Webhook-trigger OAuth2 is opt-in. When the flag is off, `n8nOAuth2` webhook
 * triggers must not be exposed as OAuth protected resources, so the resolver
 * short-circuits. `classifyTriggerIdentity` callers must read it too, so an
 * already-configured node isn't treated as identity-providing once the flag is
 * turned back off.
 */
export function isWebhookOAuth2Enabled(): boolean {
	return process.env.N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS === 'true';
}
