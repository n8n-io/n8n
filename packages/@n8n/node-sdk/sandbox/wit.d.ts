// The JS form of the imports of `wit/guest.wit` that `guest.ts` uses, as ComponentizeJS
// gives them: `json` is text, `option` is `undefined`, and a `result` error throws an error
// with a `payload`.

declare module 'n8n:js-guest/bundle@1.0.0' {
	export function source(): string;
}

declare module 'n8n:node-contract/http@2.5.0' {
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

declare module 'n8n:node-contract/log@2.5.0' {
	export function log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void;
}

declare module 'n8n:node-contract/limits@2.5.0' {
	export function get(): { maxRequests: number; maxItems: number };
}

declare module 'n8n:node-contract/data-tables@2.5.0' {
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

declare module 'n8n:node-contract/code@2.5.0' {
	export function run(request: {
		language: 'javascript' | 'python';
		code: string;
		mode: 'all' | 'each';
	}): string;
}

declare module 'n8n:node-contract/wait@2.5.0' {
	export function until(at: bigint): void;
}

declare module 'n8n:node-contract/input-of@2.5.0' {
	export function get(item: number): string;
}
