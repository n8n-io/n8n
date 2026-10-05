// A module of its own: its schemas build at load, so a bundle that uses no reply helper drops it.
import { isRecord } from '@n8n/utils/is-record';

import { OperationalError, UserError } from './errors';
import type { ChatMessage, ChatModel, ChatReply } from './providers';
import { t, type JsonSchema } from './schema';
import { validate } from './validator';

/** The system message, when there is one, then the prompt. */
export const promptMessages = (system: string | undefined, prompt: string): ChatMessage[] => [
	...(system ? [{ role: 'system', content: system } satisfies ChatMessage] : []),
	{ role: 'user', content: prompt },
];

/** The build reads a reply schema, so it is a literal. */
const literal: JsonSchema = { 'x-n8n-literal': true };

/**
 * An optional input field: a JSON Schema object that types the reply. Pair it with
 * `replyOutput` and `deriveOutput: ({ schema }) => replyOutputOf(schema)`.
 */
export const replySchema = t
	.obj({
		type: t.lit('object'),
		properties: t.record(t.json().with(literal)),
		required: t.arr(t.str().with(literal)).optional(),
	})
	.with({ additionalProperties: true, 'x-n8n-literal': true })
	.optional()
	.hint('JSON Schema of the reply; leave a field the model may not find out of `required`');

const replyText = t.str().hint('The reply text');

/** The output of a reply: `{ text }`, and `output` when the input has a `replySchema`. */
export const replyOutput = t.obj({
	text: replyText,
	output: t.jsonValue().optional().hint('The reply parsed by schema'),
});

/**
 * True when a `replySchema` input value is set. The contract checks only its top-level shape;
 * `parseReply` reads the rest.
 */
export const isReplySchema = (value: unknown): value is JsonSchema =>
	isRecord(value) && (value.type === undefined || typeof value.type === 'string');

/** The output schema of a reply for a `replySchema` input value: `output` gets its type. */
export function replyOutputOf(schema: unknown): JsonSchema {
	const base = t.obj({ text: replyText }).json;
	if (!isReplySchema(schema)) return base;
	return {
		...base,
		properties: { ...base.properties, output: schema },
		required: ['text', 'output'],
	};
}

/** A model may wrap JSON in a Markdown code block. */
const FENCE = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/;

/**
 * `value` without the `null` fields that `schema` does not require and does not allow as `null`.
 * A model often sends `null` for a field it did not find; the output type marks such a field as
 * optional, so it becomes absent.
 */
function withoutOptionalNulls(value: unknown, schema: JsonSchema): unknown {
	if (Array.isArray(value)) {
		const items = schema.items;
		return items ? value.map((item) => withoutOptionalNulls(item, items)) : value;
	}
	if (!isRecord(value) || !schema.properties) return value;
	const properties = schema.properties;
	const required = schema.required ?? [];
	return Object.fromEntries(
		Object.entries(value).flatMap(([key, child]) => {
			const property = properties[key];
			if (!property) return [[key, child]];
			const dropped =
				child === null && !required.includes(key) && validate(null, property).length > 0;
			return dropped ? [] : [[key, withoutOptionalNulls(child, property)]];
		}),
	);
}

/**
 * The reply text parsed as JSON and checked against `schema`, without the `null` fields that
 * `schema` does not require. Throws an `OperationalError` when it does not match.
 */
export function parseReply(reply: ChatReply, schema: JsonSchema): unknown {
	const text = FENCE.exec(reply.text)?.[1] ?? reply.text;
	const parsed: unknown = (() => {
		try {
			return JSON.parse(text);
		} catch {
			throw new OperationalError(`The model reply is not JSON: ${text.slice(0, 200)}`);
		}
	})();
	const output = withoutOptionalNulls(parsed, schema);
	const issues = validate(output, schema, { path: 'output' });
	if (issues.length > 0) {
		throw new OperationalError(`The model reply does not match the schema: ${issues.join('; ')}`);
	}
	return output;
}

/** Throws a `UserError` when the token limit or a content filter cut the reply of `model`. */
export function assertFinished(reply: ChatReply, model: string) {
	if (reply.finishReason === 'length' && reply.toolCalls.length === 0) {
		throw new UserError(`${model} reached its token limit before it finished the reply`);
	}
	if (reply.finishReason === 'content_filter') {
		throw new UserError(`${model} stopped the reply: content filter`);
	}
}

/**
 * One prompt to `model`: the reply text, and the reply parsed by `schema` when it is set. The
 * result matches `replyOutput`.
 *
 * @example
 * ```ts
 * input: { model: provider.input('chatModel'), prompt: t.str(), schema: replySchema },
 * output: replyOutput,
 * deriveOutput: ({ schema }) => replyOutputOf(schema),
 * run: async ({ input }) => await promptReply(input.model, input),
 * ```
 */
export async function promptReply(
	model: ChatModel,
	input: {
		/** Instructions for the model, sent as the system message. */
		readonly system?: string;
		/** The user message. */
		readonly prompt: string;
		/** The `replySchema` input value. When set, the reply must match it. */
		readonly schema?: unknown;
	},
) {
	const schema = isReplySchema(input.schema) ? input.schema : undefined;
	const messages = promptMessages(input.system, input.prompt);
	const reply = await model.chat({ messages, ...(schema ? { output: schema } : {}) });
	assertFinished(reply, model.model);
	return schema ? { text: reply.text, output: parseReply(reply, schema) } : { text: reply.text };
}
