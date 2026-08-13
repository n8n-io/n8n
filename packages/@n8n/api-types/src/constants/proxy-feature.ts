/**
 * Header names and registry shared between n8n and the ai-assistant-service
 * proxy. Mirrors the `FEATURES` tuple on the proxy side — any new feature
 * must be added in both places.
 */

export const X_N8N_FEATURE_HEADER = 'x-n8n-feature';
export const X_N8N_VERSION_HEADER = 'x-n8n-version';

export const N8N_PROXY_FEATURES = ['instance-ai', 'workflow-builder', 'agent-builder'] as const;
export type N8nProxyFeature = (typeof N8N_PROXY_FEATURES)[number];

export interface ProxyHeaderInput {
	feature: N8nProxyFeature;
	n8nVersion: string;
}

/**
 * Builds the headers required on every call to `/v1/api-proxy/*`. Every
 * caller on the n8n side must use this helper — types enforce both
 * `feature` (constrained union) and `n8nVersion` are supplied, so
 * omission becomes impossible at the call site.
 */
export function buildProxyHeaders(input: ProxyHeaderInput): Record<string, string> {
	return {
		[X_N8N_FEATURE_HEADER]: input.feature,
		[X_N8N_VERSION_HEADER]: input.n8nVersion,
	};
}
