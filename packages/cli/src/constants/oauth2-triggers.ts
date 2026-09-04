/**
 * Chat-trigger OAuth2 is opt-in. When the
 * flag is off, `n8nUserAuth` chat triggers keep their existing auth and must not be
 * exposed as OAuth protected resources, so the resolvers short-circuit.
 */
export function isChatOAuth2Enabled(): boolean {
	return process.env.N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2 === 'true';
}
