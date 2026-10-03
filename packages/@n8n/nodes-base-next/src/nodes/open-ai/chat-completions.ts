import {
	parse,
	path,
	t,
	type ChatMessage,
	type ChatModel,
	type ChatRequest,
	type Http,
	type JsonSchema,
} from '@n8n/node-sdk';

/** The settings of a model on the Chat Completions API. Unset fields keep the provider default. */
export interface ChatCompletionsSettings {
	readonly model: string;
	readonly temperature?: number;
	readonly maxTokens?: number;
	readonly topP?: number;
	readonly frequencyPenalty?: number;
	readonly presencePenalty?: number;
	readonly reasoningEffort?: string;
}

/** How a compatible provider differs from OpenAI. */
export interface ChatCompletionsDialect {
	/** The body field of the token limit: OpenAI renamed it, compatible providers keep the old one. */
	readonly maxTokensField?: 'max_completion_tokens' | 'max_tokens';
	/** Provider fields each request sends. */
	readonly extraBody?: Readonly<Record<string, unknown>>;
}

// Providers add fields over time, so the response schemas check the fields read here only.
const open: JsonSchema = { additionalProperties: true };

const toolCallSchema = t
	.obj({
		id: t.str().optional(),
		function: t.obj({ name: t.str(), arguments: t.str() }).with(open),
	})
	.with(open);

const completionSchema = t
	.obj({
		choices: t
			.arr(
				t
					.obj({
						message: t
							.obj({
								content: t
									.nullable(t.union(t.str(), t.arr(t.obj({ text: t.str().optional() }).with(open))))
									.optional(),
								tool_calls: t.nullable(t.arr(toolCallSchema)).optional(),
							})
							.with(open),
						finish_reason: t.nullable(t.str()).optional(),
					})
					.with(open),
			)
			.with({ minItems: 1 }),
		usage: t
			.nullable(t.obj({ prompt_tokens: t.int(), completion_tokens: t.int() }).with(open))
			.optional(),
	})
	.with(open);

const messageOf = (message: ChatMessage) => {
	switch (message.role) {
		case 'assistant':
			return {
				role: 'assistant',
				content: message.content,
				...(message.toolCalls?.length
					? {
							tool_calls: message.toolCalls.map(({ id, name, args }) => ({
								id,
								type: 'function',
								function: { name, arguments: JSON.stringify(args) },
							})),
						}
					: {}),
			};
		case 'tool':
			return { role: 'tool', tool_call_id: message.toolCallId, content: message.content };
		default:
			return { role: message.role, content: message.content };
	}
};

/** The arguments of a tool call: a JSON object, or none. */
const argsOf = (text: string): Record<string, unknown> =>
	text.trim() === '' ? {} : parse(t.json(), JSON.parse(text));

/**
 * A chat model on the Chat Completions API (`POST {base}/chat/completions`), which OpenAI and
 * the OpenAI-compatible providers share.
 */
export function chatCompletionsModel(
	http: Http,
	settings: ChatCompletionsSettings,
	{ maxTokensField = 'max_completion_tokens', extraBody = {} }: ChatCompletionsDialect = {},
): ChatModel {
	const { model } = settings;
	return {
		model,
		async chat({ messages, tools, output }: ChatRequest) {
			const body = await http.request({
				method: 'POST',
				path: path`/chat/completions`,
				// A completion has no effect besides its cost, so a rate limit may retry.
				retry: true,
				body: {
					model,
					messages: messages.map(messageOf),
					...(tools?.length
						? {
								tools: tools.map(({ name, description, input }) => ({
									type: 'function',
									function: { name, description, parameters: input },
								})),
							}
						: {}),
					...(output
						? {
								response_format: {
									type: 'json_schema',
									json_schema: { name: 'output', schema: output, strict: false },
								},
							}
						: {}),
					temperature: settings.temperature,
					[maxTokensField]: settings.maxTokens,
					top_p: settings.topP,
					frequency_penalty: settings.frequencyPenalty,
					presence_penalty: settings.presencePenalty,
					reasoning_effort: settings.reasoningEffort,
					...extraBody,
				},
			});
			const { choices, usage } = parse(completionSchema, body);
			const [choice] = choices ?? [];
			if (!choice) throw new Error(`${model} gave no reply`);
			const { content, tool_calls: calls } = choice.message ?? {};
			return {
				text:
					typeof content === 'string'
						? content
						: (content ?? []).map((part) => part.text ?? '').join(''),
				toolCalls: (calls ?? []).flatMap(({ id, function: call }) =>
					call?.name
						? [{ id: id ?? call.name, name: call.name, args: argsOf(call.arguments ?? '') }]
						: [],
				),
				finishReason: choice.finish_reason ?? 'stop',
				...(typeof usage?.prompt_tokens === 'number' && typeof usage.completion_tokens === 'number'
					? { usage: { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens } }
					: {}),
			};
		},
	};
}
