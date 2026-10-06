import { parse, path, t, type ChatMessage, type ChatRequest, type JsonSchema } from '@n8n/node-sdk';

import { anthropic } from '../anthropic.node';

/** Anthropic needs `max_tokens`. The legacy chat model sends this default too. */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * The tool that carries a structured reply: Anthropic has no JSON mode. The name is reserved,
 * so it does not collide with a user tool.
 */
const OUTPUT_TOOL = '__n8n_output';

const blocksOf = (message: ChatMessage) => {
	switch (message.role) {
		case 'assistant':
			return [
				...(message.content ? [{ type: 'text', text: message.content }] : []),
				...(message.toolCalls ?? []).map(({ id, name, args }) => ({
					type: 'tool_use',
					id,
					name,
					input: args,
				})),
			];
		case 'tool':
			return [{ type: 'tool_result', tool_use_id: message.toolCallId, content: message.content }];
		default:
			return [{ type: 'text', text: message.content }];
	}
};

/** One message per turn: Anthropic wants user and assistant turns to alternate. */
const messagesOf = (messages: readonly ChatMessage[]) =>
	messages
		.filter((message) => message.role !== 'system')
		.map((message) => ({
			role: message.role === 'assistant' ? 'assistant' : 'user',
			content: blocksOf(message),
		}))
		.reduce<Array<{ role: string; content: Array<Record<string, unknown>> }>>((turns, message) => {
			const last = turns.at(-1);
			return last?.role === message.role
				? [
						...turns.slice(0, -1),
						{ role: last.role, content: [...last.content, ...message.content] },
					]
				: [...turns, message];
		}, [])
		// A turn of one text block is sent as plain text, as the Anthropic SDK does.
		.map(({ role, content }) => {
			const [only] = content;
			return content.length === 1 && only?.type === 'text'
				? { role, content: only.text }
				: { role, content };
		});

// Anthropic adds block types and fields over time, so the schema checks what `chat` reads.
const open: JsonSchema = { additionalProperties: true };

const messageSchema = t
	.obj({
		content: t.arr(
			t
				.obj({
					type: t.str(),
					text: t.str().optional(),
					id: t.str().optional(),
					name: t.str().optional(),
					input: t.json().optional(),
				})
				.with(open),
		),
		stop_reason: t.nullable(t.str()).optional(),
		usage: t.obj({ input_tokens: t.int(), output_tokens: t.int() }).with(open).optional(),
	})
	.with(open);

const REASONS: Readonly<Record<string, string>> = {
	end_turn: 'stop',
	stop_sequence: 'stop',
	max_tokens: 'length',
	tool_use: 'tool_calls',
};

export const anthropicChatModel = anthropic.provider('chatModel', {
	action: 'Anthropic Chat Model',
	summary: 'An Anthropic Claude chat model for an AI node, e.g. ai.prompt or ai.agent.',
	provides: 'chatModel',
	input: {
		model: t.modelId('anthropic'),
		maxTokens: t
			.int()
			.with({ minimum: 1 })
			.default(DEFAULT_MAX_TOKENS)
			.hint('Most tokens in one reply'),
		temperature: t.num().with({ minimum: 0, maximum: 1 }).optional(),
		topP: t.num().with({ minimum: 0, maximum: 1 }).optional(),
		topK: t.int().with({ minimum: 1 }).optional(),
	},
	async provide({ input, http }) {
		const { model } = input;
		return {
			model,
			async chat({ messages, tools, output }: ChatRequest) {
				const system = messages.flatMap((message) =>
					message.role === 'system' ? [message.content] : [],
				);
				const declared = [
					...(tools ?? []).map(({ name, description, input: schema }) => ({
						name,
						description,
						input_schema: schema,
					})),
					...(output
						? [{ name: OUTPUT_TOOL, description: 'Give the final reply.', input_schema: output }]
						: []),
				];
				const body = await http.request({
					method: 'POST',
					path: path`/v1/messages`,
					headers: { 'anthropic-version': '2023-06-01' },
					retry: true,
					body: {
						model,
						max_tokens: input.maxTokens,
						...(system.length ? { system: system.join('\n\n') } : {}),
						messages: messagesOf(messages),
						...(declared.length ? { tools: declared } : {}),
						...(output && !tools?.length
							? { tool_choice: { type: 'tool', name: OUTPUT_TOOL } }
							: {}),
						temperature: input.temperature,
						top_p: input.topP,
						top_k: input.topK,
					},
				});
				const { content, stop_reason: stop, usage } = parse(messageSchema, body);
				const calls = (content ?? []).flatMap(({ type, id, name, input: args }) =>
					type === 'tool_use' && id && name ? [{ id, name, args: args ?? {} }] : [],
				);
				const answer = output ? calls.find((call) => call.name === OUTPUT_TOOL) : undefined;
				const text = (content ?? []).flatMap((block) =>
					block.type === 'text' && block.text ? [block.text] : [],
				);
				// The answer ends the turn. Other calls in the same reply would need tool results first.
				return {
					text: answer ? JSON.stringify(answer.args) : text.join(''),
					toolCalls: answer ? [] : calls,
					finishReason: answer ? 'stop' : (REASONS[stop ?? 'end_turn'] ?? stop ?? 'stop'),
					...(typeof usage?.input_tokens === 'number' && typeof usage.output_tokens === 'number'
						? { usage: { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens } }
						: {}),
				};
			},
		};
	},
});
