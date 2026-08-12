import { z } from 'zod';

import { Z } from '../../zod-class';

/** Kept in sync with `KNOWLEDGE_SOURCE_TYPES` in the cli knowledge module. */
export const knowledgeSourceTypeSchema = z.enum(['github', 'n8n']);

export class CreateKnowledgeSourceDto extends Z.class({
	name: z.string().min(1).max(128),
	type: knowledgeSourceTypeSchema,
	/** Required for connectors that declare `requiresCredential`. */
	credentialId: z.string().max(36).optional(),
	/** Connector-specific settings, validated by the connector itself. */
	config: z.record(z.unknown()).default({}),
}) {}
