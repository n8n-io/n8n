import { z } from 'zod';

import { Z } from '../../zod-class';

export const workflowHistoryListItemSchema = z.object({
	versionId: z.string(),
	workflowId: z.string(),
	authors: z.string(),
	name: z.string().nullable(),
	description: z.string().nullable(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	autosaved: z.boolean(),
});

export class WorkflowHistoryListItemDto extends Z.class(workflowHistoryListItemSchema.shape) {}
