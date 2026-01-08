import { z } from 'zod';
import { Z } from 'zod-class';

import {
	workflowVersionNameSchema,
	workflowVersionDescriptionSchema,
} from '../../schemas/workflow-version.schema';

export class SaveWorkflowVersionDto extends Z.class({
	name: workflowVersionNameSchema.refine((val) => val !== undefined && val !== '', {
		message: 'Version name is required',
	}),
	description: workflowVersionDescriptionSchema,
	versionId: z.string().optional(),
}) {}