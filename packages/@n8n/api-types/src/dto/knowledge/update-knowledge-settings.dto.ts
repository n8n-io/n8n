import { z } from 'zod';

import { Z } from '../../zod-class';

/** Only credential ids and a model name are stored — never credential data itself. */
export const knowledgeEmbeddingSettingsSchema = z.object({
	provider: z.literal('openai'),
	credentialId: z.string().min(1),
	model: z.string().min(1),
});

export const knowledgeVectorStoreSettingsSchema = z.object({
	provider: z.literal('qdrant'),
	credentialId: z.string().min(1),
	/** Defaults to the module's collection name when omitted. */
	collectionName: z.string().min(1).optional(),
});

/** An omitted field keeps its stored value; an explicit `null` clears it. */
export class UpdateKnowledgeSettingsDto extends Z.class({
	embedding: knowledgeEmbeddingSettingsSchema.nullable().optional(),
	vectorStore: knowledgeVectorStoreSettingsSchema.nullable().optional(),
}) {}
