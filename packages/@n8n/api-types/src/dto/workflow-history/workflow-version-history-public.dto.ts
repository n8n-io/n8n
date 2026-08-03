import { z } from 'zod';

import { workflowHistoryListItemSchema } from './workflow-history-list-item.dto';
import { Z } from '../../zod-class';

/**
 * Public list item — same as internal list metadata, minus internal-only fields.
 */
export const workflowVersionListItemPublicSchema = workflowHistoryListItemSchema
	.omit({ autosaved: true })
	.extend({
		createdAt: z.string().datetime().describe('When this version was created'),
		updatedAt: z.string().datetime().describe('When this version was last updated'),
	});

export class WorkflowVersionHistoryListPublicDto extends Z.class({
	data: z.array(workflowVersionListItemPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
