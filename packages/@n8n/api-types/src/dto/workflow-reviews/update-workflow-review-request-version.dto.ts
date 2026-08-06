import { n8nIdSchema } from '../../schemas/id.schema';
import {
	requiredWorkflowVersionNameSchema,
	workflowVersionDescriptionSchema,
} from '../../schemas/workflow-version.schema';
import { Z } from '../../zod-class';

export class UpdateWorkflowReviewRequestVersionDto extends Z.class({
	workflowId: n8nIdSchema,
	workflowVersionId: n8nIdSchema,
	workflowVersionName: requiredWorkflowVersionNameSchema,
	// When present, an empty/whitespace string clears the version description
	workflowVersionDescription: workflowVersionDescriptionSchema,
}) {}
