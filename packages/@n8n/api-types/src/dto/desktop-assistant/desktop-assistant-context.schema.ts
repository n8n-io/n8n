import { z } from 'zod';

import { instanceAiAttachmentSchema } from '../../schemas/instance-ai.schema';

/**
 * What the user is "looking at" when a desktop-assistant request is made,
 * detected locally by the desktop app. `kind` drives UI affordances; the
 * structured pointer fields (`url`, `path`) let the orchestrator target the real
 * resource, while `attachments` carries perceptual context (e.g. a screenshot).
 *
 * Shared by the one-shot task request and the recommendations request so both
 * speak the same "context" shape.
 */
export const desktopAssistantContextSchema = z.object({
	kind: z.enum(['browser', 'finder', 'file', 'calendar', 'email', 'other']).optional(),
	/** For `kind: 'file'` — the readable category derived from the file extension. */
	fileType: z.enum(['pdf', 'image', 'markdown', 'text']).optional(),
	app: z.string().max(255).optional(),
	windowTitle: z.string().max(500).optional(),
	url: z.string().max(2048).optional(),
	path: z.string().max(1024).optional(),
	selectedText: z.string().max(8000).optional(),
	appHint: z.string().max(255).optional(),
	attachments: z.array(instanceAiAttachmentSchema).max(10).optional(),
});

export type DesktopAssistantContext = z.infer<typeof desktopAssistantContextSchema>;
