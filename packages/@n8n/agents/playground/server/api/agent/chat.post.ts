import { getActiveAgent } from '../../utils/agent-runtime';
import { createSSE } from '../../utils/sse';
import type { Message } from '@n8n/agents';

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

interface StreamChunk {
	type: string;
	runId?: string;
	payload?: {
		text?: string;
		toolName?: string;
		toolCallId?: string;
		args?: unknown;
		result?: unknown;
		providerMetadata?: unknown;
		providerExecuted?: unknown;
		error?: {
			message?: string;
		};
	};
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

			// Prefer fullStream (interleaved text + tool events), fall back to textStream
			const useFullStream = streamResult.fullStream !== undefined;
			const reader = useFullStream
				? streamResult.fullStream.getReader()
				: streamResult.textStream.getReader();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				if (!useFullStream) {
					sse.send({ text: value });
					continue;
				}

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
					sse.send({ toolResult: { tool: chunk.payload.toolName, output: chunk.payload.result } });
				} else if (chunk.type === 'error') {
					sse.send({ text: chunk.payload?.error?.message ?? 'Unknown error' });
				}
			}

			// Always call getResult() to finalize the stream — this triggers
			// saveToolResultsToMemory() for tools with .storeResults() enabled.
			if (streamResult.getResult) {
				try {
					const result = await streamResult.getResult();
					// If we used textStream fallback, send tool calls from the result
					if (!useFullStream && result.toolCalls.length > 0) {
						sse.send({ toolCalls: result.toolCalls });
					}
				} catch {
					// ignore — stream may have already been consumed
				}
			}
		} else {
			const run = agent.run(messages, {
				threadId: 'playground-session',
				resourceId: 'playground-user',
			});
			const result = await run.result;
			sse.send({ text: result.text });
			if (result.toolCalls.length > 0) {
				sse.send({ toolCalls: result.toolCalls });
			}
		}

		sse.done();
	} catch (e) {
		sse.error(e instanceof Error ? e.message : 'Agent execution failed');
	}
});
