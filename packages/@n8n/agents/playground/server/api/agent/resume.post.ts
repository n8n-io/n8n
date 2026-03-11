import { getActiveAgent } from '../../utils/agent-runtime';
import { createSSE } from '../../utils/sse';
import type { StreamChunk } from '@n8n/agents';

interface ResumeRequest {
	runId: string;
	toolCallId: string;
	data: unknown;
}

export default defineEventHandler(async (event) => {
	const body = await readBody<ResumeRequest>(event);

	if (!body?.runId || !body?.toolCallId) {
		throw createError({ statusCode: 400, statusMessage: 'runId and toolCallId are required' });
	}

	const agent = getActiveAgent();
	if (!agent) {
		throw createError({ statusCode: 400, statusMessage: 'No active agent' });
	}

	const sse = createSSE(event);

	try {
		const result = await agent.resume(body.data ?? {}, {
			runId: body.runId,
			toolCallId: body.toolCallId,
		});

		if (!result?.fullStream) {
			sse.done();
			return;
		}
		const reader = result.fullStream.getReader();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = value as StreamChunk;
			if (chunk.type === 'text-delta' && 'delta' in chunk) {
				sse.send({ text: chunk.delta });
			} else if (chunk.type === 'reasoning-delta' && 'delta' in chunk) {
				sse.send({ thinking: chunk.delta });
			} else if (chunk.type === 'content' && 'content' in chunk) {
				const c = chunk.content;
				if (c.type === 'tool-call') {
					sse.send({ toolCall: { tool: c.toolName, input: c.input } });
				} else if (c.type === 'tool-result') {
					sse.send({ toolResult: { tool: c.toolName, output: c.result } });
				}
			} else if (chunk.type === 'tool-call-suspended') {
				sse.send({
					suspended: {
						runId: chunk.runId,
						toolCallId: chunk.toolCallId,
						toolName: chunk.toolName,
						input: chunk.input,
						suspendPayload: chunk.suspendPayload,
					},
				});
			}
		}

		sse.done();
	} catch (e) {
		sse.error(e instanceof Error ? e.message : 'Failed to resume');
	}
});
