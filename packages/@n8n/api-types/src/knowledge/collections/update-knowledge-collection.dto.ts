import { z } from 'zod';

import { Z } from '../../zod-class';
import {
	KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH,
	KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH,
} from './create-knowledge-collection.dto';

/** A field that is not in the body keeps its current value. */
export class UpdateKnowledgeCollectionDto extends Z.class({
	name: z.string().trim().min(1).max(KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH).optional(),
	description: z.string().trim().min(1).max(KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH).optional(),
}) {}
