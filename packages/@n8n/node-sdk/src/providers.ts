/**
 * The provider contract. A provider action gives one capability (a chat model, a tool) to a
 * root node through an n8n `ai_*` connection. Its `output` is the capability schema, and
 * `run()` returns the capability. A root action takes a capability as an input field
 * `provider.input(kind)`, or a list of them as `t.arr(provider.input(kind))`. The capabilities
 * are provider-neutral, so each service adapts its own API in its node, and every root node
 * works with every provider.
 */
import type { AINodeConnectionType } from 'n8n-workflow';

import { isRecord } from '@n8n/utils/is-record';

import { Schema, type AnySchema, type JsonSchema, type Shape } from './schema';

/** A tool call that a model asks for. `args` match the input schema of the tool. */
export interface ToolCall {
	/** The provider's call ID. A tool result names it. */
	readonly id: string;
	/** The name of the tool to call. */
	readonly name: string;
	/** The arguments of the call. */
	readonly args: Readonly<Record<string, unknown>>;
}

/** One message of a chat, oldest first. */
export type ChatMessage =
	| {
			/** `system`: instructions. `user`: what the user says. */
			readonly role: 'system' | 'user';
			/** The message text. */
			readonly content: string;
	  }
	| {
			/** A reply of the model. */
			readonly role: 'assistant';
			/** The reply text. Empty when the model only calls tools. */
			readonly content: string;
			/** The tool calls that the model asked for. */
			readonly toolCalls?: readonly ToolCall[];
	  }
	| {
			/** The result of a tool call. */
			readonly role: 'tool';
			/** The `id` of the tool call. */
			readonly toolCallId: string;
			/** The name of the tool. */
			readonly name: string;
			/** The tool result as text, usually JSON. */
			readonly content: string;
	  };

/** What a model reads about a tool. */
export interface ToolDefinition {
	/** Letters, digits, `_` and `-` only: providers reject other names. */
	readonly name: string;
	/** What the tool does and when to call it. The model reads it. */
	readonly description: string;
	/** A JSON Schema object for `args`. */
	readonly input: JsonSchema;
}

/** One call of a chat model. */
export interface ChatRequest {
	/** The chat so far, oldest first. */
	readonly messages: readonly ChatMessage[];
	/** Tools the model may call. A reply with tool calls has no final text. */
	readonly tools?: readonly ToolDefinition[];
	/** The reply text is JSON that matches this schema. The provider enforces it when it can. */
	readonly output?: JsonSchema;
}

/** The tokens of one chat call. */
export interface ChatUsage {
	/** The tokens of the request. */
	readonly inputTokens: number;
	/** The tokens of the reply. */
	readonly outputTokens: number;
}

/** The reply of a chat model. */
export interface ChatReply {
	/** The reply text. Empty when the model only calls tools. */
	readonly text: string;
	/** The tool calls that the model asks for. Empty for a final reply. */
	readonly toolCalls: readonly ToolCall[];
	/** A provider maps its own reasons to these names when they mean the same. */
	readonly finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | (string & {});
	/** The tokens of the call, when the provider reports them. */
	readonly usage?: ChatUsage;
}

/** A chat model with its settings applied. */
export interface ChatModel {
	/** The provider model ID, e.g. `gpt-5-mini`. */
	readonly model: string;
	/** Sends one chat request. The requests use the credential and the egress of the provider. */
	chat(request: ChatRequest): Promise<ChatReply>;
}

/** The chat history of one session. */
export interface Memory {
	/** The messages so far, oldest first. */
	load(): Promise<readonly ChatMessage[]>;
	/** Adds the messages of one turn. */
	save(messages: readonly ChatMessage[]): Promise<void>;
}

/** A tool a model may call. */
export interface Tool extends ToolDefinition {
	/** Runs the tool. The result goes back to the model as JSON. */
	call(args: Readonly<Record<string, unknown>>): Promise<unknown>;
}

/** An embedding model with its settings applied. */
export interface Embeddings {
	/** One vector per text, in order. */
	embed(texts: readonly string[]): Promise<ReadonlyArray<readonly number[]>>;
}

/** The capabilities a provider can give, by kind. */
export interface ProviderCapabilities {
	/** A chat model. n8n connection: `ai_languageModel`. */
	chatModel: ChatModel;
	/** The chat history of a session. n8n connection: `ai_memory`. */
	memory: Memory;
	/** A tool that a model may call. n8n connection: `ai_tool`. */
	tool: Tool;
	/** An embedding model. n8n connection: `ai_embedding`. */
	embeddings: Embeddings;
}

