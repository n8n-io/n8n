import { z } from 'zod';

import { baseWorkflowShape } from './base-workflow.dto';
import { Z } from '../../zod-class';

export const workflowIdSchema = z.string();

export class CreateWorkflowDto extends Z.class({
	// Spread base fields (name, nodes, connections, settings, etc.)
	...baseWorkflowShape,

	// Create-specific fields:

	// Optional ID - if provided, must not already exist (validated in controller)
	id: workflowIdSchema.optional(),

	// Project assignment (only on creation)
	projectId: z.string().optional(),
}) {}
