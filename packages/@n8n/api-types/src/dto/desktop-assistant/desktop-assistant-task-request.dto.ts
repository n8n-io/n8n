import { z } from 'zod';

import { desktopAssistantContextSchema } from './desktop-assistant-context.schema';
import { Z } from '../../zod-class';

/**
 * Request body for `POST /desktop-assistant/task` — the one-shot trigger
 * fired from the desktop assistant. No `timeZone` here: one-shot tasks
 * don't need scheduling; cron/schedule timezone only matters for the
 * promote-thread path, which carries it on its own request body.
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