/** A capability kind: `chatModel`, `memory`, `tool` or `embeddings`. */
export type ProviderKind = keyof ProviderCapabilities;

/** The n8n connection type of each kind, so legacy root and sub-nodes keep their wiring rules. */
export const PROVIDER_CONNECTIONS = {
	chatModel: 'ai_languageModel',
	memory: 'ai_memory',
	tool: 'ai_tool',
	embeddings: 'ai_embedding',
} as const satisfies Record<ProviderKind, AINodeConnectionType>;

/**
 * The input field name of each kind, the slot name of the typed flow SDK. One spelling lets a
 * saved workflow read back as code: the field of a provider follows from its connection.
 */
export const PROVIDER_KIND_FIELDS = {
	chatModel: 'model',
	memory: 'memory',
	tool: 'tools',
	embeddings: 'embedding',
} as const satisfies Record<ProviderKind, string>;

/**
 * The field of each `ai_*` connection type in the `providers` of a derived root node, the slot
 * name of the typed flow SDK. The four provider kinds use the same names.
 */
export const PROVIDER_FIELDS = {
	ai_languageModel: 'model',
	ai_memory: 'memory',
	ai_tool: 'tools',
	ai_outputParser: 'outputParser',
	ai_embedding: 'embedding',
	ai_vectorStore: 'vectorStore',
	ai_retriever: 'retriever',
	ai_document: 'documentLoader',
	ai_textSplitter: 'textSplitter',
	ai_reranker: 'reranker',
} as const satisfies Partial<Record<AINodeConnectionType, string>>;

/** An n8n `ai_*` connection type that a provider can use, e.g. `ai_languageModel`. */
export type ProviderConnection = keyof typeof PROVIDER_FIELDS;

/** True when `value` is an n8n `ai_*` connection type of `PROVIDER_FIELDS`. */
export const isProviderConnection = (value: unknown): value is ProviderConnection =>
	typeof value === 'string' && Object.hasOwn(PROVIDER_FIELDS, value);

const CAPABILITY_METHODS: Record<ProviderKind, readonly string[]> = {
	chatModel: ['chat'],
	memory: ['load', 'save'],
	tool: ['call'],
	embeddings: ['embed'],
};

export const isProviderKind = (value: unknown): value is ProviderKind =>
	typeof value === 'string' && Object.hasOwn(PROVIDER_CONNECTIONS, value);

/**
 * A capability from a provider. In `input`, the root node takes it from the provider on the
 * matching connection; `t.arr(input(kind))` takes all of them. As `output`, the action is a
 * provider, and `run()` returns the capability.
 *
 * @example
 * ```ts
 * input: { model: provider.input('chatModel'), tools: t.arr(provider.input('tool')) },
 * ```
 */
const input = <const K extends ProviderKind>(kind: K) =>
	new Schema<ProviderCapabilities[K]>({ 'x-n8n-supply': kind }, false);

/** The kind a field takes from providers, and if it takes a list. */
export function providerInputOf(
	schema: JsonSchema,
): { kind: ProviderKind; many: boolean } | undefined {
	const own = schema['x-n8n-supply'];
	if (isProviderKind(own)) return { kind: own, many: false };
	const item = schema.type === 'array' ? schema.items?.['x-n8n-supply'] : undefined;
	return isProviderKind(item) ? { kind: item, many: true } : undefined;
}

/** A field of `input` that takes a capability from providers. */
export interface ProviderInputField {
	readonly name: string;
	readonly kind: ProviderKind;
	readonly many: boolean;
	/** A list may be empty, and an optional field may be unset. */
	readonly required: boolean;
	readonly title?: string;
}

export const providerInputsOf = (input: Shape): ProviderInputField[] =>
	Object.entries(input).flatMap(([name, schema]: [string, AnySchema]) => {
		const supply = providerInputOf(schema.json);
		if (!supply) return [];
		const required = !schema.isOptional && (!supply.many || (schema.json.minItems ?? 0) > 0);
		const { title } = schema.json;
		return [{ name, ...supply, required, ...(title ? { title } : {}) }];
	});

/** The kind an action gives when it is a provider. */
export const providedKindOf = (output: JsonSchema): ProviderKind | undefined => {
	const kind = output['x-n8n-supply'];
	return isProviderKind(kind) ? kind : undefined;
};

/**
 * What an action provides when it is a provider: a provider kind, or the `ai_*` connection type
 * of a derived provider, which runs as its legacy node.
 */
export const providedOf = (output: JsonSchema): ProviderKind | ProviderConnection | undefined => {
	const kind = output['x-n8n-supply'];
	return isProviderKind(kind) || isProviderConnection(kind) ? kind : undefined;
};

