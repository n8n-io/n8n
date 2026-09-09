// Partner User-Agent for Databricks traffic attribution (PWAF telemetry spec).
// Unversioned by agreement with Databricks.
// Set per request, not via ChatOpenAI's `defaultHeaders`, so it also wins over
// the OpenAI SDK's own User-Agent - Headers.set() overwrites case-insensitively.
export const CHAT_MODEL_USER_AGENT = 'n8n_DatabricksNode';

/** The bearer plus the partner User-Agent, set on every request and every retry. */
export const databricksAuthHeaders = (token: string): HeadersInit => ({
	authorization: `Bearer ${token}`,
	'user-agent': CHAT_MODEL_USER_AGENT,
});
