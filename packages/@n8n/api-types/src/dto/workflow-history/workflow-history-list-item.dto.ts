import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Canonical workflow-history list item (metadata only — no nodes/connections).
 * Matches `WorkflowHistoryService.getList` / internal GET workflow-history.
 */
const workflowHistoryListItemShape = {
	versionId: z.string(),
	workflowId: z.string(),
	authors: z.string(),
	name: z.string().nullable(),
	description: z.string().nullable(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	autosaved: z.boolean(),
};

export const workflowHistoryListItemSchema = z.object(workflowHistoryListItemShape);

export class WorkflowHistoryListItemDto extends Z.class(workflowHistoryListItemShape) {}
