import { z } from 'zod';

import {
	workflowVersionNameSchema,
	workflowVersionDescriptionSchema,
} from '../../schemas/workflow-version.schema';
import { Z } from '../../zod-class';

export class ActivateWorkflowDto extends Z.class({
	versionId: z.string(),
	name: workflowVersionNameSchema,
	description: workflowVersionDescriptionSchema,
	expectedChecksum: z.string().optional(),
}) {}
