import {
	isRecord,
	t,
	validate,
	type ChatMessage,
	type ChatModel,
	type ChatReply,
	type JsonSchema,
} from '@n8n/node-sdk';

/** The system message, when there is one, then the prompt. */
export const promptMessages = (system: string | undefined, prompt: string): ChatMessage[] => [
	...(system ? [{ role: 'system', content: system } satisfies ChatMessage] : []),
	{ role: 'user', content: prompt },
];

/** A JSON Schema object that types the reply. The build reads it, so it is a literal. */
const literal: JsonSchema = { 'x-n8n-literal': true };

export const replySchema = t
	.obj({
		type: t.lit('object'),
		properties: t.record(t.json().with(literal)),
		required: t.arr(t.str().with(literal)).optional(),
	})
	.with({ additionalProperties: true, 'x-n8n-literal': true })
	.optional()
	.hint('JSON Schema of the reply object; the output field gets its type');

const text = t.str().hint('The reply text');

/** `{ text }`, and `output` when the input has a schema. `deriveOutput` types `output`. */
export const replyOutput = t.obj({
	text,
	output: t.jsonValue().optional().hint('The reply parsed by schema'),
});

/** A user schema: the contract checks its top-level shape, the reply check reads the rest. */
export const isJsonSchema = (value: unknown): value is JsonSchema =>
	isRecord(value) && (value.type === undefined || typeof value.type === 'string');

export function replyOutputOf(schema: unknown): JsonSchema {
	const base = t.obj({ text }).json;
	if (!isJsonSchema(schema)) return base;
	return {
		...base,
		properties: { ...base.properties, output: schema },
		required: ['text', 'output'],
	};
}

/** A model may wrap JSON in a Markdown code block. */
const FENCE = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/;

/** The reply text parsed as JSON and checked against `schema`. */
export function parseReply(reply: ChatReply, schema: JsonSchema): unknown {
	const text = FENCE.exec(reply.text)?.[1] ?? reply.text;
	const parsed: unknown = (() => {
		try {
			return JSON.parse(text);
		} catch {
			throw new Error(`The model reply is not JSON: ${text.slice(0, 200)}`);
		}
	})();
	const issues = validate(parsed, schema, { path: 'output' });
	if (issues.length > 0) {
		throw new Error(`The model reply does not match the schema: ${issues.join('; ')}`);
	}
	return parsed;
}

/** A reply cut off by the token limit or a filter has no usable text. */
export function assertFinished(reply: ChatReply, model: string) {
	if (reply.finishReason === 'length' && reply.toolCalls.length === 0) {
		throw new Error(`${model} reached its token limit before it finished the reply`);
	}
	if (reply.finishReason === 'content_filter') {
		throw new Error(`${model} stopped the reply: content filter`);
	}
}

/** One prompt to `model`: the reply text, and the reply parsed by `schema` when it is set. */
export async function promptReply(
	model: ChatModel,
	input: { readonly system?: string; readonly prompt: string; readonly schema?: unknown },
) {
	const schema = isJsonSchema(input.schema) ? input.schema : undefined;
	const messages = promptMessages(input.system, input.prompt);
	const reply = await model.chat({ messages, ...(schema ? { output: schema } : {}) });
	assertFinished(reply, model.model);
	return schema ? { text: reply.text, output: parseReply(reply, schema) } : { text: reply.text };
}
