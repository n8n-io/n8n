import { z } from 'zod';

import { WORKFLOW_AUTHORING_CHECK_SEVERITIES } from '../../schemas/workflow-authoring-checks.schema';
import { Z } from '../../zod-class';

export class UpdateWorkflowCheckConfigDto extends Z.class({
	enabled: z.boolean().optional(),
	severityOverride: z.enum(WORKFLOW_AUTHORING_CHECK_SEVERITIES).nullable().optional(),
}) {}
