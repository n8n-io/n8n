import type { VersionedWorkflowSettings } from 'n8n-workflow';
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
	/** Version-scoped settings, such as the engine. The shape comes from the scope map in n8n-workflow. */
	settings: z.custom<VersionedWorkflowSettings>().nullable(),
});

export class WorkflowHistoryListItemDto extends Z.class(workflowHistoryListItemSchema.shape) {}
