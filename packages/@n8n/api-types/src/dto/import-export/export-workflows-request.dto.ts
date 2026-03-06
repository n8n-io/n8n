import { z } from 'zod';

import { Z } from '../../zod-class';

export class ExportWorkflowsRequestDto extends Z.class({
	workflowIds: z.array(z.string().trim().min(1)).min(1),
	includeVariableValues: z.boolean().optional().default(true),
}) {}
