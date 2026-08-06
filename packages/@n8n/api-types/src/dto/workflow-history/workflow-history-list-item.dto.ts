import { z } from 'zod';

import { Z } from '../../zod-class';

export const workflowHistoryListItemSchema = z.object({
	versionId: z.string(),
	workflowId: z.string(),
	authors: z.string(),
	name: z.string().nullable(),
	description: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	autosaved: z.boolean(),
});

export class WorkflowHistoryListItemDto extends Z.class(workflowHistoryListItemSchema.shape) {}
