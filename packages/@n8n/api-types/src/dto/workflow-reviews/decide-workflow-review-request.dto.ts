import { reviewTextSchema } from './workflow-review-activity.dto';
import { workflowReviewRequestDecisionSchema } from '../../workflow-review-request-summary';
import { Z } from '../../zod-class';

export class DecideWorkflowReviewRequestDto extends Z.class({
	decision: workflowReviewRequestDecisionSchema.exclude(['pending']),
	/**
	 * Required for `changes_requested`, optional for `approved`. The requirement is enforced
	 * service-side: `Z.class` wraps a plain `z.object` with no `superRefine` hook.
	 */
	note: reviewTextSchema.optional(),
}) {}
