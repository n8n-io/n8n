import { z } from 'zod';

import { baseWorkflowShape } from './base-workflow.dto';
import { isSafeObjectKey } from '../../schemas/instance-ai.schema';
import { Z } from '../../zod-class';

// Workflow ids are used as object keys, so `__proto__`, `constructor` and `prototype` are not allowed
export const workflowIdSchema = z
	.string()
	.refine(isSafeObjectKey, { message: 'Invalid workflow id' });

export class CreateWorkflowDto extends Z.class({
	// Spread base fields (name, nodes, connections, settings, etc.)
	...baseWorkflowShape,

	// Create-specific fields:

	// Optional ID - if provided, must not already exist (validated in controller)
	id: workflowIdSchema.optional(),

	// Project assignment (only on creation)
	projectId: z.string().optional(),
}) {}
