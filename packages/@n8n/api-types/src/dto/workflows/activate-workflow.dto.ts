import { z } from 'zod';
import { Z } from 'zod-class';

import {
	workflowVersionNameSchema,
	workflowVersionDescriptionSchema,
} from '../../schemas/workflow-version.schema';

export class ActivateWorkflowDto extends Z.class({
	versionId: z.string(),
	name: workflowVersionNameSchema,
	description: workflowVersionDescriptionSchema,
	expectedChecksum: z.string().optional(),
}) {}
