import { z } from 'zod';

import { Z } from '../../zod-class';

const aiGatewayProviderConfigEntryShape = {
	gatewayPath: z.string(),
	urlField: z.string(),
	apiKeyField: z.string(),
	// Maps a credential URL field to the gateway path it should be rewritten to.
	// Lets a single credential fan out to multiple gateway providers. When present,
	// it is authoritative over `urlField`/`gatewayPath`.
	routing: z.record(z.string()).optional(),
};

export class AiGatewayProviderConfigEntry extends Z.class(aiGatewayProviderConfigEntryShape) {}

export class AiGatewayConfigDto extends Z.class({
	nodes: z.array(z.string()),
	credentialTypes: z.array(z.string()),
	providerConfig: z.record(z.object(aiGatewayProviderConfigEntryShape)),
	supportedActions: z.record(z.record(z.array(z.string()))).optional(),
	minNodeTypeVersion: z.record(z.number()).optional(),
	hiddenNodeProperties: z.record(z.array(z.string())).optional(),
	// Keyed by credential type, like providerConfig. Only LLM providers appear here;
	// tool providers restrict operations, not models, so they have no entry.
	// Optional so an older ai-assistant-service that omits this field still parses.
	supportedModels: z.record(z.string(), z.array(z.string())).optional(),
}) {}
