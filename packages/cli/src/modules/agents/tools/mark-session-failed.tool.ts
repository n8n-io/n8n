import { Tool } from '@n8n/agents/tool';
import { z } from 'zod';

export const MARK_SESSION_FAILED_TOOL_NAME = 'mark_session_failed';

const DESCRIPTION =
	'Mark this session as failed when you cannot complete the task. ' +
	'Call it after tool errors you cannot fix. ' +
	'Do not call it when you have fixed the tool error. ' +
	'Pass a short reason.';

export function createMarkSessionFailedTool() {
	return (
		new Tool(MARK_SESSION_FAILED_TOOL_NAME)
			.description(DESCRIPTION)
			.input(z.object({ reason: z.string().trim().min(1).max(400) }))
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async () => ({ marked: true }))
	);
}
