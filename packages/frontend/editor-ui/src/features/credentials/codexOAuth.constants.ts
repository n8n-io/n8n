/**
 * Codex signs in against a fixed loopback redirect (`localhost:1455`), which the
 * generic `oAuth2Api` machinery cannot express: that one derives its callback
 * from the instance URL. The connect flow therefore lives in its own backend
 * module, and the UI keys off this type name.
 */
export const CODEX_OAUTH_CREDENTIAL_TYPE = 'openAiCodexOAuthApi';
