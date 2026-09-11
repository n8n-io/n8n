import { z } from 'zod';

import { baseWorkflowShape } from './base-workflow.dto';
import { Z } from '../../zod-class';

/**
 * The id column is `varchar(36)`. The charset keeps the id usable as a single
 * path segment: binary data files are stored under `workflows/<id>/...` and the
 * read access check authorizes on the id it parses back out of that path.
 */
export const workflowIdSchema = z
	.string()
	.min(1)
	.max(36)
	.regex(
		/^[A-Za-z0-9_-]+$/,
		'Workflow ID must contain only letters, digits, hyphens and underscores',
	);

export class CreateWorkflowDto extends Z.class({
	// Spread base fields (name, nodes, connections, settings, etc.)
	...baseWorkflowShape,

	// Create-specific fields:

	// Optional ID - if provided, must not already exist (validated in controller)
	id: workflowIdSchema.optional(),

	// Project assignment (only on creation)
	projectId: z.string().optional(),
}) {}
