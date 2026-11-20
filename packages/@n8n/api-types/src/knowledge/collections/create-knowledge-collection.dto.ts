import { z } from 'zod';

import { Z } from '../../zod-class';

export const KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH = 128;

/** The agent reads the description on every run to pick a collection. */
export const KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH = 512;

export class CreateKnowledgeCollectionDto extends Z.class({
	name: z.string().trim().min(1).max(KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH),
	description: z.string().trim().min(1).max(KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH),
	/** The home project: a team project or the personal project of the user. */
	projectId: z.string().min(1),
}) {}