const TOOL_NAME = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * True when `value` has the members of a capability of `kind`, e.g. to check a value that
 * came from a legacy sub-node.
 */
function isCapability<K extends ProviderKind>(
	kind: K,
	value: unknown,
): value is ProviderCapabilities[K] {
	if (!isRecord(value)) return false;
	const methods = CAPABILITY_METHODS[kind].every((method) => typeof value[method] === 'function');
	if (kind === 'chatModel') return methods && typeof value.model === 'string';
	if (kind === 'tool') {
		return (
			methods &&
			typeof value.name === 'string' &&
			TOOL_NAME.test(value.name) &&
			typeof value.description === 'string' &&
			isRecord(value.input)
		);
	}
	return methods;
}

/**
 * The provider builders: `provider.input(kind)` for a root input, `provider.is` to check one.
 *
 * @see `docs/providers.md`
 */
export const provider = { input, is: isCapability };

/**
 * The host gives each tool to a root node as a LangChain tool. A LangChain tool with a JSON
 * Schema, as the host makes of a node contract tool, is a `Tool` again. Others stay as they are.
 */
export function fromLangChainTool(kind: ProviderKind, value: unknown): unknown {
	if (kind !== 'tool' || isCapability(kind, value) || !isRecord(value)) return value;
	const { name, description, schema, invoke } = value;
	const isJsonSchema =
		isRecord(schema) && typeof schema.type === 'string' && typeof schema.safeParse !== 'function';
	if (typeof invoke !== 'function' || !isJsonSchema) return value;
	return {
		name,
		description,
		input: schema,
		call: async (args: Readonly<Record<string, unknown>>) => {
			const result: unknown = await Reflect.apply(invoke, value, [args]);
			return result;
		},
	};
}

/**
 * A capability of `kind` that answers each method call with the next of `results`, for
 * fixtures and tests. `data` sets its other members, e.g. the `model` or the `name` of a tool.
 */
export function replayCapability(
	kind: ProviderKind,
	data: Readonly<Record<string, unknown>>,
	results: readonly unknown[],
): Record<string, unknown> {
	const left = [...results];
	const answer = async () => {
		if (left.length === 0) throw new Error(`The recorded ${kind} has no result left`);
		return left.shift();
	};
	return {
		...data,
		...Object.fromEntries(CAPABILITY_METHODS[kind].map((method) => [method, answer])),
	};
}

const childrenOf = (schema: JsonSchema): JsonSchema[] => [
	...Object.values(schema.properties ?? {}),
	...(schema.items ? [schema.items] : []),
	...(schema.oneOf ?? []),
	...(schema.anyOf ?? []),
];

const takesProvider = (schema: JsonSchema): boolean =>
	schema['x-n8n-supply'] !== undefined || childrenOf(schema).some(takesProvider);

/**
 * Problems of the provider fields of a contract. n8n gives a root node all providers of one
 * connection type together, so one field takes each kind.
 */
export function providerIssues(
	id: string,
	input: JsonSchema,
	output: JsonSchema,
	flow: { readonly cardinality: string },
): string[] {
	const fields = Object.entries(input.properties ?? {}).flatMap(([name, field]) => {
		const supply = providerInputOf(field);
		return supply ? [{ name, kind: supply.kind }] : [];
	});
	const misnamed = fields.filter(({ name, kind }) => name !== PROVIDER_KIND_FIELDS[kind]);
	const kinds = fields.map(({ kind }) => kind);
	const repeated = [...new Set(kinds.filter((kind, index) => kinds.indexOf(kind) !== index))];
	const deep = Object.values(input.properties ?? {}).some(
		(field) => providerInputOf(field) === undefined && takesProvider(field),
	);
	return [
		...repeated.map((kind) => {
			const names = fields.filter((field) => field.kind === kind).map((field) => field.name);
			return `${id}: input fields ${names.join(', ')} take the same provider kind ${kind}`;
		}),
		...misnamed.map(
			({ name, kind }) =>
				`${id}: input field ${name} takes ${kind}, so its name is ${PROVIDER_KIND_FIELDS[kind]}`,
		),
		...(deep ? [`${id}: a provider.input() field must be a top-level field`] : []),
		...(childrenOf(output).some(takesProvider) || (providedKindOf(output) && output.type)
			? [`${id}: a provider output is the capability itself`]
			: []),
		// n8n runs a provider once per call of its root node, so it gives one capability.
		...(providedKindOf(output) && flow.cardinality !== 'per-item'
			? [`${id}: a provider is per-item; define it with provider()`]
			: []),
	];
}
