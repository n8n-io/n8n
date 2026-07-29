import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';

export class UpdateWorkflowReviewRequestVersionDto extends Z.class({
	workflowId: n8nIdSchema,
	workflowVersionId: n8nIdSchema,
}) {}
