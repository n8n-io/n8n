// The JS form of the imports of `wit/guest.wit` that the guests use, as ComponentizeJS gives
// them: `json` is text, `option` is `undefined`, `u64` is a bigint, a resource is a class, and
// a `result` error throws an error with a `payload`.

declare module 'n8n:js-guest/bundle@1.0.0' {
	export function source(): string;
}

declare module 'n8n:node-contract/http@2.8.0' {
	export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
	export type HttpTarget = { tag: 'url'; val: string } | { tag: 'path'; val: string };
	export interface HttpRequest {
		method: HttpMethod;
		target: HttpTarget;
		query: Array<[string, string]>;
		headers: Array<[string, string]>;
		body?: string;
		timeoutMs?: number;
		retry?: boolean;
	}
	export interface HttpResponse {
		status: number;
		headers: Array<[string, string]>;
		body: string;
	}
	export interface HttpError {
		message: string;
		status: number;
		headers: Array<[string, string]>;
		body: string;
	}
	export type HttpFailure = { tag: 'response'; val: HttpError } | { tag: 'transport'; val: string };
	export function request(request: HttpRequest): HttpResponse;
}

declare module 'n8n:node-contract/log@2.8.0' {
	export function log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void;
}

declare module 'n8n:node-contract/limits@2.8.0' {
	export function get(): { maxRequests: number; maxItems: number };
}

declare module 'n8n:node-contract/chunk@2.8.0' {
	export function item(index: number): void;
}

declare module 'n8n:node-contract/data-tables@2.8.0' {
	export type ColumnType = 'string' | 'number' | 'boolean' | 'date';
	export interface Column {
		name: string;
		type: ColumnType;
	}
	export type Operator =
		| 'eq'
		| 'neq'
		| 'like'
		| 'ilike'
		| 'gt'
		| 'gte'
		| 'lt'
		| 'lte'
		| 'is-empty'
		| 'is-not-empty';
	export interface Filter {
		match: 'all' | 'any';
		conditions: Array<{ column: string; op: Operator; value?: string }>;
	}
	export interface RowQuery {
		filter?: Filter;
		sort?: { column: string; direction: 'asc' | 'desc' };
		offset?: number;
		limit: number;
	}
	export interface TableInfo {
		id: string;
		name: string;
		columns: Column[];
		createdAt: string;
		updatedAt: string;
	}
	export class Table {
		id(): string;
		columns(): Column[];
		rows(query: RowQuery): { count: bigint; rows: string[] };
		insert(rows: string[]): string[];
		update(filter: Filter, values: string): string[];
		upsert(filter: Filter, values: string): string[];
		delete(filter: Filter): string[];
		clear(): bigint;
		rename(name: string): boolean;
		drop(): boolean;
	}
	export function open(table: { tag: 'id'; val: string } | { tag: 'name'; val: string }): Table;
	export function list(query: {
		name?: string;
		sort?: { by: 'name' | 'created-at' | 'updated-at'; direction: 'asc' | 'desc' };
		offset?: number;
		limit: number;
	}): { count: bigint; tables: TableInfo[] };
	export function create(table: { name: string; columns: Column[] }): TableInfo;
}

declare module 'n8n:node-contract/parsers@2.8.0' {
	import type { Binary } from 'n8n:node-contract/binary@2.8.0';
	/** The host checks the format and its options. */
	export function extract(
		file: Binary,
		request: { tag: string; val: Record<string, unknown> },
	): string;
}

declare module 'n8n:node-contract/code@2.8.0' {
	export function run(request: {
		language: 'javascript' | 'python';
		code: string;
		mode: 'all' | 'each';
	}): string;
}

declare module 'n8n:node-contract/wait@2.8.0' {
	export function until(at: bigint): void;
}

declare module 'n8n:node-contract/input-of@2.8.0' {
	export function get(item: number): string;
}

declare module 'n8n:node-contract/run-credential@2.8.0' {
	export function get(): { type: string; fields: string } | undefined;
}

declare module 'n8n:node-contract/binary@2.8.0' {
	import type { HttpRequest, HttpResponse } from 'n8n:node-contract/http@2.8.0';
	export interface BinaryMeta {
		mimeType: string;
		fileName?: string;
		bytes?: bigint;
	}
	export class Binary {
		meta(): BinaryMeta;
		reader(): BinaryReader;
		id(): bigint;
	}
	export class BinaryReader {
		read(maxBytes: number): Uint8Array;
	}
	export class BinaryWriter {
		constructor(mimeType: string, fileName?: string);
		write(chunk: Uint8Array): void;
		static finish(writer: BinaryWriter): Binary;
	}
	export function open(id: bigint): Binary;
	export function send(request: Omit<HttpRequest, 'body'>, body: Binary): HttpResponse;
	export function fetch(
		request: HttpRequest,
		body?: Binary,
	): { status: number; headers: Array<[string, string]>; body: Binary };
}

declare module 'n8n:node-contract/capabilities@2.8.0' {
	export interface ToolCall {
		id: string;
		name: string;
		args: string;
	}
	export type ChatMessage =
		| { tag: 'system' | 'user'; val: string }
		| { tag: 'assistant'; val: { content: string; toolCalls?: ToolCall[] } }
		| { tag: 'tool'; val: { toolCallId: string; name: string; content: string } };
	export interface ChatRequest {
		messages: ChatMessage[];
		tools?: Array<{ name: string; description: string; input: string }>;
		output?: string;
	}
	export interface ChatReply {
		text: string;
		toolCalls: ToolCall[];
		finishReason: string;
		usage?: { inputTokens: number; outputTokens: number };
	}
	export class ChatModel {
		model(): string;
		chat(request: ChatRequest): ChatReply;
	}
	export class Memory {
		load(): ChatMessage[];
		save(messages: ChatMessage[]): void;
	}
	export class Tool {
		name(): string;
		description(): string;
		input(): string;
		call(args: string): string;
	}
	export class Embeddings {
		embed(texts: string[]): Float64Array[];
	}
	export type Capability =
		| { tag: 'chat-model'; val: ChatModel }
		| { tag: 'memory'; val: Memory }
		| { tag: 'tool'; val: Tool }
		| { tag: 'embeddings'; val: Embeddings };
}

declare module 'n8n:node-contract/supplied@2.8.0' {
	import type { Capability } from 'n8n:node-contract/capabilities@2.8.0';
	export function open(id: bigint): Capability;
}
