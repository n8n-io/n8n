import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';

export class GetWorkflowReviewEligibleReviewersQueryDto extends Z.class({
	workflowId: n8nIdSchema,
}) {}
