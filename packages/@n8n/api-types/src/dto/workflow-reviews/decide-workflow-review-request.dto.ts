import { workflowReviewRequestDecisionSchema } from '../../workflow-review-request-summary';
import { Z } from '../../zod-class';

export class DecideWorkflowReviewRequestDto extends Z.class({
	decision: workflowReviewRequestDecisionSchema.exclude(['pending']),
}) {}
