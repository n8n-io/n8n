import { z } from 'zod';

import { WORKFLOW_AUTHORING_CHECK_SEVERITIES } from '../../schemas/workflow-authoring-checks.schema';
import { Z } from '../../zod-class';

export class CreateWorkflowCheckDto extends Z.class({
	name: z.string().trim().min(1).max(128),
	type: z.string().min(1),
	config: z.record(z.unknown()),
	severity: z.enum(WORKFLOW_AUTHORING_CHECK_SEVERITIES),
	enabled: z.boolean().optional(),
}) {}
