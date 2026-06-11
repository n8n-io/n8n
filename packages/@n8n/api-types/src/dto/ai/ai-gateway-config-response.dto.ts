import { z } from 'zod';

import { Z } from '../../zod-class';

const aiGatewayProviderConfigEntryShape = {
	gatewayPath: z.string(),
	/**
	 * Credential field that holds the provider base URL. Optional: community nodes
	 * that hard-code their base URL (and never read it from the credential) omit this.
	 */
	urlField: z.string().optional(),
	apiKeyField: z.string(),
	/**
	 * Maps a provider host to the gateway path segment that proxies it, e.g.
	 * `{ 'api.browserbase.com': '/v1/gateway/browserbase' }`. Used for nodes that
	 * hard-code their base URL (so a `urlField` override cannot redirect them): the
	 * HTTP-level rewriter looks up the request's host here and rebuilds the URL against
	 * the mapped gateway path, preserving the original path and query. A single provider
	 * may span multiple hosts that route to different segments (e.g. Browserbase REST vs
	 * Stagehand), which is why this is a map rather than a flat host list.
	 */
	hosts: z.record(z.string()).optional(),
};

export class AiGatewayProviderConfigEntry extends Z.class(aiGatewayProviderConfigEntryShape) {}

// A provider must be redirectable by at least one mechanism: a credential `urlField`
// (Layer 1, for nodes that read their base URL from the credential) or `hosts`
// (Layer 2, HTTP-level rewrite). An entry with neither would be a silent no-op.
const aiGatewayProviderConfigEntry = z
	.object(aiGatewayProviderConfigEntryShape)
	.refine((entry) => Boolean(entry.urlField) || Object.keys(entry.hosts ?? {}).length > 0, {
		message: 'Provider config must define either "urlField" or "hosts".',
	});

export class AiGatewayConfigDto extends Z.class({
	nodes: z.array(z.string()),
	credentialTypes: z.array(z.string()),
	providerConfig: z.record(aiGatewayProviderConfigEntry),
	supportedActions: z.record(z.record(z.array(z.string()))).optional(),
}) {}
