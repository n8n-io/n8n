import { z } from 'zod';

import { Z } from '../../zod-class';

export class GetWorkflowReviewEligibleReviewersQueryDto extends Z.class({
	workflowId: z.string().min(1).max(36),
}) {}
