import { isRecord, parse, path, t, type ChatMessage, type ChatRequest } from '@n8n/node-sdk';

import { generateContentSchema, replyTextOf } from '../content';
import { googleGemini } from '../google-gemini.node';

type Part = Record<string, unknown>;

const partsOf = (message: ChatMessage): Part[] => {
	switch (message.role) {
		case 'assistant':
			return [
				...(message.content ? [{ text: message.content }] : []),
				...(message.toolCalls ?? []).map(({ name, args }) => ({ functionCall: { name, args } })),
			];
		case 'tool': {
			// Gemini takes an object as the result, so a JSON object stays one.
			const parsed: unknown = (() => {
				try {
					return JSON.parse(message.content);
				} catch {
					return message.content;
				}
			})();
			const response = isRecord(parsed) ? parsed : { result: parsed };
			return [{ functionResponse: { name: message.name, response } }];
		}
		default:
			return [{ text: message.content }];
	}
};

/** Gemini has no system role in `contents`; tool results come from the user side. */
const contentsOf = (messages: readonly ChatMessage[]) =>
	messages
		.filter((message) => message.role !== 'system')
		.map((message) => ({
			role: message.role === 'assistant' ? 'model' : 'user',
			parts: partsOf(message),
		}));

/** Gemini finish reasons in the shared names, so a cut or blocked reply fails in `assertFinished`. */
const REASONS: Readonly<Record<string, string>> = {
	STOP: 'stop',
	MAX_TOKENS: 'length',
	SAFETY: 'content_filter',
	RECITATION: 'content_filter',
	BLOCKLIST: 'content_filter',
	PROHIBITED_CONTENT: 'content_filter',
	SPII: 'content_filter',
	IMAGE_SAFETY: 'content_filter',
};

export const geminiChatModel = googleGemini.provider('chatModel', {
	action: 'Google Gemini Chat Model',
	summary: 'A Google Gemini chat model for an AI node, e.g. ai.prompt or ai.agent.',
	provides: 'chatModel',
	input: {
		model: t
			.modelId('google')
			.hint('A model ID from the catalog, e.g. gemini-2.5-flash; never invent one'),
		temperature: t.num().with({ minimum: 0, maximum: 2 }).optional(),
		maxOutputTokens: t.int().with({ minimum: 1 }).optional(),
		topP: t.num().with({ minimum: 0, maximum: 1 }).optional(),
		topK: t.int().with({ minimum: 1 }).optional(),
	},
	async provide({ input, http }) {
		const model = input.model.replace(/^models\//, '');
		return {
			model,
			async chat({ messages, tools, output }: ChatRequest) {
				const system = messages.flatMap((message) =>
					message.role === 'system' ? [message.content] : [],
				);
				const body = await http.request({
					method: 'POST',
					path: path`/models/${model}:generateContent`,
					retry: true,
					body: {
						contents: contentsOf(messages),
						...(system.length
							? { systemInstruction: { parts: [{ text: system.join('\n\n') }] } }
							: {}),
						...(tools?.length
							? {
									tools: [
										{
											functionDeclarations: tools.map(({ name, description, input: schema }) => ({
												name,
												description,
												parametersJsonSchema: schema,
											})),
										},
									],
								}
							: {}),
						generationConfig: {
							temperature: input.temperature,
							maxOutputTokens: input.maxOutputTokens,
							topP: input.topP,
							topK: input.topK,
							...(output
								? { responseMimeType: 'application/json', responseJsonSchema: output }
								: {}),
						},
					},
				});
				const { candidates, promptFeedback, usageMetadata } = parse(generateContentSchema, body);
				const [candidate] = candidates ?? [];
				if (!candidate) {
					const reason = promptFeedback?.blockReason;
					throw new Error(`Gemini gave no reply${reason ? `: ${reason}` : ''}`);
				}
				const parts = candidate.content?.parts ?? [];
				// Gemini gives no call IDs before its newer models, so the position names a call.
				const toolCalls = parts.flatMap(({ functionCall: call }, index) =>
					call?.name
						? [{ id: call.id ?? `${call.name}-${index}`, name: call.name, args: call.args ?? {} }]
						: [],
				);
				const reason = candidate.finishReason ?? 'STOP';
				const inputTokens = usageMetadata?.promptTokenCount;
				const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;
				return {
					text: replyTextOf(parts),
					toolCalls,
					finishReason: toolCalls.length ? 'tool_calls' : (REASONS[reason] ?? reason),
					...(typeof inputTokens === 'number' ? { usage: { inputTokens, outputTokens } } : {}),
				};
			},
		};
	},
});
