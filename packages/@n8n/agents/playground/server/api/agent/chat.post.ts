import { handleAgentStream } from '~/server/utils/agent-stream';
import { getActiveAgent } from '../../utils/agent-runtime';
import { createSSE } from '../../utils/sse';
import { isLlmMessage, type Message, type StreamChunk } from '@n8n/agents';

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
		if (typeof agent.stream === 'function') {
			const streamResult = await agent.stream(messages, {
				threadId: 'playground-session',
				resourceId: 'playground-user',
			});

			await handleAgentStream(sse, streamResult);
		} else {
			// FIXME: Tool calling works strange here
			const result = await agent.generate(messages, {
				threadId: 'playground-session',
				resourceId: 'playground-user',
			});
			const textResponse =
				result.messages
					.filter(isLlmMessage)[0]
					?.content.map((c) => (c.type === 'text' ? (c as { text: string }).text : ''))
					.join('\n') ?? 'No text response';
			sse.send({ text: textResponse });
			if ((result.toolCalls?.length ?? 0) > 0) {
				sse.send({ toolCalls: result.toolCalls });
			}
			if (result.usage) {
				sse.send({
					usage: {
						model: result.model,
						...result.usage,
						...(result.subAgentUsage && { subAgentUsage: result.subAgentUsage }),
						...(result.totalCost != null && { totalCost: result.totalCost }),
					},
				});
			}
		}

		sse.done();
	} catch (e) {
		sse.error(e instanceof Error ? e.message : 'Agent execution failed');
	}
});
