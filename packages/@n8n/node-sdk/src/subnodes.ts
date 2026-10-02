/**
 * The sub-node contract. A sub-node action supplies one capability (a chat model, a tool) to a
 * root node through an n8n `ai_*` connection. Its `output` is `supplied(kind)`, and `run()`
 * returns the capability. A root action takes a capability as an input field `supplied(kind)`,
 * or a list of them as `arr(supplied(kind))`. The capabilities are provider-neutral, so each
 * provider adapts its own API in its node, and every root node works with every provider.
 */
import type { AINodeConnectionType } from 'n8n-workflow';

import { isRecord } from '@n8n/utils/is-record';

import { Schema, str, type AnySchema, type JsonSchema, type Shape } from './schema';

/** A tool call that a model asks for. `args` match the input schema of the tool. */
export interface ToolCall {
	/** The provider's call ID. A tool result names it. */
	readonly id: string;
	readonly name: string;
	readonly args: Readonly<Record<string, unknown>>;
}

/** One message of a chat, oldest first. */
export type ChatMessage =
	| { readonly role: 'system' | 'user'; readonly content: string }
	| {
			readonly role: 'assistant';
			readonly content: string;
			readonly toolCalls?: readonly ToolCall[];
	  }
	| {
			readonly role: 'tool';
			readonly toolCallId: string;
			readonly name: string;
			/** The tool result as text, usually JSON. */
			readonly content: string;
	  };

/** What a model reads about a tool. */
export interface ToolDefinition {
	/** Letters, digits, `_` and `-` only: providers reject other names. */
	readonly name: string;
	readonly description: string;
	/** A JSON Schema object for `args`. */
	readonly input: JsonSchema;
}

export interface ChatRequest {
	readonly messages: readonly ChatMessage[];
	/** Tools the model may call. A reply with tool calls has no final text. */
	readonly tools?: readonly ToolDefinition[];
	/** The reply text is JSON that matches this schema. The provider enforces it when it can. */
	readonly output?: JsonSchema;
}

export interface ChatUsage {
	readonly inputTokens: number;
	readonly outputTokens: number;
}

export interface ChatReply {
	readonly text: string;
	readonly toolCalls: readonly ToolCall[];
	/** A provider maps its own reasons to these names when they mean the same. */
	readonly finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | (string & {});
	readonly usage?: ChatUsage;
}

