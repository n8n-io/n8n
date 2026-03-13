import { getActiveAgent } from '../../utils/agent-runtime';
import { createSSE } from '../../utils/sse';

interface DenyRequest {
	runId: string;
	toolCallId?: string;
}

interface StreamChunk {
	type: string;
	runId?: string;
	payload?: {
		text?: string;
		toolName?: string;
		toolCallId?: string;
		args?: unknown;
		result?: unknown;
	};
}

/**
 * Deny a pending tool call and stream the resumed agent output.
 */
export default defineEventHandler(async (event) => {
	const body = await readBody<DenyRequest>(event);

	if (!body?.runId) {
		throw createError({ statusCode: 400, statusMessage: 'runId is required' });
	}

	const agent = getActiveAgent();
	if (!agent) {
		throw createError({ statusCode: 400, statusMessage: 'No active agent' });
	}

	const sse = createSSE(event);

	try {
		const result = await agent.declineToolCall(body.runId, body.toolCallId);
		if (!result?.fullStream) {
			sse.done();
			return;
		}
		const reader = result.fullStream.getReader();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = value as StreamChunk;
			if (chunk.type === 'text-delta' && chunk.payload?.text) {
				sse.send({ text: chunk.payload.text });
			} else if (chunk.type === 'tool-call' && chunk.payload?.toolName) {
				sse.send({ toolCall: { tool: chunk.payload.toolName, input: chunk.payload.args } });
			} else if (chunk.type === 'tool-call-approval' && chunk.payload?.toolName) {
				sse.send({
					approval: {
						runId: chunk.runId,
						toolCallId: chunk.payload.toolCallId,
						tool: chunk.payload.toolName,
						input: chunk.payload.args,
					},
				});
			} else if (chunk.type === 'tool-result' && chunk.payload?.toolName) {
				sse.send({
					toolResult: { tool: chunk.payload.toolName, output: chunk.payload.result },
				});
			}
		}

		sse.done();
	} catch (e) {
		sse.error(e instanceof Error ? e.message : 'Failed to deny');
	}
});
