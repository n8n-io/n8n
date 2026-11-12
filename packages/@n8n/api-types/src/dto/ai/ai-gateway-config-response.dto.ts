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

const aiGatewayPromotionSchema = z.object({
	text: z.string(),
	// Node types to show the promotion on. A Tool variant matches its base node type.
	nodes: z.array(z.string()).min(1),
	startsAt: z.string().optional(),
	endsAt: z.string().optional(),
});

export type AiGatewayPromotion = z.infer<typeof aiGatewayPromotionSchema>;

export class AiGatewayConfigDto extends Z.class({
	nodes: z.array(z.string()),
	credentialTypes: z.array(z.string()),
	providerConfig: z.record(z.object(aiGatewayProviderConfigEntryShape)),
	supportedActions: z.record(z.record(z.array(z.string()))).optional(),
	minNodeTypeVersion: z.record(z.number()).optional(),
	hiddenNodeProperties: z.record(z.array(z.string())).optional(),
	// Drop each malformed promotion on its own, so it cannot hide valid promotions
	// or make the whole config invalid.
	promotions: z
		.array(z.unknown())
		.transform((items) =>
			items.flatMap((item) => {
				const parsed = aiGatewayPromotionSchema.safeParse(item);
				return parsed.success ? [parsed.data] : [];
			}),
		)
		.optional()
		.catch(undefined),
}) {}
