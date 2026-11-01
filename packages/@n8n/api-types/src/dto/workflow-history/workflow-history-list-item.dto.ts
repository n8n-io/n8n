import { WORKFLOW_ENGINE_TYPES } from 'n8n-workflow';
import type { VersionedWorkflowSettingKey, VersionedWorkflowSettings } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

const versionedSettingsShape = {
	engineType: z.enum(WORKFLOW_ENGINE_TYPES),
} satisfies { [K in VersionedWorkflowSettingKey]: z.ZodType<VersionedWorkflowSettings[K]> };

export const workflowHistoryListItemSchema = z.object({
	versionId: z.string(),
	workflowId: z.string(),
	authors: z.string(),
	name: z.string().nullable(),
	description: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	autosaved: z.boolean(),
	settings: z.object(versionedSettingsShape).partial(),
});

export class WorkflowHistoryListItemDto extends Z.class(workflowHistoryListItemSchema.shape) {}
