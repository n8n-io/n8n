import { z } from 'zod';

import { Z } from '../../zod-class';

export class SearchKnowledgeDto extends Z.class({
	query: z.string().min(1),
	/** Restrict the search to these sources; omit to search all of them. */
	sourceIds: z.array(z.string()).optional(),
	topK: z.number().int().positive().optional(),
}) {}
