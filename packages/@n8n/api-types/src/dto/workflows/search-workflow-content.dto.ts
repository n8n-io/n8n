import { z } from 'zod';

import { Z } from '../../zod-class';

export class SearchWorkflowContentDto extends Z.class({
	query: z.string().trim().min(3).max(200),
	limit: z.coerce.number().int().positive().max(100).default(50),
	projectId: z.string().optional(),
}) {}
