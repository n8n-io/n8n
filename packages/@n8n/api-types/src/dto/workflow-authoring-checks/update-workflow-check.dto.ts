import { z } from 'zod';

import { WORKFLOW_AUTHORING_CHECK_SEVERITIES } from '../../schemas/workflow-authoring-checks.schema';
import { Z } from '../../zod-class';

export class UpdateWorkflowCheckDto extends Z.class({
	name: z.string().trim().min(1).max(128).optional(),
	config: z.record(z.unknown()).optional(),
	severity: z.enum(WORKFLOW_AUTHORING_CHECK_SEVERITIES).optional(),
	enabled: z.boolean().optional(),
}) {}
