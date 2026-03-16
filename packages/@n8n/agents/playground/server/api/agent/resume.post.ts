import { getActiveAgent } from '../../utils/agent-runtime';
import { createSSE } from '../../utils/sse';

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
		const stream = await agent.resume('stream', body.data ?? {}, {
			runId: body.runId,
			toolCallId: body.toolCallId,
		});

		await handleAgentStream(sse, stream);
		sse.done();
	} catch (e) {
		sse.error(e instanceof Error ? e.message : 'Failed to resume');
	}
});
