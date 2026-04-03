import { z } from 'zod';

import { Z } from '../../zod-class';

const aiGatewayProviderConfigEntryShape = {
	gatewayPath: z.string(),
	urlField: z.string(),
	apiKeyField: z.string(),
};

export class AiGatewayProviderConfigEntry extends Z.class(aiGatewayProviderConfigEntryShape) {}

export class AiGatewayConfigDto extends Z.class({
	nodes: z.array(z.string()),
	credentialTypes: z.array(z.string()),
	providerConfig: z.record(z.object(aiGatewayProviderConfigEntryShape)),
}) {}