/** A chat model with its settings applied. */
export interface ChatModel {
	/** The provider model ID, e.g. `gpt-5-mini`. */
	readonly model: string;
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

export interface Embeddings {
	/** One vector per text, in order. */
	embed(texts: readonly string[]): Promise<ReadonlyArray<readonly number[]>>;
}

/** The capabilities a sub-node can supply, by kind. */
export interface Supplies {
	chatModel: ChatModel;
	memory: Memory;
	tool: Tool;
	embeddings: Embeddings;
}

export type SupplyKind = keyof Supplies;

/** The n8n connection type of each kind, so legacy root and sub-nodes keep their wiring rules. */
export const SUPPLY_CONNECTIONS = {
	chatModel: 'ai_languageModel',
	memory: 'ai_memory',
	tool: 'ai_tool',
	embeddings: 'ai_embedding',
} as const satisfies Record<SupplyKind, AINodeConnectionType>;

/**
 * The input field name of each kind, the slot name of the typed flow SDK. One spelling lets a
 * saved workflow read back as code: the field of a sub-node follows from its connection.
 */
export const SUPPLY_FIELDS = {
	chatModel: 'model',
	memory: 'memory',
	tool: 'tools',
	embeddings: 'embedding',
} as const satisfies Record<SupplyKind, string>;

/**
 * The field of each `ai_*` connection type in the `providers` of a derived root node, the slot
 * name of the typed flow SDK. The four supplied kinds use the same names.
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

export type ProviderConnection = keyof typeof PROVIDER_FIELDS;

export const isProviderConnection = (value: unknown): value is ProviderConnection =>
	typeof value === 'string' && Object.hasOwn(PROVIDER_FIELDS, value);

const SUPPLY_METHODS: Record<SupplyKind, readonly string[]> = {
	chatModel: ['chat'],
	memory: ['load', 'save'],
	tool: ['call'],
	embeddings: ['embed'],
};

export const isSupplyKind = (value: unknown): value is SupplyKind =>
	typeof value === 'string' && Object.hasOwn(SUPPLY_CONNECTIONS, value);

/**
 * A capability from a sub-node. In `input`, the root node takes it from the sub-node on the
 * matching connection; `arr(supplied(kind))` takes all of them. As `output`, the action is a
 * sub-node, and `run()` returns the capability.
 */
export const supplied = <const K extends SupplyKind>(kind: K) =>
	new Schema<Supplies[K]>({ 'x-n8n-supply': kind }, false);

/** The kind a field takes from sub-nodes, and if it takes a list. */
export function supplyOf(schema: JsonSchema): { kind: SupplyKind; many: boolean } | undefined {
	const own = schema['x-n8n-supply'];
	if (isSupplyKind(own)) return { kind: own, many: false };
	const item = schema.type === 'array' ? schema.items?.['x-n8n-supply'] : undefined;
	return isSupplyKind(item) ? { kind: item, many: true } : undefined;
}

/** A field of `input` that takes a capability from sub-nodes. */
export interface SupplyField {
	readonly name: string;
	readonly kind: SupplyKind;
	readonly many: boolean;
	/** A list may be empty, and an optional field may be unset. */
	readonly required: boolean;
	readonly title?: string;
}

export const supplyFieldsOf = (input: Shape): SupplyField[] =>
	Object.entries(input).flatMap(([name, schema]: [string, AnySchema]) => {
		const supply = supplyOf(schema.json);
		if (!supply) return [];
		const required = !schema.isOptional && (!supply.many || (schema.json.minItems ?? 0) > 0);
		const { title } = schema.json;
		return [{ name, ...supply, required, ...(title ? { title } : {}) }];
	});

/** The kind an action supplies when it is a sub-node. */
export const suppliedKindOf = (output: JsonSchema): SupplyKind | undefined => {
	const kind = output['x-n8n-supply'];
	return isSupplyKind(kind) ? kind : undefined;
};

/**
 * What an action provides when it is a provider: a supplied kind, or the `ai_*` connection type
 * of a derived provider, which runs as its legacy node.
 */
export const providedOf = (output: JsonSchema): SupplyKind | ProviderConnection | undefined => {
	const kind = output['x-n8n-supply'];
	return isSupplyKind(kind) || isProviderConnection(kind) ? kind : undefined;
};

const TOOL_NAME = /^[A-Za-z0-9_-]{1,64}$/;

/** `value` has the members of a capability of `kind`. */
export function isSupply<K extends SupplyKind>(kind: K, value: unknown): value is Supplies[K] {
	if (!isRecord(value)) return false;
	const methods = SUPPLY_METHODS[kind].every((method) => typeof value[method] === 'function');
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
 * A capability of `kind` that answers each method call with the next of `results`, for
 * fixtures and tests. `data` sets its other members, e.g. the `model` or the `name` of a tool.
 */
export function replaySupply(
	kind: SupplyKind,
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
		...Object.fromEntries(SUPPLY_METHODS[kind].map((method) => [method, answer])),
	};
}

/**
 * A model ID of `provider` in the model catalog (models.dev). The typed flow SDK types it by
 * the catalog the build knows, so a workflow cannot name a model that the provider lacks.
 */
export const modelId = (provider: string) =>
	str()
		.with({ 'x-n8n-model-catalog': provider, minLength: 1 })
		.hint('A model ID from the catalog; never invent one');

const childrenOf = (schema: JsonSchema): JsonSchema[] => [
	...Object.values(schema.properties ?? {}),
	...(schema.items ? [schema.items] : []),
	...(schema.oneOf ?? []),
	...(schema.anyOf ?? []),
];

const hasSupply = (schema: JsonSchema): boolean =>
	schema['x-n8n-supply'] !== undefined || childrenOf(schema).some(hasSupply);

/**
 * Problems of the sub-node fields of a contract. n8n gives a root node all sub-nodes of one
 * connection type together, so one field takes each kind.
 */
export function supplyIssues(
	id: string,
	input: JsonSchema,
	output: JsonSchema,
	flow: { readonly cardinality: string },
): string[] {
	const fields = Object.entries(input.properties ?? {}).flatMap(([name, field]) => {
		const supply = supplyOf(field);
		return supply ? [{ name, kind: supply.kind }] : [];
	});
	const misnamed = fields.filter(({ name, kind }) => name !== SUPPLY_FIELDS[kind]);
	const kinds = fields.map(({ kind }) => kind);
	const repeated = [...new Set(kinds.filter((kind, index) => kinds.indexOf(kind) !== index))];
	const deep = Object.values(input.properties ?? {}).some(
		(field) => supplyOf(field) === undefined && hasSupply(field),
	);
	return [
		...repeated.map((kind) => {
			const names = fields.filter((field) => field.kind === kind).map((field) => field.name);
			return `${id}: input fields ${names.join(', ')} take the same sub-node kind ${kind}`;
		}),
		...misnamed.map(
			({ name, kind }) =>
				`${id}: input field ${name} takes ${kind}, so its name is ${SUPPLY_FIELDS[kind]}`,
		),
		...(deep ? [`${id}: a supplied() input must be a top-level field`] : []),
		...(childrenOf(output).some(hasSupply) || (suppliedKindOf(output) && output.type)
			? [`${id}: a sub-node output is supplied(kind) itself`]
			: []),
		// n8n runs a sub-node once per call of its root node, so it gives one capability.
		...(suppliedKindOf(output) && flow.cardinality !== 'per-item'
			? [`${id}: a sub-node is per-item; define it with subnode()`]
			: []),
	];
}
