import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import type { ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * The bearer plus the partner User-Agent, set on every request and every retry.
 * Set per request, not via ChatOpenAI's `defaultHeaders`, so it also wins over
 * the OpenAI SDK's own User-Agent - Headers.set() overwrites case-insensitively.
 */
export const databricksAuthHeaders = (token: string): HeadersInit => ({
	authorization: `Bearer ${token}`,
	'user-agent': DATABRICKS_PARTNER_USER_AGENT,
});

/**
 * Every request carries a secret (bearer token, or the client secret on the
 * mint path), so an http host would ship it in cleartext.
 */
export function assertHttpsHost(
	ctx: ILoadOptionsFunctions | ISupplyDataFunctions,
	host: string,
): void {
	if (!URL.canParse(host) || new URL(host).protocol !== 'https:') {
		throw new NodeOperationError(ctx.getNode(), 'Databricks host must use https');
	}
}

/** Matches the Timeout option's displayed default, and applies when it is unset. */
export const DATABRICKS_REQUEST_TIMEOUT_MS = 360000;

/** The gateway speaks the OpenAI protocol for both chat and embeddings. */
export const gatewayBaseUrl = (host: string) => `${host.replace(/\/$/, '')}/ai-gateway/openai/v1`;
