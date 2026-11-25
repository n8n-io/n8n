import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * If you change this limit, keep in mind that it must match the database column size.
 */
export const KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH = 128;

/**
 * If you change this limit, keep in mind that the agent reads the description
 * on every run to pick a collection, and it must match the database column size.
 */
export const KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH = 512;

export class CreateKnowledgeCollectionDto extends Z.class({
	name: z.string().trim().min(1).max(KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH),
	description: z.string().trim().min(1).max(KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH),
}) {}
