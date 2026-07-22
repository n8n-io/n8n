import { z } from 'zod';

import { workflowReviewRequestStateSchema } from '../../workflow-review-request-summary';
import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export class ListWorkflowReviewRequestsQueryDto extends Z.class({
	...paginationSchema,
	// Required until cross-workflow listing gets project-based access filtering (LIGO-597)
	workflowId: z.string().min(1),
	state: workflowReviewRequestStateSchema.optional(),
}) {}
