import { getActiveAgent } from '../../utils/agent-runtime';
import { createSSE } from '../../utils/sse';
import type { Message, StreamChunk } from '@n8n/agents';

interface HistoryMessage {
	role: 'user' | 'assistant';
	content: string;
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
}

interface ChatRequest {
	message: string;
	files?: Array<{ name: string; type: string; data: string }>;
	history?: HistoryMessage[];
}

/**
 * Convert UI chat history into Message[] for the LLM.
 * Includes tool call/result information so the LLM has full context.
 */
function historyToMessages(history: HistoryMessage[]): Message[] {
	const messages: Message[] = [];

	for (const msg of history) {
		if (msg.role === 'user') {
			messages.push({
				role: 'user',
				content: [{ type: 'text', text: msg.content }],
			});
		} else if (msg.role === 'assistant') {
			// Build assistant content: text + tool call summaries
			let text = msg.content;
			if (msg.toolCalls?.length) {
				const toolSummary = msg.toolCalls
					.map((tc) => {
						const inputStr = typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input);
						const outputStr = typeof tc.output === 'string' ? tc.output : JSON.stringify(tc.output);
						return `[Tool: ${tc.tool}]\nInput: ${inputStr}\nOutput: ${outputStr}`;
					})
					.join('\n\n');
				text = text ? `${text}\n\n${toolSummary}` : toolSummary;
			}
			if (text) {
				messages.push({
					role: 'assistant',
					content: [{ type: 'text', text }],
				});
			}
		}
	}

	return messages;
}

export default defineEventHandler(async (event) => {
	const agent = getActiveAgent();

	if (!agent) {
		throw createError({
			statusCode: 400,
			statusMessage: 'No agent is currently active. Write agent code in the editor.',
		});
	}

	const body = await readBody<ChatRequest>(event);

	if (!body?.message?.trim() && (!body?.files || body.files.length === 0)) {
		throw createError({ statusCode: 400, statusMessage: 'Message or files required' });
	}

	// Build full message list: history + current message
	const messages: Message[] = body.history?.length ? historyToMessages(body.history) : [];

	// Add current user message
	messages.push({
		role: 'user',
		content: [{ type: 'text', text: body.message ?? '' }],
	});

	if (body.files && body.files.length > 0) {
		const fileDescriptions = body.files
			.map((f: { name: string; type: string }) => `[Attached file: ${f.name} (${f.type})]`)
			.join('\n');
		messages.push({ role: 'user', content: [{ type: 'text', text: fileDescriptions }] });
		for (const file of body.files) {
			messages.push({
				role: 'user',
				content: [{ type: 'file', data: file.data, mediaType: file.type }],
			});
		}
	}

	const sse = createSSE(event);

	try {
		if (typeof agent.streamText === 'function') {
			const streamResult = await agent.streamText(messages, {
				threadId: 'playground-session',
				resourceId: 'playground-user',
			});

			const reader = streamResult.fullStream.getReader();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = value as StreamChunk;

				// Debug: log all chunk types to server console
				if (chunk.type !== 'text-delta') {
					console.log('[stream chunk]', chunk.type, JSON.stringify(chunk).slice(0, 200));
				}

				if (chunk.type === 'text-delta' && 'delta' in chunk && chunk.delta) {
					sse.send({ text: chunk.delta });
				} else if (chunk.type === 'reasoning-delta' && 'delta' in chunk && chunk.delta) {
					sse.send({ text: chunk.delta });
				} else if (chunk.type === 'content' && 'content' in chunk) {
					const c = chunk.content;
					if (c.type === 'tool-call') {
						sse.send({ toolCall: { tool: c.toolName, input: c.input } });
					} else if (c.type === 'tool-result') {
						sse.send({ toolResult: { tool: c.toolName, output: c.result } });
					} else if (c.type === 'text') {
						sse.send({ text: c.text });
					} else if (c.type === 'file') {
						const raw = c.data;
						const data =
							typeof raw === 'string'
								? raw
								: Buffer.from(raw instanceof ArrayBuffer ? new Uint8Array(raw) : raw).toString(
										'base64',
									);
						sse.send({
							file: {
								data,
								mediaType: c.mediaType ?? 'application/octet-stream',
							},
						});
					} else {
						sse.send({ text: 'Received unknown content type: ' + c.type });
					}
				} else if (chunk.type === 'tool-call-approval' && 'tool' in chunk) {
					sse.send({
						approval: {
							toolCallId: chunk.toolCallId,
							tool: chunk.tool,
							input: chunk.input,
						},
					});
				} else if (chunk.type === 'error' && 'error' in chunk) {
					const err = chunk.error;
					sse.send({
						text: err instanceof Error ? err.message : String(err ?? 'Unknown error'),
					});
				}
			}
		} else {
			const run = agent.run(messages, {
				threadId: 'playground-session',
				resourceId: 'playground-user',
			});
			const result = await run.result;
			const textResponse = result.messages[0].content
				.map((c) => (c.type === 'text' ? (c as { text: string }).text : ''))
				.join('\n');
			sse.send({ text: textResponse });
			if ((result.toolCalls?.length ?? 0) > 0) {
				sse.send({ toolCalls: result.toolCalls });
			}
		}

		sse.done();
	} catch (e) {
		sse.error(e instanceof Error ? e.message : 'Agent execution failed');
	}
});
