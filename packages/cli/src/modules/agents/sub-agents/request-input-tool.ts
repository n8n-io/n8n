import type { BuiltTool, StreamChunk } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { z } from 'zod';

export const REQUEST_INPUT_TOOL_NAME = 'request_input';

/**
 * Lets a saved sub-agent mark its reply as a question to the agent that
 * delegated to it. The reply text is the question. The parent sees a result
 * that needs input and answers with a new delegation in the same session.
 */
export function createRequestInputTool(): BuiltTool {
	return new Tool(REQUEST_INPUT_TOOL_NAME)
		.description(
			'Mark your reply in this turn as a question to the other agent. The tool sends nothing. ' +
				'Your reply text is the question.',
		)
		.systemInstruction(
			'In a delegated session, another agent of this project writes to you and reads your reply. ' +
				'Reply to that agent directly, as in a conversation. Keep it short. Do not report your steps. ' +
				`When you need data that you do not have, do not assume it. Call ${REQUEST_INPUT_TOOL_NAME}, ` +
				'then write the question itself as your reply. The answer arrives as the next message. ' +
				'When the request is done, reply with the outcome.',
		)
		.input(z.object({}))
		.handler(async () => ({
			status: 'marked',
			note: 'Now write the question as your reply. The other agent reads only your reply.',
		}))
		.build();
}

export function isRequestInputCall(chunk: StreamChunk): boolean {
	return chunk.type === 'tool-call' && chunk.toolName === REQUEST_INPUT_TOOL_NAME;
}
