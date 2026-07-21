import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateWorkflowReviewRequestDto extends Z.class({
	title: z.string().trim().min(1).max(128),
	description: z.string().max(512).optional(),
	workflows: z
		.array(
			z.object({
				workflowId: z.string().min(1).max(36),
				workflowVersionId: z.string().min(1).max(36),
			}),
		)
		.length(1),
}) {}
