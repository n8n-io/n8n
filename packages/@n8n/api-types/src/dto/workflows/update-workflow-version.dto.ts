import { Z } from 'zod-class';

import {
	workflowVersionNameSchema,
	workflowVersionDescriptionSchema,
} from '../../schemas/workflow-version.schema';

export class UpdateWorkflowVersionDto extends Z.class({
	name: workflowVersionNameSchema.optional(),
	description: workflowVersionDescriptionSchema.optional(),
}) {}