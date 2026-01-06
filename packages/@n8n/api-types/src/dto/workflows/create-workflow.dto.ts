import { z } from 'zod';
import { Z } from 'zod-class';

import { baseWorkflowShape } from './base-workflow.dto';

export const workflowIdSchema = z.string();

export class CreateWorkflowDto extends Z.class({
	// Spread base fields (name, nodes, connections, settings, etc.)
	...baseWorkflowShape,

	// Create-specific fields:

	// Optional ID - if provided, must not already exist (validated in controller)
	id: workflowIdSchema.optional(),

	// Project assignment (only on creation)
	projectId: z.string().optional(),

	// SECURITY: These fields are included to accept them from the request body but are
	// always overridden in the controller to enforce security policies:
	// - active is always set to false (workflows must be activated via separate endpoint)
	// - activeVersionId is always set to null (managed by the system)
	active: z.boolean().optional().default(false),
	activeVersionId: z.string().nullable().optional(),
	activeVersion: z.unknown().optional(),

	// Shared property for backward compatibility in case UI sends it
	// but it is discarded creation
	shared: z.unknown().optional(),
}) {}
