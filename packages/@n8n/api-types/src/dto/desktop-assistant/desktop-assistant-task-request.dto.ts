import { z } from 'zod';

import { instanceAiAttachmentSchema } from '../../schemas/instance-ai.schema';
import { Z } from '../../zod-class';

/**
 * What the user is "looking at" when the task is triggered, detected locally
 * by the desktop app. `kind` drives UI affordances; the structured pointer
 * fields (`url`, `path`) let the orchestrator target the real resource, while
 * `attachments` carries perceptual context (e.g. a screenshot).
 */
const desktopAssistantContextSchema = z.object({
	kind: z.enum(['browser', 'finder', 'pdf', 'calendar', 'email', 'other']).optional(),
	app: z.string().max(255).optional(),
	windowTitle: z.string().max(500).optional(),
	url: z.string().max(2048).optional(),
	path: z.string().max(1024).optional(),
	selectedText: z.string().max(8000).optional(),
	appHint: z.string().max(255).optional(),
	attachments: z.array(instanceAiAttachmentSchema).max(10).optional(),
});

/**
 * Request body for `POST /desktop-assistant/task` — the one-shot trigger
 * fired from the desktop assistant. No `timeZone` here: one-shot tasks
 * don't need scheduling; cron/schedule timezone only matters for the
 * promote-thread path, where it is read from the user's profile.
 */
export class DesktopAssistantTaskRequestDto extends Z.class({
	prompt: z.string().trim().min(1).max(8000),
	context: desktopAssistantContextSchema.optional(),
}) {}

export type DesktopAssistantTaskRequest = z.infer<typeof DesktopAssistantTaskRequestDto.schema>;

export interface DesktopAssistantTaskResponse {
	threadId: string;
	runId: string;
}
