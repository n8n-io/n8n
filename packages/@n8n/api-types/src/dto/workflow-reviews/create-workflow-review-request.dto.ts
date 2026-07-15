import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateWorkflowReviewRequestDto extends Z.class({
	title: z.string().trim().min(1).max(512),
	description: z.string().max(10_000).optional(),
	// v1 accepts exactly one workflow; the array shape is kept for forward
	// compatibility with review bundles spanning multiple workflows.
	workflows: z
		.array(
			z.object({
				workflowId: z.string().min(1).max(36),
				// Required despite the column being nullable — null only exists so
				// pruning can SET NULL on a pinned version, never at creation time.
				workflowVersionId: z.string().min(1).max(36),
			}),
		)
		.length(1),
}) {}
