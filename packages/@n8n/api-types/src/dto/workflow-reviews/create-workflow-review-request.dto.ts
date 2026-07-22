import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';

export class CreateWorkflowReviewRequestDto extends Z.class({
	title: z.string().trim().min(1).max(128),
	description: z.string().max(512).optional(),
	workflows: z
		.array(
			z.object({
				workflowId: n8nIdSchema,
				workflowVersionId: n8nIdSchema,
			}),
		)
		.length(1),
	// UI sends at most one reviewer for now; array for future multi-reviewer support (LIGO-601)
	reviewerUserIds: z.array(n8nIdSchema).max(10).optional(),
}) {}
