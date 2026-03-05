import { getBuilderAgent, getLastSetCode, clearLastSetCode } from '../../utils/builder-agent';
import { getConversation, addMessage } from '../../utils/builder-memory';
import { listCredentials } from '../../utils/credentials-db';
import { createSSE } from '../../utils/sse';

interface BuildRequest {
	message: string;
	editorCode: string;
	sessionId: string;
}

interface StreamChunk {
	type: string;
	payload?: {
		text?: string;
		toolName?: string;
		toolCallId?: string;
		args?: unknown;
		result?: unknown;
	};
}

export default defineEventHandler(async (event) => {
	const body = await readBody<BuildRequest>(event);

	if (!body?.message?.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Message is required' });
	}

	const sessionId = body.sessionId || 'default';
	const history = getConversation(sessionId);

	const creds = listCredentials();
	const credNames = creds.map((c) => c.name);
	const credContext =
		credNames.length > 0
			? `Available credentials: ${credNames.join(', ')}`
			: 'No credentials configured yet. The user will need to add credentials via the Credentials panel.';

	let prompt = body.message;
	if (body.editorCode?.trim()) {
		prompt = `Here is the current agent code in the editor:\n\`\`\`typescript\n${body.editorCode}\n\`\`\`\n\n${credContext}\n\nUser request: ${body.message}`;
	} else {
		prompt = `${credContext}\n\nUser request: ${body.message}`;
	}

	addMessage(sessionId, { role: 'user', content: body.message });

	const sse = createSSE(event);

	try {
		const builder = getBuilderAgent();

		const historyContext =
			history.length > 0
				? 'Previous conversation:\n' +
					history
						.filter(Boolean)
						.map((m) => `${m.role}: ${m.content}`)
						.join('\n') +
					'\n\n'
				: '';

		const fullPrompt = historyContext + prompt;

		clearLastSetCode();

		const streamResult = await builder.streamText(fullPrompt);
		const reader = streamResult.fullStream.getReader();

		let explanationText = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = value as StreamChunk;

			if (chunk.type === 'text-delta' && chunk.payload?.text) {
				explanationText += chunk.payload.text;
				sse.send({ text: chunk.payload.text });
			} else if (chunk.type === 'tool-call' && chunk.payload?.toolName) {
				sse.send({ toolCall: { tool: chunk.payload.toolName, input: chunk.payload.args } });
			} else if (chunk.type === 'tool-result' && chunk.payload?.toolName) {
				sse.send({
					toolResult: { tool: chunk.payload.toolName, output: chunk.payload.result },
				});

				// When set_code completes, send the code to the editor
				if (chunk.payload.toolName === 'set_code') {
					const code = getLastSetCode();
					if (code) {
						sse.send({ code });
						clearLastSetCode();
					}
				}
			}
		}

		addMessage(sessionId, { role: 'assistant', content: explanationText.trim() });
		sse.done();
	} catch (e) {
		sse.error(e instanceof Error ? e.message : 'Build failed');
	}
});
