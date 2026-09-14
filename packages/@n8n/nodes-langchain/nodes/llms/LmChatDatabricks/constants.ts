import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';

/**
 * The bearer plus the partner User-Agent, set on every request and every retry.
 * Set per request, not via ChatOpenAI's `defaultHeaders`, so it also wins over
 * the OpenAI SDK's own User-Agent - Headers.set() overwrites case-insensitively.
 */
export const databricksAuthHeaders = (token: string): HeadersInit => ({
	authorization: `Bearer ${token}`,
	'user-agent': DATABRICKS_PARTNER_USER_AGENT,
});
