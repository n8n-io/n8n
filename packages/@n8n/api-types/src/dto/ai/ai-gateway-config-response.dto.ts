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
	 * Provider hosts (e.g. `api.browserbase.com`) whose outbound HTTP traffic should be
	 * rerouted to the gateway at the request level. Used for nodes that hard-code their
	 * base URL instead of reading it from the credential, so a `urlField` override alone
	 * cannot redirect them.
	 */
	hosts: z.array(z.string()).optional(),
};

export class AiGatewayProviderConfigEntry extends Z.class(aiGatewayProviderConfigEntryShape) {}

// A provider must be redirectable by at least one mechanism: a credential `urlField`
// (Layer 1, for nodes that read their base URL from the credential) or `hosts`
// (Layer 2, HTTP-level rewrite). An entry with neither would be a silent no-op.
const aiGatewayProviderConfigEntry = z
	.object(aiGatewayProviderConfigEntryShape)
	.refine((entry) => Boolean(entry.urlField) || (entry.hosts?.length ?? 0) > 0, {
		message: 'Provider config must define either "urlField" or "hosts".',
	});

export class AiGatewayConfigDto extends Z.class({
	nodes: z.array(z.string()),
	credentialTypes: z.array(z.string()),
	providerConfig: z.record(aiGatewayProviderConfigEntry),
	supportedActions: z.record(z.record(z.array(z.string()))).optional(),
}) {}
