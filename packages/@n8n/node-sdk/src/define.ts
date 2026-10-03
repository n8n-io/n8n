import { isRecord } from '@n8n/utils/is-record';
import { toHostname, UserError } from 'n8n-workflow';

import type { AnyCredentialType, Credential, CredentialKey, RunCredential } from './credentials';
import {
	hasBinary,
	Schema,
	t,
	type AnySchema,
	type Binary,
	type BinaryMeta,
	type Infer,
	type JsonSchema,
	type ObjectOf,
	type ResourcePointer,
	type RunFieldsOf,
	type Shape,
} from './schema';
import {
	provider,
	providedKindOf,
	providerIssues,
	providerInputOf,
	type ProviderCapabilities,
	type ProviderKind,
} from './providers';
import type { PollConfig, TriggerKind, WebhookConfig, WebhookRequest } from './triggers';
import { exampleOf, firstMatchOf, outputBinaryKeys, readAs, validate } from './validate';

/**
 * The integration identity: name, credential, and base URL shared by its actions.
 *
 * @see {@link defineNode}
 * @see `docs/node-contract.md`
 */
export interface NodeDefinition {
	/** Short id, the first segment of every action id: `notion`. */
	readonly id: string;
	/** The node name in the n8n UI, e.g. `Notion`. */
	readonly displayName: string;
	/** The one credential of the node: its credential types and its scopes. */
	readonly credential?: Credential;
	/**
	 * The URL that a request `path` goes after, e.g. `https://api.notion.com/v1`. Its host is in
	 * the egress of every action. The base URL of a credential type with `baseUrl` replaces it.
	 */
	readonly baseUrl?: string;
	/** The icon in the n8n UI, an n8n icon value such as `file:notion.svg`. `toNodeType` does not read it. */
	readonly icon?: string;
	/**
	 * Legacy node types that this node does the whole job of, e.g.
	 * `@n8n/n8n-nodes-langchain.lmChatOpenAi`. Search shows this node instead of them, so a
	 * legacy node with operations this node lacks must not be in the list.
	 */
	readonly replaces?: readonly string[];
	/**
	 * The error message in the JSON body of a successful response, or `undefined` when the body
	 * has no error. It runs for every request of the node's actions and triggers, so a service
	 * that answers an error with status 200 fails the item. The request throws a `UserError`
	 * with the message, which `run()` may catch.
	 *
	 * @example
	 * ```ts
	 * errorOf: (body) => (isRecord(body) && body.ok === false ? String(body.error) : undefined),
	 * ```
	 */
	readonly errorOf?: (body: unknown) => string | undefined;
}

/** The scopes an action of node `N` may list. */
export type ScopeOf<N extends NodeDefinition> = NonNullable<N['credential']> extends Credential<
	AnyCredentialType,
	infer Scope
>
	? Scope
	: never;

/** The credential types of node `N`. */
export type CredentialTypeOf<N extends NodeDefinition> = NonNullable<
	N['credential']
>['types'][number];

/** The credential of a run of node `N`, without secrets. `undefined` when the run has none. */
export type RunCredentialOf<N extends NodeDefinition> =
	| RunCredential<CredentialTypeOf<N>>
	| undefined;

/** What the action does to the item stream. */
export interface ActionFlow {
	/**
	 * `read` gets data from a service, `write` changes data in a service, and `transform` changes
	 * items with no service call. A `transform` is never an agent tool. It does not limit the HTTP
	 * methods: some reads send `POST`.
	 */
	readonly effect: 'read' | 'write' | 'transform';
	/**
	 * `per-item`: `run()` returns one output for each input item. `1:N`: `run()` yields the
	 * outputs of each input item. `batch`: `run()` runs once with all input items, and each
	 * output names the input items it comes from.
	 */
	readonly cardinality: 'per-item' | '1:N' | 'batch';
	/** A repeated request has no extra effect, so the host may retry any of its requests. */
	readonly idempotent?: boolean;
}

/** An input item as `run()` reads it. Emit it as `{ item }` to pass it on unchanged, binary data too. */
export interface InputItem {
	/** The JSON data of the item. */
	readonly json: Readonly<Record<string, unknown>>;
}

/**
 * One output per entry of the input list `each`, named by the `output` field of the entry,
 * then the outputs in `then`. Switch cases use it.
 */
export interface OutputsPerEntry {
	/** The input list whose entries each have an `output` name, e.g. `rules`. */
	readonly each: string;
	/** Fixed outputs after the entry outputs, e.g. `['fallback']`. */
	readonly then?: readonly string[];
}

/**
 * Named outputs in n8n output order. Without them an action has one unnamed output. List
 * the "no" path last (false, discarded, fallback): continue-on-fail sends error items there.
 */
export type ActionOutputs = readonly [string, ...string[]] | OutputsPerEntry;

/** The output names `run()` may route to. Names that come from the input are checked at run time. */
export type OutputName<Outs> = Outs extends ReadonlyArray<infer N extends string>
	? N
	: Outs extends OutputsPerEntry
		? string
		: never;

/** The input lists whose entries can each name an output. */
type EntryListKey<S extends Shape> = {
	[K in keyof S]: Infer<S[K]> extends ReadonlyArray<{ readonly output: string }> ? K : never;
}[keyof S] &
	string;

/** Outputs per entry must name an input list whose entries each have an `output` name. */
type OutputsCheck<Outs, Full extends Shape> = Outs extends OutputsPerEntry
	? {
			/** Outputs per entry of an input list. */
			readonly outputs: {
				/** An input list whose entries each have an `output` name. */
				readonly each: EntryListKey<Full>;
			};
		}
	: unknown;

/** Named inputs read all items of each input at once, so only a `batch` action has them. */
type InputsCheck<Ins, F extends ActionFlow> = Ins extends ActionInputs
	? F['cardinality'] extends 'batch'
		? unknown
		: {
				/** An action with named inputs runs as a batch. */
				readonly flow: {
					/** Named inputs need `batch`. */
					readonly cardinality: 'batch';
				};
			}
	: unknown;

/** The input item or items that an output item comes from. */
export type Lineage = InputItem | readonly InputItem[];

type Routed<Outs> = Outs extends ActionOutputs
	? {
			/** The named output that the item goes to, e.g. `'true'`. */
			readonly to: OutputName<Outs>;
		}
	: { readonly to?: never };

/** An input item passed on unchanged, or a new output item. */
type Passed = {
	/** The input item to pass on unchanged, binary data too. */
	readonly item: InputItem;
	readonly json?: never;
	readonly from?: never;
};
type Made<Output, From> = {
	/** The new output item. The host checks it against `output`. */
	readonly json: Output;
	readonly item?: never;
} & From;

/** The lineage of a batch output. */
type BatchFrom = {
	/** The input item or items that the output comes from. */
	readonly from: Lineage;
};

/**
 * One output of `run()`. A batch output names its lineage in `from`; a per-item output comes
 * from the current item. An action with named outputs routes each output with `to`.
 */
export type Emit<C, Output, Outs> = C extends 'batch'
	? Routed<Outs> & (Passed | Made<Output, BatchFrom>)
	: Outs extends ActionOutputs
		? Routed<Outs> & (Passed | Made<Output, { readonly from?: never }>)
		: Output;

/** The HTTP methods that `http.request` sends. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

type QueryValue = string | number | boolean;

interface HttpRequestOptions {
	/**
	 * The HTTP method.
	 *
	 * @defaultValue `'GET'`
	 */
	readonly method?: HttpMethod;
	/** An array value repeats its key: `{ id: ['a', 'b'] }` sends `id=a&id=b`. */
	readonly query?: Readonly<Record<string, QueryValue | readonly QueryValue[] | undefined>>;
	/** Request headers. The host adds the credential, so do not set it here. */
	readonly headers?: Readonly<Record<string, string>>;
	/**
	 * Sent as JSON. A `Binary` streams from the n8n binary data store, with its MIME type as
	 * `content-type` unless `headers` set one.
	 */
	readonly body?: unknown;
	/** `binary`: the response body goes to the n8n binary data store, and the result is its `Binary`. */
	readonly response?: 'binary';
	/** Return `{ body, headers, statusCode }` instead of the body. */
	readonly fullResponse?: boolean;
	/**
	 * The request timeout in milliseconds.
	 *
	 * @defaultValue `300000` (5 minutes), as in the legacy HTTP Request node
	 */
	readonly timeoutMs?: number;
	/**
	 * The host retries a 429, 502, 503, 504, or a dropped connection when the request is
	 * idempotent: GET, HEAD, PUT, or an action with `flow.idempotent`. `true` also retries
	 * another method; `false` never retries.
	 */
	readonly retry?: boolean;
}

declare const encodedPath: unique symbol;

/** A request path whose values `path` encoded. Write `path` to make one. */
export type EncodedPath = `/${string}` & {
	/** The brand. It has no value at run time. */
	readonly [encodedPath]: true;
};

/** The path starts with one `/`: two slashes make a URL of another host. */
export const isRequestPath = (value: string): value is EncodedPath => /^\/(?![/\\])/.test(value);

/**
 * The value as one encoded path segment. Encoding keeps `.` and `..`, and a URL resolves them,
 * so these values and an empty value throw: each one changes the path.
 */
export function pathSegmentOf(value: string | number): string {
	const text = String(value);
	if (text === '' || text === '.' || text === '..') {
		throw new UserError(`The path value ${JSON.stringify(text)} changes the path`);
	}
	return encodeURIComponent(text);
}

/**
 * A request path with each value encoded as one segment, e.g. `a/../b` becomes `a%2F..%2Fb`. It
 * throws for an empty, `.` or `..` value, and when the path does not start with one `/`.
 *
 * @example
 * ```ts
 * const issues = await http.request({ path: path`/repos/${input.owner}/${input.repo}/issues` });
 * ```
 */
export function path(
	strings: readonly string[],
	...values: ReadonlyArray<string | number>
): EncodedPath {
	const built = strings.reduce(
		(text, part, index) =>
			index === 0 ? part : `${text}${pathSegmentOf(values[index - 1] ?? '')}${part}`,
		'',
	);
	if (!isRequestPath(built)) throw new UserError(`The path ${built} must start with one "/"`);
	return built;
}

/**
 * `url` is an absolute http or https URL. `path` starts with one `/` and goes after the base
 * URL. The host must be in the egress of the action and in the hosts of the credential.
 */
export type HttpRequest = HttpRequestOptions &
	(
		| {
				/** An absolute http or https URL, e.g. a `next` link of the API. */
				readonly url: string;
				readonly path?: never;
		  }
		| {
				/** The path after the base URL, e.g. path`/pages/${id}`. Only `path` makes one. */
				readonly path: EncodedPath;
				readonly url?: never;
		  }
	);

/** An HTTP client with the node's credential already applied. A non-2xx response throws an `HttpError`. */
export interface Http {
	/**
	 * Sends the request with the credential. With `response: 'binary'` the body goes to the n8n
	 * binary data store, and the result is its `Binary`.
	 *
	 * @example
	 * ```ts
	 * const page = await http.request({ path: path`/pages/abc` });
	 * const file = await http.request({ url: fileUrl, response: 'binary' });
	 * ```
	 */
	request(request: HttpRequest & BinaryResponse): Promise<Binary>;
	/**
	 * Sends the request with the credential, and gives the parsed JSON body. The host retries
	 * a 429, 502, 503, 504, or a dropped connection when the request is idempotent.
	 */
	request(request: HttpRequest): Promise<unknown>;
}

/** A request whose response body goes to the n8n binary data store. */
interface BinaryResponse {
	/** `binary`: the result is the `Binary` of the stored body. */
	readonly response: 'binary';
	/** A binary response gives the `Binary`, not the full response. */
	readonly fullResponse?: false;
}

/** The error `http.request` throws for a non-2xx response. */
export interface HttpError extends Error {
	/** The HTTP status code, e.g. `404`. */
	readonly status: number;
	/** Header names are lower case, e.g. `retry-after`. */
	readonly headers: Readonly<Record<string, string>>;
	/** The response body, e.g. the JSON error of the API. */
	readonly body: unknown;
}

/**
 * True when `error` is the `HttpError` of a non-2xx response, e.g. to map a 404 to an empty
 * result.
 *
 * @example
 * ```ts
 * try {
 *   return await http.request({ path: path`/pages/${input.page}` });
 * } catch (error) {
 *   if (isHttpError(error) && error.status === 404) return { found: false };
 *   throw error;
 * }
 * ```
 */
// A property check, not `instanceof`: a frozen bundle has its own copy of the SDK.
export const isHttpError = (error: unknown): error is HttpError =>
	error instanceof Error &&
	'status' in error &&
	typeof error.status === 'number' &&
	'headers' in error &&
	typeof error.headers === 'object' &&
	error.headers !== null &&
	'body' in error;

/** What `next` knows about the page besides its body. */
export interface PageState<T> {
	/** The items of the page, before the limit cuts them. */
	readonly items: readonly T[];
	/** The cursor that the request of the page sent; undefined for the first page. */
	readonly cursor?: string;
	/** The limit minus the items before the page; undefined without a limit. */
	readonly room?: number;
}

/** How `pages` reads a paged API in code: the request of a page, its items, and its next cursor. */
export interface PagesOptions<P, T> {
	/**
	 * The schema of one response, or a function that checks a response and gives the page, e.g.
	 * after an in-band error check. `items` and `next` read the page it gives.
	 */
	readonly page: Schema<P, boolean, boolean, unknown> | ((response: unknown) => P);
	/**
	 * The request for one page. `cursor` is undefined for the first page. `room` is the limit
	 * minus the items so far, e.g. for a page size parameter.
	 */
	request(cursor: string | undefined, room: number | undefined): HttpRequest;
	/** The items of one page, e.g. `(page) => page.results`. */
	items(page: P): readonly T[];
	/** The cursor of the next page. A missing, null or empty cursor ends the list. */
	next(page: P, state: PageState<T>): string | number | null | undefined;
	/** The most items to yield, e.g. `limitOf(input.paging)`. No limit when omitted. */
	readonly limit?: number;
	/**
	 * The most pages to request.
	 *
	 * @defaultValue `Infinity`
	 */
	readonly maxPages?: number;
}

/**
 * Yields the items of each page in order. It reads each response once, as `page` gives it. A
 * schema page fails only when a field that `items` or `next` reads does not match, with its path,
 * e.g. `page.results: must be array`; the other fields of the page can change. It stops at
 * `limit` items, after `maxPages` pages, at a page without a next cursor, and at a cursor it
 * already sent, so an API that repeats a cursor cannot loop. The host request limit also
 * applies. It is a helper, not a host method: it inlines into each bundle. A `list` binding
 * with `pages` does the same with no code.
 *
 * @example
 * ```ts
 * yield* pages(http, {
 *   page: t.obj({ results: t.arr(t.obj({ id: t.str() })), next_cursor: t.nullable(t.str()) }),
 *   request: (cursor) => ({ path: path`/search`, query: { start_cursor: cursor } }),
 *   items: (page) => page.results,
 *   next: (page) => page.next_cursor,
 *   limit: limitOf(input.paging),
 * });
 * ```
 */
export async function* pages<P, T>(
	http: Http,
	{ page: reader, request, items, next, limit, maxPages = Infinity }: PagesOptions<P, T>,
): AsyncGenerator<T, void, undefined> {
	// `for...of` also visits the pages the loop appends: one request per page.
	const queue: Array<{ readonly cursor?: string; readonly emitted: number }> = [{ emitted: 0 }];
	for (const { cursor, emitted } of queue) {
		const room = limit === undefined ? undefined : limit - emitted;
		const response = await http.request(request(cursor, room));
		// Not `instanceof Schema`: a frozen bundle has its own copy of the SDK.
		const page =
			typeof reader === 'function'
				? reader(response)
				: readAs(reader, response, {
						path: 'page',
						read: (value) => next(value, { items: items(value), cursor, room }),
					}).value;
		const all = items(page);
		const kept = all.slice(0, room);
		yield* kept;
		const found = next(page, { items: all, cursor, room });
		const nextCursor = found === null || found === undefined ? '' : String(found);
		const count = emitted + kept.length;
		const sent = queue.some((entry) => entry.cursor === nextCursor);
		if (nextCursor && !sent && queue.length < maxPages && (limit === undefined || count < limit)) {
			queue.push({ cursor: nextCursor, emitted: count });
		}
	}
}

/**
 * The list input of every action that lists: all items, or at most `max`. A `list` binding with
 * `pages` gets it, and the host applies it. A `run()` action declares it and reads `limitOf`.
 *
 * @defaultValue `{ mode: 'limit', max: 50 }`
 * @example
 * ```ts
 * input: { query: t.str(), paging },
 * async *run({ input, http }) {
 *   const limit = limitOf(input.paging); // undefined for all items
 *   yield* pages(http, { page, request, items, next, limit });
 * },
 * ```
 */
export const paging = t
	.variant('mode', {
		all: {},
		limit: { max: t.int().with({ minimum: 1 }) },
	})
	.default({ mode: 'limit', max: 50 });

/** The item limit of `paging` for `pages`: undefined for all items. @see {@link paging} */
export const limitOf = (value: Infer<typeof paging>) =>
	value.mode === 'limit' ? value.max : undefined;

/**
 * The next offset of an offset list: the count of items so far (`item`), or the next page number
 * (`page`; the first page is `start`, default 1). A page with no items, or with fewer items than
 * the page size, is the last one. `cursor` is the offset that the page sent.
 */
export function nextOffsetOf(
	unit: 'item' | 'page',
	page: {
		/** The count of items on this page. */
		readonly count: number;
		/** The page size that the request asked for. */
		readonly size?: number;
		/** The offset or page number that the request of this page sent. */
		readonly cursor?: string;
		/**
		 * The number of the first page, for `page`.
		 *
		 * @defaultValue `1`
		 */
		readonly start?: number;
	},
): number | undefined {
	if (page.count === 0 || (page.size !== undefined && page.count < page.size)) return undefined;
	if (unit === 'item') return Number(page.cursor ?? 0) + page.count;
	return Number(page.cursor ?? page.start ?? 1) + 1;
}

/**
 * The `rel="next"` URL of a `Link` header (RFC 8288), e.g. of the GitHub API. A relative URL
 * counts only with `base`; the caller resolves it.
 */
export const nextLinkOf = (link: string | undefined, base?: string): string | undefined =>
	link
		?.split(',')
		.map((part) => /<([^>]+)>\s*;(?:.*;)?\s*rel="?next"?\s*$/.exec(part)?.[1])
		.find((url) => url !== undefined && URL.canParse(url, base));

/** The input `run()` gets. Each default is filled in at any depth, so a defaulted field is set. */
export type RunInput<S extends Shape> = RunFieldsOf<S>;

/** The level of a `log` message. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Safety limits for one `run()` call. The defaults are far above normal use. */
export interface RunLimits {
	/**
	 * The most HTTP requests of one run. A page is one request. The run fails at the limit.
	 *
	 * @defaultValue `10000`
	 */
	readonly maxRequests: number;
	/**
	 * The most output items of one run. The run fails at the limit.
	 *
	 * @defaultValue `1000000`
	 */
	readonly maxItems: number;
}

/** The `RunLimits` of a host that sets none. */
export const DEFAULT_RUN_LIMITS: RunLimits = { maxRequests: 10_000, maxItems: 1_000_000 };

/** Creates files in the n8n binary data store. */
export interface Binaries {
	/** The chunks go to the store as the action yields them, so a large file never sits in memory. */
	create(
		meta: Omit<BinaryMeta, 'bytes'>,
		chunks: AsyncIterable<Uint8Array | string> | Iterable<Uint8Array | string>,
	): Promise<Binary>;
}

/**
 * One field per host import of the action interface in `spec/wit/action.wit`.
 *
 * @see `spec/wit/action.wit`
 */
export interface RunHost {
	/** The HTTP client, with the credential and the egress of the action applied. */
	readonly http: Http;
	/** Writes to the n8n log with the node name. Do not log credentials or personal data. */
	log(level: LogLevel, message: string): void;
	/** The limits the host enforces for this run. */
	readonly limits: RunLimits;
	/**
	 * Binary data (Node Contract 2.2.0). Only an action with a `t.binary()` field gets it: the
	 * field makes its bundle target 2.2.0, so an older host refuses the bundle.
	 */
	readonly binary: Binaries;
}

/** The context of a `per-item` or `1:N` run: the host imports, `input`, and the current item. */
export interface RunContext<Input> extends RunHost {
	/** Parameters for the current item, expressions resolved, defaults filled in, and validated. */
	readonly input: Input;
	/** The current input item. */
	readonly item: InputItem;
}

/** The context of a `batch` run: the host imports, `input`, and all input items. */
export interface BatchContext<Input> extends RunHost {
	/** Parameters read once, at the first item, with defaults filled in, and validated. */
	readonly input: Input;
	/** All input items, in order. */
	readonly items: readonly InputItem[];
}

/** The run context of a cardinality: `BatchContext` for `batch`, else `RunContext`. */
export type ContextOf<C extends ActionFlow['cardinality'], Input> = C extends 'batch'
	? BatchContext<Input>
	: RunContext<Input>;

/**
 * The named inputs of an action that joins item streams, in n8n input order, e.g.
 * `['left', 'right']`. Only a `batch` action has them.
 */
export type ActionInputs = readonly [string, string, ...string[]];

/** The context of a run with named inputs: the items of each input, and the parameters once. */
export interface InputsContext<Input, Name extends string> extends RunHost {
	/** Parameters read once, at the first item of the first input, and validated. */
	readonly input: Input;
	/** The items of each input, in order. An input without a connection has no items. */
	readonly inputs: { readonly [K in Name]: readonly InputItem[] };
}

/** The run context for the cardinality and the named inputs of an action. */
export type RunContextOf<
	C extends ActionFlow['cardinality'],
	Input,
	Ins extends ActionInputs | undefined,
> = Ins extends ActionInputs ? InputsContext<Input, Ins[number]> : ContextOf<C, Input>;

// ── Host imports of Node Contract 2.3.0 ──────────────────────────────────────────

/** The type of a data table column. */
export type DataTableColumnType = 'string' | 'number' | 'boolean' | 'date';

/** A cell value. A date cell is an ISO 8601 string. */
export type DataTableValue = string | number | boolean | null;

/** A column of a data table. */
export interface DataTableColumn {
	/** The column name, unique in its table. */
	readonly name: string;
	/** The type of each cell of the column. */
	readonly type: DataTableColumnType;
}

/** A table by its ID, or by its name in the project of the workflow. */
export type DataTableRef =
	| {
			/** The table ID. */
			readonly id: string;
			readonly name?: never;
	  }
	| {
			/** The table name in the project of the workflow. */
			readonly name: string;
			readonly id?: never;
	  };

/** A comparison of a data table filter. `ilike` is `like` without case. */
export type DataTableOperator =
	| 'eq'
	| 'neq'
	| 'like'
	| 'ilike'
	| 'gt'
	| 'gte'
	| 'lt'
	| 'lte'
	| 'isEmpty'
	| 'isNotEmpty';

/** `isEmpty` and `isNotEmpty` take no value; every other operator takes one. */
export type DataTableCondition =
	| {
			/** The column to compare. */
			readonly column: string;
			/** The comparison. */
			readonly op: Exclude<DataTableOperator, 'isEmpty' | 'isNotEmpty'>;
			/** The value to compare the cell with. */
			readonly value: DataTableValue;
	  }
	| {
			/** The column to check. */
			readonly column: string;
			/** The check for an empty or a set cell. */
			readonly op: 'isEmpty' | 'isNotEmpty';
	  };

/**
 * The rows that a data table call reads or changes.
 *
 * @example
 * ```ts
 * const filter: DataTableFilter = { match: 'all', conditions: [{ column: 'email', op: 'eq', value: email }] };
 * ```
 */
export interface DataTableFilter {
	/** `all`: a row matches every condition. `any`: a row matches one condition or more. */
	readonly match: 'all' | 'any';
	/** The conditions on the columns. */
	readonly conditions: readonly DataTableCondition[];
}

/** A stored row: the system columns `id`, `createdAt` and `updatedAt`, and one value per column. */
export type DataTableRow = {
	/** The row ID that the table gives. */
	readonly id: number;
	/** When the row was made, as ISO 8601 text. */
	readonly createdAt: string;
	/** When the row last changed, as ISO 8601 text. */
	readonly updatedAt: string;
} & Readonly<Record<string, DataTableValue>>;

/** The cell values of a row by column name, without the system columns. */
export type DataTableValues = Readonly<Record<string, DataTableValue>>;

/** One page of rows of a data table. */
export interface DataTableQuery {
	/** The rows to read. All rows when omitted. */
	readonly filter?: DataTableFilter;
	/** The order of the rows. */
	readonly sort?: {
		/** The column to sort by. */
		readonly column: string;
		/** `asc` for ascending, `desc` for descending. */
		readonly direction: 'asc' | 'desc';
	};
	/**
	 * The count of rows to skip.
	 *
	 * @defaultValue `0`
	 */
	readonly offset?: number;
	/** The most rows of one page. */
	readonly limit: number;
}

/** One table. The host converts a date cell to and from ISO 8601 text. */
export interface DataTable {
	/** The table ID. */
	readonly id: string;
	/** The columns in table order. */
	columns(): Promise<readonly DataTableColumn[]>;
	/** One page of rows, and the count of all rows that the filter matches. */
	rows(query: DataTableQuery): Promise<{
		/** The count of all rows that the filter matches. */
		readonly count: number;
		/** The rows of this page. */
		readonly rows: readonly DataTableRow[];
	}>;
	/** Inserts the rows in one write and gives them back with their system columns. */
	insert(rows: readonly DataTableValues[]): Promise<readonly DataTableRow[]>;
	/** Sets `values` on each row that the filter matches, and gives the changed rows. */
	update(filter: DataTableFilter, values: DataTableValues): Promise<readonly DataTableRow[]>;
	/** `update`, or one new row with `values` when the filter matches no row. */
	upsert(filter: DataTableFilter, values: DataTableValues): Promise<readonly DataTableRow[]>;
	/** Deletes each row that the filter matches, and gives the deleted rows. */
	delete(filter: DataTableFilter): Promise<readonly DataTableRow[]>;
	/** Deletes every row, and gives how many it deleted. */
	clear(): Promise<number>;
	/** True when the table has the new name. */
	rename(name: string): Promise<boolean>;
	/** Deletes the table and its rows. True when it is gone. */
	drop(): Promise<boolean>;
}

/** A table of the project, without its rows. Dates are ISO 8601 text. */
export interface DataTableInfo {
	/** The table ID. */
	readonly id: string;
	/** The table name, unique in the project. */
	readonly name: string;
	/** The columns in table order. */
	readonly columns: readonly DataTableColumn[];
	/** When the table was made. */
	readonly createdAt: string;
	/** When the table last changed. */
	readonly updatedAt: string;
}

/** One page of the data tables of the project. */
export interface DataTableListQuery {
	/** Tables whose name matches, without case. */
	readonly name?: string;
	/** The order of the tables. */
	readonly sort?: {
		/** The field to sort by. */
		readonly by: 'name' | 'createdAt' | 'updatedAt';
		/** `asc` for ascending, `desc` for descending. */
		readonly direction: 'asc' | 'desc';
	};
	/**
	 * The count of tables to skip.
	 *
	 * @defaultValue `0`
	 */
	readonly offset?: number;
	/** The most tables of one page. */
	readonly limit: number;
}

/** The n8n data tables of the project that owns the workflow. */
export interface DataTables {
	/**
	 * The table by ID or by name. It fails when the project has no such table.
	 *
	 * @example
	 * ```ts
	 * const table = await dataTables.open({ name: 'Leads' });
	 * const { rows } = await table.rows({ limit: 10 });
	 * ```
	 */
	open(table: DataTableRef): Promise<DataTable>;
	/** One page of tables, and the count of all tables that the query matches. */
	list(query: DataTableListQuery): Promise<{
		/** The count of all tables that the query matches. */
		readonly count: number;
		/** The tables of this page. */
		readonly tables: readonly DataTableInfo[];
	}>;
	/** A new table with the columns in this order. */
	create(table: {
		/** The table name, unique in the project. */
		readonly name: string;
		/** The columns in table order. */
		readonly columns: readonly DataTableColumn[];
	}): Promise<DataTableInfo>;
}

/** User code for the n8n task runner. */
export interface CodeRequest {
	/** The language of `code`. The host refuses a language that the instance does not run. */
	readonly language: 'javascript' | 'python';
	/** The code, as a user writes it in the Code node. */
	readonly code: string;
	/** `all`: one run that reads every input item. `each`: one run for each input item. */
	readonly mode: 'all' | 'each';
}

/**
 * User code in the n8n task runner. The code reads the input items of the node with `$input`,
 * as in the Code node. The runner has no network access.
 */
export interface CodeRunner {
	/**
	 * What the code returns, not checked: for `all`, its return value; for `each`, a list with
	 * the return value for each input item, in order. A code error throws.
	 */
	run(request: CodeRequest): Promise<unknown>;
}

/** Lets a run wait until a time. The host can suspend the execution in the meantime. */
export interface Wait {
	/**
	 * The outputs of this run continue at `at`, not before. The host can suspend the execution
	 * after the run, so do no more work after the call.
	 */
	until(at: Date): Promise<void>;
}

/**
 * The optional host imports of Node Contract 2.3.0. An action lists the ones it uses in
 * `imports`, its run context gets only those, and its bundle targets 2.3.0.
 */
export interface HostImports<Input> {
	/** The n8n data tables of the project. Import name: `dataTables`. */
	readonly dataTables: DataTables;
	/** User code in the n8n task runner. Import name: `code`. */
	readonly code: CodeRunner;
	/** A wait until a time. Import name: `wait`. */
	readonly wait: Wait;
	/** The parameters of an input item of a `batch` run, resolved and validated for that item. */
	inputOf(item: InputItem): Promise<Input>;
}

/** The name of an optional host import, for the `imports` list of an action. */
export type HostImport = keyof HostImports<unknown>;

/**
 * The context fields of the declared host imports. Any action can be typed as `Action`, so its
 * wide form has each import as optional.
 */
export type ImportsOf<Im extends readonly HostImport[], Input> = readonly HostImport[] extends Im
	? Partial<HostImports<Input>>
	: Pick<HostImports<Input>, Im[number]>;

/** What `run()` gives back. The host validates each output item and sets its lineage. */
export type RunResult<C extends ActionFlow['cardinality'], E> = C extends '1:N'
	? AsyncIterable<E>
	: C extends 'batch'
		? Iterable<E> | AsyncIterable<E>
		: Promise<E>;

/** A field of the resource an action reads (a Notion property, a sheet column), as a host lookup lists it. */
export interface ResourceField {
	/** The field name, e.g. the Notion property name. */
	readonly name: string;
	/** What the lookup tells about the field, e.g. its type. The lookup sets the format. */
	readonly value: string | number | boolean;
}

/** A value in a request description: a literal, or the input field `{ input: 'page' }`. */
export type RequestValue<Input> =
	| string
	| number
	| boolean
	| {
			/** The input field whose value the host sends. */
			readonly input: keyof Input & string;
	  };

type PathFields<P extends string> = P extends `${string}{${infer Field}}${infer Rest}`
	? Field | PathFields<Rest>
	: never;

type RequiredKeys<T> = {
	[K in keyof T]-?: Record<never, never> extends Pick<T, K> ? never : K;
}[keyof T] &
	string;

/**
 * `P` when each `{field}` in it names a required input field, else the message the type error
 * shows. An optional field could leave the segment empty and send the request to another URL.
 */
export type RequestPath<P extends string, Input> = [
	Exclude<PathFields<P>, RequiredKeys<Input>>,
] extends [never]
	? P
	: `Path field is not a required input field: ${Exclude<PathFields<P>, RequiredKeys<Input>>}`;

/** `api.example.com`, or `*.example.com` for its subdomains only: the `isDomainAllowed` syntax. */
const HOST_PATTERN = /^(\*\.)?([a-z0-9-]+\.)*[a-z0-9-]+$/;

export const isHostPattern = (value: string) => HOST_PATTERN.test(value);

/** Required input keys whose value is one string of a fixed set. */
type EnumKeys<Input> = {
	[K in RequiredKeys<Input>]: Input[K] extends string
		? string extends Input[K]
			? never
			: K
		: never;
}[RequiredKeys<Input>];

/** Required input keys with a string value. Any string key when the input is not known. */
type UrlKeys<Input> = string extends keyof Input
	? string
	: { [K in RequiredKeys<Input>]: Input[K] extends string ? K : never }[RequiredKeys<Input>];

/**
 * `H` when each `{field}` in it names a required enum input field, so the host set is finite,
 * else the message the type error shows.
 */
export type EgressHost<H extends string, Input> = H extends string
	? [Exclude<PathFields<H>, EnumKeys<Input>>] extends [never]
		? H
		: `Host field is not a required enum input field: ${Exclude<PathFields<H>, EnumKeys<Input>>}`
	: never;

/**
 * The hosts an action may send requests to. Without it, the hosts of the base URLs of the node
 * and of the credential. The host refuses a request to any other host.
 */
export interface Egress<Input, H extends string = string> {
	/**
	 * `api.example.com`, `*.example.com` for its subdomains only, or a template over enum input
	 * fields, e.g. `{region}.api.example.com`. The base URL hosts stay allowed.
	 */
	readonly hosts?: ReadonlyArray<H & EgressHost<H, Input>>;
	/** An input field with an absolute URL, e.g. `url`: the action may send requests to its host. */
	readonly fromInput?: UrlKeys<Input>;
}

/**
 * A function of the item input. Method syntax keeps its parameter bivariant, so an action with
 * its own input still fits the wide `Action` type.
 */
type FromInput<Input, T> = {
	/** Computes the value from the item input. */
	of(input: Input): T;
}['of'];

/** The declarative binding: data that says which request the host sends for each item. */
export interface RequestBinding<Input, P extends string = string> {
	/**
	 * The HTTP method.
	 *
	 * @defaultValue `'GET'`
	 */
	readonly method?: HttpMethod;
	/** After the node's `baseUrl`. `{field}` is the URL-encoded input field, e.g. `/pages/{page}`. */
	readonly path: P & `/${string}` & RequestPath<P, Input>;
	/** Values by parameter name, or a function of the input for values that need code. */
	readonly query?:
		| Readonly<Record<string, RequestValue<Input>>>
		| FromInput<Input, HttpRequest['query']>;
	/** Request headers, or a function of the input. The host adds the credential. */
	readonly headers?:
		| Readonly<Record<string, string>>
		| FromInput<Input, Readonly<Record<string, string>>>;
	/** The JSON body fields, e.g. `{ archived: true, parent: { input: 'parent' } }`. */
	readonly body?: Readonly<Record<string, RequestValue<Input>>>;
}

/** Where the host sends a page value: a query parameter or a field of the JSON body. */
export type PageParam =
	| {
			/** The query parameter name, e.g. `start_cursor`. */
			readonly query: string;
			readonly body?: never;
	  }
	| {
			/** The JSON body field name, e.g. `start_cursor`. */
			readonly body: string;
			readonly query?: never;
	  };

/** The page size parameter, and the most items the API gives in one page. */
export type PageSize = PageParam & {
	/**
	 * The largest page size that the API takes. The host sends it, or less near the `paging`
	 * limit unless the list counts pages.
	 */
	readonly max: number;
};

/**
 * How the host gets the next page of a `list` binding.
 * - `cursor`: `next` reads the cursor from the page, and the host sends it in `send`.
 * - `link`: the host follows the `rel="next"` URL of the `Link` header (RFC 8288).
 * - `offset`: the host sends the count of items so far (`unit: 'item'`), or the page number
 *   (`unit: 'page'`), in `send`, see `nextOffsetOf`. `items` must give one output per API item.
 * The first request never sends a cursor. A repeated cursor ends the list.
 */
export type Pages<Page> =
	| {
			/** The page gives the cursor of the next page. */
			readonly style: 'cursor';
			/** The cursor of the next page. A missing, null or empty cursor ends the list. */
			next(page: Page): string | number | null | undefined;
			/** Where the host sends the cursor. */
			readonly send: PageParam;
			/** Where the host sends the page size. */
			readonly size?: PageSize;
	  }
	| {
			/** The `rel="next"` URL of the `Link` header gives the next page. */
			readonly style: 'link';
			/** Where the host sends the page size. */
			readonly size?: PageSize;
	  }
	| ({
			/** The host counts items or pages and sends the next offset. */
			readonly style: 'offset';
			/** Where the host sends the offset. */
			readonly send: PageParam;
			/** Where the host sends the page size. A short page ends the list. */
			readonly size?: PageSize;
	  } & (
			| {
					/** The offset is the count of items so far. */
					readonly unit: 'item';
					readonly start?: never;
			  }
			| {
					/** The offset is the page number. */
					readonly unit: 'page';
					/**
					 * The number of the first page.
					 *
					 * @defaultValue `1`
					 */
					readonly start?: number;
			  }
	  ));

/**
 * The declarative list of a `1:N` action: the host sends the request, checks each page against
 * `response`, and emits what `items` gives. With `pages`, the host loops over the pages, and the
 * action gets the `paging` input, which the host applies.
 */
export interface ListBinding<Input, P extends string, R extends AnySchema, Out>
	extends RequestBinding<Input, P> {
	/**
	 * The schema of one response body. A page fails with its path when a field that `items` or
	 * the cursor reads does not match. The host warns about the other fields.
	 */
	readonly response: R;
	/** The outputs of one page, e.g. `(page) => page.results`. */
	items(page: Infer<R>, input: Input): readonly Out[];
	/** Without it, the list is one request. */
	readonly pages?: Pages<Infer<R>>;
}

/** `never` unless the cardinality is `C`: a `request` is per item, and a `list` is `1:N`. */
type Only<Cardinality, C> = Cardinality extends C ? unknown : never;

/**
 * How the action runs: code (`run`), one request per item that the host sends (`request`), a
 * list the host pages through (`list`), or a legacy node (`native`), as a native trigger
 * does.
 */
export type ActionBinding<
	Full extends Shape,
	O extends AnySchema,
	F extends ActionFlow,
	P extends string,
	Outs extends ActionOutputs | undefined,
	Im extends readonly HostImport[] = readonly HostImport[],
	Ins extends ActionInputs | undefined = ActionInputs | undefined,
	R extends AnySchema = AnySchema,
	Cr = unknown,
> =
	| {
			/** `flow.cardinality` sets how often it runs and what it gives back, see `RunResult`. */
			run(
				context: RunContextOf<F['cardinality'], RunInput<Full>, Ins> &
					ImportsOf<Im, RunInput<Full>> & {
						/** The credential type of the run and its fields. `run()` never gets a secret. */
						readonly credential: Cr;
					},
			): RunResult<F['cardinality'], Emit<F['cardinality'], Infer<O>, Outs>>;
			readonly request?: never;
			readonly list?: never;
			readonly native?: never;
	  }
	| {
			/**
			 * One request per item, which the host sends. The response body is the output item.
			 * Only a `per-item` action has it.
			 *
			 * @example
			 * ```ts
			 * request: { method: 'GET', path: '/pages/{page}' },
			 * ```
			 */
			readonly request: RequestBinding<RunInput<Full>, P> & Only<F['cardinality'], 'per-item'>;
			readonly run?: never;
			readonly list?: never;
			readonly native?: never;
			// The response goes to the only output.
			readonly outputs?: never;
			readonly imports?: never;
			readonly inputs?: never;
	  }
	| {
			/**
			 * A list that the host requests and pages through. Only a `1:N` action has it.
			 *
			 * @example
			 * ```ts
			 * list: {
			 *   path: '/users',
			 *   response: t.obj({ users: t.arr(user) }),
			 *   items: (page) => page.users,
			 *   pages: { style: 'link' },
			 * },
			 * ```
			 */
			readonly list: ListBinding<RunInput<Full>, P, R, Infer<O>> & Only<F['cardinality'], '1:N'>;
			readonly run?: never;
			readonly request?: never;
			readonly native?: never;
			readonly outputs?: never;
			readonly imports?: never;
			readonly inputs?: never;
	  }
	| {
			/** The legacy node that runs the action. The contract types its parameters. */
			readonly native: NativeNode;
			readonly run?: never;
			readonly request?: never;
			readonly list?: never;
			readonly imports?: never;
			readonly inputs?: never;
	  };

interface ContractSpec<Own extends Shape, O extends AnySchema, Sc extends string> {
	/**
	 * Integer major. It is the n8n `typeVersion`. Bump it for a breaking contract change.
	 *
	 * @defaultValue `1`
	 */
	readonly version?: number;
	/**
	 * Bump for an additive contract change. Freeze computes the patch from the bundle.
	 *
	 * @defaultValue `0`
	 */
	readonly minor?: number;
	/** One sentence for agents and search, at most 120 characters. */
	readonly summary: string;
	/** The scopes of the node's credential that this contract needs. */
	readonly scopes?: readonly Sc[];
	/**
	 * The parameters, one schema per field, e.g. `{ page: t.str(), archived: t.bool().default(false) }`.
	 * A resource adds its own input to it.
	 */
	readonly input: Own;
	/** The schema of each output item, on every output. */
	readonly output: O;
	/**
	 * Pure hatch on a new major: the parameters of an older major in, the parameters of this
	 * major out. No I/O. Fixture pairs replay it.
	 */
	migrate?(fromMajor: number, params: Readonly<Record<string, unknown>>): Record<string, unknown>;
}

interface ActionSpecBase<
	Own extends Shape,
	Full extends Shape,
	O extends AnySchema,
	F extends ActionFlow,
	Sc extends string,
	Outs extends ActionOutputs | undefined,
	H extends string,
	Im extends readonly HostImport[],
	Ins extends ActionInputs | undefined,
> extends ContractSpec<Own, O, Sc> {
	/** The label users pick, e.g. "Get many database pages". */
	readonly action: string;
	/**
	 * What the action does to the item stream.
	 *
	 * @example
	 * ```ts
	 * flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	 * ```
	 */
	readonly flow: F;
	/**
	 * More hosts the action may send requests to. Without it, only the base URL hosts.
	 *
	 * @see `docs/sandboxed-execution.md`
	 */
	readonly egress?: Egress<RunInput<Full>, H>;
	/** Named outputs. An input list can name them, e.g. one output per Switch case. */
	readonly outputs?: Outs;
	/** The optional host imports `run()` uses. Each one is a permission, as a scope is. */
	readonly imports?: Im;
	/** Named inputs, for an action that joins item streams. */
	readonly inputs?: Ins;
	/**
	 * Pure hatch: the output shape for these parameters (fields a filter guarantees, fields a
	 * mapping creates). Leaves other than discriminators may still be expression strings.
	 */
	deriveOutput?(input: ObjectOf<Full>): JsonSchema;
	/**
	 * The output from the fields of the resource that an input field names. The contract
	 * document holds the pointer as `output['x-n8n-resource']`, so a builder can list the fields
	 * with the node's credential. Without fields, the builder keeps `deriveOutput`.
	 *
	 * @example
	 * ```ts
	 * resourceOutput: {
	 *   method: 'notion.dataSourceProperties',
	 *   input: 'database',
	 *   loadOptions: [{ nodeType: 'n8n-nodes-base.notion', version: 3, methodName: 'getFilterProperties',
	 *     parameters: { resource: 'databasePage', operation: 'getAll' }, idParameter: 'dataSourceId' }],
	 *   toOutput: outputFromProperties,
	 * },
	 * ```
	 */
	readonly resourceOutput?: ResourcePointer<keyof Full & string> & {
		/** Pure hatch: the output schema from the fields and the parameters. No I/O. */
		toOutput(fields: readonly ResourceField[], input: ObjectOf<Full>): JsonSchema;
	};
}

/** What an author writes for one action. `Own` is its own input; `Full` adds the resource input. */
export type ActionSpec<
	Own extends Shape,
	Full extends Shape,
	O extends AnySchema,
	F extends ActionFlow,
	Sc extends string = string,
	P extends string = string,
	Outs extends ActionOutputs | undefined = undefined,
	H extends string = string,
	Im extends readonly HostImport[] = readonly HostImport[],
	Ins extends ActionInputs | undefined = ActionInputs | undefined,
	R extends AnySchema = AnySchema,
	Cr = unknown,
> = ActionSpecBase<Own, Full, O, F, Sc, Outs, H, Im, Ins> &
	ActionBinding<Full, O, F, P, Outs, Im, Ins, R, Cr>;

/** What every contract has after its node built it. */
interface Built {
	/** The node definition that built the contract. */
	readonly node: NodeDefinition;
	/** `<node>.<resource>.<operation>` or `<node>.<operation>`, e.g. `notion.databasePage.getAll`. */
	readonly id: string;
	/** The resource name, when a resource built the contract. */
	readonly resource?: string;
	/** The operation, or the trigger event. */
	readonly operation: string;
	/** The major: `version` of the spec, or 1. */
	readonly version: number;
	/** The JSON Schema of the full input, the resource input included. */
	readonly inputSchema: JsonSchema;
	/** The names of the credential types of the node. */
	readonly credentialTypes: readonly string[];
	/** The scopes that the contract needs. Empty when it needs none. */
	readonly scopes: readonly string[];
}

/**
 * A built action: its spec and what its node adds (`id`, `inputSchema`, …). Use it to
 * type any action, e.g. in a list of actions.
 */
export type Action<
	S extends Shape = Shape,
	O extends AnySchema = AnySchema,
	F extends ActionFlow = ActionFlow,
	Outs extends ActionOutputs | undefined = ActionOutputs | undefined,
	Im extends readonly HostImport[] = readonly HostImport[],
	Ins extends ActionInputs | undefined = ActionInputs | undefined,
> = ActionSpec<S, S, O, F, string, string, Outs, string, Im, Ins> & Built;

type TriggerHead<Own extends Shape, O extends AnySchema, Sc extends string> = ContractSpec<
	Own,
	O,
	Sc
> & {
	/** The label users pick, e.g. "On page added to database". */
	readonly trigger: string;
};

type WebhookSource<I, Out, K extends string> = {
	/**
	 * The service calls a webhook URL of n8n.
	 *
	 * @see {@link WebhookConfig}
	 */
	readonly webhook: WebhookConfig<I, Out, K>;
	readonly poll?: never;
	readonly native?: never;
};

/**
 * Without `emit`, the item is the request. So a trigger whose output is not the request shape
 * must map the request in `emit`.
 */
type EmitRule<I, Out> = WebhookRequest extends Out
	? unknown
	: {
			/** A webhook whose items are not the request. */
			readonly webhook: {
				/** Maps the request to the output items. */
				emit(request: WebhookRequest, input: I): readonly Out[];
			};
		};

type PollSource<I, T, Out, P = unknown> = {
	/**
	 * n8n polls the service on the Poll Times of the node.
	 *
	 * @see {@link PollConfig}
	 */
	readonly poll: PollConfig<I, T, Out, P>;
	readonly webhook?: never;
	readonly native?: never;
};

/** A legacy node that runs a contract. The contract types its parameters and its items. */
export interface NativeNode {
	/** The n8n node type, e.g. `n8n-nodes-base.webhook`. */
	readonly type: string;
	/** The node version that the contract types. */
	readonly version: number;
}

/** What starts a native trigger. `poll`: n8n polls with the legacy node on its Poll Times. */
export type NativeEvent = 'manual' | 'schedule' | 'webhook' | 'form' | 'poll';

/**
 * The step that answers the caller of a native trigger, e.g. Respond to Webhook or a form page.
 * The caller waits for it when the trigger field `awaits.field` is `awaits.value`, and the build
 * checks that the flow has the step exactly then. Without `awaits` the step always belongs to the
 * trigger, and the build checks that the trigger comes before it.
 */
export interface TriggerReply<Field extends string = string> {
	/** The factory name next to the trigger, e.g. `respond`. */
	readonly operation: string;
	/** The label users pick, e.g. "Respond to Webhook". */
	readonly action: string;
	/** One sentence for agents and search, at most 120 characters. */
	readonly summary: string;
	/**
	 * The parameters of the reply node: fields, or one `variant` when the fields depend on a
	 * tag, e.g. `respondWith`. The node keeps the tag and the fields flat, as a variant does.
	 */
	readonly input: Shape | AnySchema;
	/** The legacy node of the reply, e.g. `n8n-nodes-base.respondToWebhook`. */
	readonly native: NativeNode;
	/** The trigger field value that makes the caller wait for the reply. */
	readonly awaits?: {
		/** The trigger field, e.g. `responseMode`. */
		readonly field: Field;
		/** The value of the field, e.g. `responseNode`. */
		readonly value: string;
	};
	/** Each output item. Without it the step passes its items on. */
	readonly output?: AnySchema;
}

/**
 * A trigger that a legacy node runs, because n8n treats the node type in a special way
 * (test URLs, form pages, schedules, manual runs). The input is the node's parameters.
 */
type NativeSource<Field extends string> = {
	/** The legacy node that runs the trigger, and what starts it. */
	readonly native: NativeNode & {
		/** What starts the trigger. */
		readonly on: NativeEvent;
	};
	/** The step that answers the caller, e.g. Respond to Webhook. */
	readonly reply?: TriggerReply<Field>;
	readonly webhook?: never;
	readonly poll?: never;
};

/** What an author writes for one trigger: a webhook the service calls, a poll, or a native node. */
export type TriggerSpec<
	Own extends Shape,
	Full extends Shape,
	O extends AnySchema,
	Sc extends string = string,
	K extends string = string,
	T = unknown,
	P = unknown,
> = TriggerHead<Own, O, Sc> &
	(
		| (WebhookSource<RunInput<Full>, Infer<O>, K> & EmitRule<RunInput<Full>, Infer<O>>)
		| PollSource<RunInput<Full>, T, Infer<O>, P>
		| NativeSource<keyof Full & string>
	);

/** A trigger starts an execution. Each emitted item matches `output`. `kind` names its source. */
export type Trigger<S extends Shape = Shape, O extends AnySchema = AnySchema> = TriggerHead<
	S,
	O,
	string
> &
	Built &
	(
		| ({
				/** The service calls a webhook. */
				readonly kind: 'webhook';
		  } & WebhookSource<RunInput<S>, Infer<O>, string>)
		| ({
				/** n8n polls the service. */
				readonly kind: 'poll';
		  } & PollSource<RunInput<S>, unknown, Infer<O>>)
		| ({
				/** A legacy node runs the trigger. */
				readonly kind: 'native';
		  } & NativeSource<string>)
	);

/** A trigger that a legacy node runs. */
export type NativeTrigger = Extract<
	Trigger,
	{
		/** A legacy node runs the trigger. */
		readonly kind: 'native';
	}
>;

/** Where a contract sits in its node: the resource, if any, and the operation or event. */
export interface ActionPath {
	/** The resource name, e.g. `databasePage`. Absent for an action of the node itself. */
	readonly resource?: string;
	/** The operation, or the trigger event, e.g. `getAll`. */
	readonly operation: string;
}

/** Where a contract of a resource sits: the resource and the operation or event. */
export interface ResourcePath {
	/** The resource name, e.g. `databasePage`. */
	readonly resource: string;
	/** The operation, or the trigger event, e.g. `getAll`. */
	readonly operation: string;
}

function built(
	node: NodeDefinition,
	path: ActionPath,
	spec: Pick<ContractSpec<Shape, AnySchema, string>, 'version' | 'input' | 'scopes'>,
) {
	const version = spec.version ?? 1;
	return {
		node,
		id: [node.id, path.resource, path.operation].filter((part) => part !== undefined).join('.'),
		version,
		inputSchema: t.obj(spec.input).json,
		credentialTypes: node.credential?.types.map(({ name }) => name) ?? [],
		scopes: spec.scopes ?? [],
	};
}

function toAction<
	S extends Shape,
	O extends AnySchema,
	F extends ActionFlow,
	Outs extends ActionOutputs | undefined,
	P extends ActionPath,
	Im extends readonly HostImport[],
	Ins extends ActionInputs | undefined,
>(
	node: NodeDefinition,
	path: P,
	spec: ActionSpec<S, S, O, F, string, string, Outs, string, Im, Ins>,
): Action<S, O, F, Outs, Im, Ins> & P {
	return { ...spec, ...path, ...built(node, path, spec) };
}

function toTrigger<S extends Shape, O extends AnySchema, P extends ActionPath>(
	node: NodeDefinition,
	path: P,
	spec: TriggerSpec<S, S, O>,
): Trigger<S, O> & P {
	const head = { ...spec, ...path, ...built(node, path, spec) };
	if (spec.native) return { ...head, kind: 'native', native: spec.native };
	return spec.poll
		? { ...head, kind: 'poll', poll: spec.poll }
		: { ...head, kind: 'webhook', webhook: spec.webhook };
}

type NodeAction<N extends NodeDefinition, RS extends Shape, Path extends ActionPath> = <
	S extends Shape,
	O extends AnySchema,
	const F extends ActionFlow,
	const P extends string = string,
	const Outs extends ActionOutputs | undefined = undefined,
	const H extends string = string,
	const Im extends readonly HostImport[] = [],
	const Ins extends ActionInputs | undefined = undefined,
	R extends AnySchema = AnySchema,
>(
	operation: string,
	spec: ActionSpec<S, RS & S, O, F, ScopeOf<N>, P, Outs, H, Im, Ins, R, RunCredentialOf<N>> &
		OutputsCheck<Outs, RS & S> &
		InputsCheck<Ins, F>,
) => Action<RS & S, O, F, Outs, Im, Ins> & Path;

type NodeTrigger<N extends NodeDefinition, RS extends Shape, Path extends ActionPath> = <
	S extends Shape,
	O extends AnySchema,
	T = unknown,
	P = unknown,
>(
	event: string,
	spec: TriggerSpec<S, RS & S, O, ScopeOf<N>, CredentialKey<CredentialTypeOf<N>>, T, P>,
) => Trigger<RS & S, O> & Path;

/** A provider runs once per root run and gives one capability. */
const PROVIDER_FLOW = { effect: 'read', cardinality: 'per-item' } as const satisfies ActionFlow;

/**
 * What an author writes for a provider: the kind it provides and `provide()`, which makes the
 * capability. The SDK sets the flow and the output.
 */
export type ProviderSpec<
	Own extends Shape,
	Full extends Shape,
	K extends ProviderKind,
	Sc extends string = string,
	H extends string = string,
> = Omit<ContractSpec<Own, AnySchema, Sc>, 'output'> & {
	/** The label users pick, e.g. "OpenAI Chat Model". */
	readonly action: string;
	/** The capability kind that the provider gives, e.g. `chatModel`. */
	readonly provides: K;
	/** More hosts that the capability may send requests to. Without it, only the base URL hosts. */
	readonly egress?: Egress<RunInput<Full>, H>;
	/** Requests of the capability use the credential and the egress of the provider. */
	provide(context: RunContext<RunInput<Full>>): Promise<ProviderCapabilities[K]>;
};

type NodeProvider<N extends NodeDefinition, RS extends Shape, Path extends ActionPath> = <
	S extends Shape,
	const K extends ProviderKind,
	const H extends string = string,
>(
	operation: string,
	spec: ProviderSpec<S, RS & S, K, ScopeOf<N>, H>,
) => Action<RS & S, Schema<ProviderCapabilities[K], false>, typeof PROVIDER_FLOW> & Path;

/** A resource of a node. Its `input` goes into the input of each of its actions and triggers. */
export interface NodeResource<N extends NodeDefinition, RS extends Shape> {
	/** The resource name, the middle segment of each action id, e.g. `databasePage`. */
	readonly name: string;
	/**
	 * An action on this resource. Its input gets the resource input.
	 *
	 * @example
	 * ```ts
	 * export const getUser = user.action('get', {
	 *   action: 'Get a user',
	 *   summary: 'Get one user by ID.',
	 *   flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	 *   input: {},
	 *   output: t.obj({ id: t.str(), name: t.str() }),
	 *   request: { path: '/users/{user}' },
	 * });
	 * ```
	 */
	readonly action: NodeAction<N, RS, ResourcePath>;
	/** A provider on this resource, e.g. `chat.provider('model', …)`. */
	readonly provider: NodeProvider<N, RS, ResourcePath>;
	/** A trigger on this resource, e.g. `databasePage.trigger('added', …)`. */
	readonly trigger: NodeTrigger<N, RS, ResourcePath>;
}

/** A node and its builders. Each child comes from its parent, so a node never imports its actions. */
export type NodeBuilder<N extends NodeDefinition> = N & {
	/**
	 * A resource: a group of actions and triggers that share `input`, e.g. the ID of a user.
	 *
	 * @example
	 * ```ts
	 * export const user = notion.resource('user', { input: { user: ref(notionUserId) } });
	 * ```
	 */
	resource<RS extends Shape = Record<never, never>>(
		name: string,
		options?: {
			/** The input fields that every action and trigger of the resource gets. */
			readonly input: RS;
		},
	): NodeResource<N, RS>;
	/**
	 * An action of the node itself, with no resource. Its id is `<node>.<operation>`.
	 *
	 * @see {@link NodeResource.action}
	 */
	readonly action: NodeAction<N, Record<never, never>, ActionPath>;
	/**
	 * A provider that gives a capability to root nodes, e.g. a chat model.
	 *
	 * @example
	 * ```ts
	 * export const chatModel = xAi.provider('chatModel', {
	 *   action: 'xAI Grok Chat Model',
	 *   summary: 'An xAI Grok chat model for an AI node.',
	 *   provides: 'chatModel',
	 *   input: { model: t.modelId('xai') },
	 *   provide: async ({ input, http }) => grokModel(http, input.model),
	 * });
	 * ```
	 */
	readonly provider: NodeProvider<N, Record<never, never>, ActionPath>;
	/**
	 * A trigger of the node itself: a webhook, a poll, or a legacy node.
	 *
	 * @see `docs/credentials-triggers.md`
	 */
	readonly trigger: NodeTrigger<N, Record<never, never>, ActionPath>;
};

/** A paged list gets the `paging` input, which the host applies. */
const impliedInputOf = (spec: object): Record<never, never> =>
	'list' in spec &&
	typeof spec.list === 'object' &&
	spec.list !== null &&
	'pages' in spec.list &&
	spec.list.pages !== undefined
		? { paging }
		: {};

function buildersOf<N extends NodeDefinition, RS extends Shape, Path extends ActionPath>(
	node: N,
	shared: RS,
	pathOf: (operation: string) => Path,
): {
	readonly action: NodeAction<N, RS, Path>;
	readonly provider: NodeProvider<N, RS, Path>;
	readonly trigger: NodeTrigger<N, RS, Path>;
} {
	// Typed by `NodeAction`: a second generic signature would infer `P` again and not match.
	const action: NodeAction<N, RS, Path> = (operation, spec) =>
		toAction(node, pathOf(operation), {
			...spec,
			input: { ...shared, ...spec.input, ...impliedInputOf(spec) },
		});
	const providerAction: NodeProvider<N, RS, Path> = (operation, { provides, provide, ...spec }) =>
		toAction<
			RS & typeof spec.input,
			Schema<ProviderCapabilities[typeof provides], false>,
			typeof PROVIDER_FLOW,
			undefined,
			Path,
			readonly [],
			undefined
		>(node, pathOf(operation), {
			...spec,
			input: { ...shared, ...spec.input },
			flow: PROVIDER_FLOW,
			output: provider.input(provides),
			run: provide,
		});
	return {
		action,
		provider: providerAction,
		trigger: <S extends Shape, O extends AnySchema, T, P>(
			event: string,
			spec: TriggerSpec<S, RS & S, O, ScopeOf<N>, CredentialKey<CredentialTypeOf<N>>, T, P>,
		) => {
			const input: RS & S = { ...shared, ...spec.input };
			return toTrigger<RS & S, O, Path>(node, pathOf(event), { ...spec, input });
		},
	};
}

/**
 * Defines a node: its identity, credential and base URL. The builder makes its resources,
 * actions, providers and triggers. The action id is the node id, the resource name, and the
 * operation, joined with dots.
 *
 * @example
 * ```ts
 * export const notion = defineNode({
 *   id: 'notion',
 *   displayName: 'Notion',
 *   credential: credential({ types: [notionToken] }),
 *   baseUrl: 'https://api.notion.com/v1',
 * });
 * ```
 * @see `docs/node-contract.md`
 */
export function defineNode<const N extends NodeDefinition>(
	// A key that `NodeDefinition` does not have is an error, e.g. a misspelt `credential`.
	node: N & Record<Exclude<keyof N, keyof NodeDefinition>, never>,
): NodeBuilder<N> {
	return {
		...node,
		resource: <RS extends Shape>(name: string, options?: { readonly input: RS }) => {
			const pathOf = (operation: string) => ({ resource: name, operation });
			return {
				name,
				...(options ? buildersOf(node, options.input, pathOf) : buildersOf(node, {}, pathOf)),
			};
		},
		...buildersOf(node, {}, (operation) => ({ operation })),
	};
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/** The source file of an action in kebab case, e.g. `actions/sheet.append-or-update.ts`. */
export const actionFileOf = ({ resource, operation }: Pick<Action, 'resource' | 'operation'>) =>
	`actions/${[resource, operation]
		.filter((part) => part !== undefined)
		.map(kebab)
		.join('.')}.ts`;

/** The JSON document agents and tools read. Execution details are never part of it. */
export interface ContractDocument {
	/** The contract id, e.g. `notion.databasePage.getAll`. */
	readonly id: string;
	/** The major. Minor and patch live in the version manifest. */
	readonly version: number;
	/** The node id, e.g. `notion`. */
	readonly node: string;
	/** The label: the action, or the trigger event. */
	readonly action: string;
	/** One sentence for agents and search. */
	readonly summary: string;
	/** The flow of the action. A trigger has `read` and `1:N`. */
	readonly flow: ActionFlow & {
		/** How an output item relates to its input item. Always `replace`: the output replaces it. */
		readonly passthrough: 'replace';
	};
	/** The names of the credential types that the contract takes. */
	readonly credentials: readonly string[];
	/** The scopes of the node's credential it needs. Absent when it needs none. */
	readonly scopes?: readonly string[];
	/** Set on a trigger: it starts a workflow and reads no items. */
	readonly trigger?: TriggerKind;
	/** The JSON Schema of the parameters. */
	readonly input: JsonSchema;
	/** The JSON Schema of each output item. */
	readonly output: JsonSchema;
	/** Named outputs in n8n output order. Absent for one unnamed output. */
	readonly outputs?: ActionOutputs;
	/**
	 * Every static host the action may reach: the declared egress and the host of the node base
	 * URL, hosts sorted. Absent when the action reaches no static host and no host from input.
	 */
	readonly egress?: ContractEgress;
	/** The optional host imports, sorted. Absent when it uses none. */
	readonly imports?: readonly HostImport[];
	/** Named inputs in n8n input order. Absent for one input. */
	readonly inputs?: ActionInputs;
}

/**
 * A manifest generated from a legacy node description or an MCP tool. It makes weak claims:
 * consumers that need guarantees check `derived`.
 */
export interface DerivedManifest extends ContractDocument {
	/** Marks a manifest that no author wrote. */
	readonly derived: true;
	/** typeVersion `x.y` maps to `x.y.0`. A derived manifest makes no semver claim beyond that. */
	readonly semver: string;
	/** `inferred`: the source declares an output schema. `unknown`: the output can be anything. */
	readonly outputClaim: 'inferred' | 'unknown';
}

/** The egress of a contract document. */
export interface ContractEgress {
	/** The host patterns, sorted, e.g. `*.example.com`. */
	readonly hosts?: readonly string[];
	/** The input field with an absolute URL whose host the action may reach. */
	readonly fromInput?: string;
}

type ContractSource = Pick<
	Action,
	'id' | 'version' | 'node' | 'summary' | 'credentialTypes' | 'inputSchema' | 'output'
> & {
	/** The scopes that the contract needs. */
	readonly scopes?: readonly string[];
} & (
		| Pick<
				Action,
				'action' | 'flow' | 'outputs' | 'egress' | 'imports' | 'inputs' | 'resourceOutput'
		  >
		| (Pick<Trigger, 'trigger'> &
				(
					| {
							/** The trigger source. */
							readonly kind: 'webhook' | 'poll';
					  }
					| Pick<NativeTrigger, 'kind' | 'native'>
				))
	);

/**
 * Hosts are a set, so their order is not part of the contract. The node base URL host joins
 * them, so the manifest holds every static host and the host reads none from the bundle.
 */
function contractEgressOf(
	egress: ContractEgress | undefined,
	baseUrl: string | undefined,
): ContractEgress | undefined {
	const hosts = [...new Set([toHostname(baseUrl), ...(egress?.hosts ?? [])])]
		.filter((host) => host !== undefined)
		.sort();
	const fromInput = egress?.fromInput;
	if (hosts.length === 0 && fromInput === undefined) return undefined;
	return { ...(hosts.length ? { hosts } : {}), ...(fromInput === undefined ? {} : { fromInput }) };
}

// A trigger emits the items of one event: it reads the service, and one event gives N items.
const TRIGGER_FLOW: ActionFlow = { effect: 'read', cardinality: '1:N' };

/**
 * The contract document of a built action or trigger: what agents, the registry and the
 * contract hash read. It drops execution details (`run`, bindings, hatches).
 */
export const toContract = (source: ContractSource): ContractDocument => {
	const egress =
		'kind' in source ? undefined : contractEgressOf(source.egress, source.node.baseUrl);
	const imports = 'kind' in source ? [] : [...new Set(source.imports ?? [])].sort();
	const inputs = 'kind' in source ? undefined : source.inputs;
	const resource = 'kind' in source ? undefined : source.resourceOutput;
	return {
		id: source.id,
		version: source.version,
		node: source.node.id,
		action: 'kind' in source ? source.trigger : source.action,
		summary: source.summary,
		// Each contract hash includes passthrough. Remove it at the next major of each action.
		flow: { ...('kind' in source ? TRIGGER_FLOW : source.flow), passthrough: 'replace' },
		credentials: source.credentialTypes,
		// Optional keys keep the hash of each contract that has neither.
		...(source.scopes?.length ? { scopes: source.scopes } : {}),
		...('kind' in source
			? { trigger: source.kind === 'native' ? source.native.on : source.kind }
			: {}),
		input: source.inputSchema,
		output: resource
			? {
					...source.output.json,
					'x-n8n-resource': {
						method: resource.method,
						input: resource.input,
						loadOptions: resource.loadOptions,
					},
				}
			: source.output.json,
		...(!('kind' in source) && source.outputs ? { outputs: source.outputs } : {}),
		...(egress ? { egress } : {}),
		...(imports.length ? { imports } : {}),
		...(inputs ? { inputs } : {}),
	};
};

/** The reply step of a native trigger as an action contract: it writes the reply. */
export function replyContractOf(trigger: NativeTrigger): ContractDocument | undefined {
	const { reply } = trigger;
	if (!reply) return undefined;
	return {
		id: [trigger.node.id, trigger.resource, reply.operation]
			.filter((part) => part !== undefined)
			.join('.'),
		version: trigger.version,
		node: trigger.node.id,
		action: reply.action,
		summary: reply.summary,
		flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace' },
		credentials: [],
		input: reply.input instanceof Schema ? reply.input.json : t.obj(reply.input).json,
		output: (reply.output ?? t.passedItem()).json,
	};
}

/** Output names, fixed ones only: names that come from the input are known at run time. */
export const fixedOutputNames = (outputs: ActionOutputs | undefined): readonly string[] =>
	outputs === undefined ? [] : 'each' in outputs ? (outputs.then ?? []) : outputs;

function hints(schema: JsonSchema): string[] {
	const children = [
		...Object.values(schema.properties ?? {}),
		...(schema.items ? [schema.items] : []),
		...(schema.oneOf ?? []),
		...(schema.anyOf ?? []),
		...Object.values(schema.patternProperties ?? {}),
	];
	return [...(schema['x-n8n-hint'] ? [schema['x-n8n-hint']] : []), ...children.flatMap(hints)];
}

/** The action has a `t.binary()` field, so its bundle targets Node Contract 2.2.0. */
export const usesBinary = (contract: Pick<ContractDocument, 'input' | 'output'>) =>
	hasBinary(contract.input) || hasBinary(contract.output);

/** The action declares host imports or named inputs, so its bundle targets Node Contract 2.3.0. */
export const usesHostImports = (contract: Pick<ContractDocument, 'imports' | 'inputs'>) =>
	Boolean(contract.imports?.length) || contract.inputs !== undefined;

/** The action supplies a provider capability or reads one, so its bundle targets Node Contract 2.3.0. */
export const usesProviders = (contract: Pick<ContractDocument, 'input' | 'output'>) =>
	providedKindOf(contract.output) !== undefined ||
	Object.values(contract.input.properties ?? {}).some(
		(field) => providerInputOf(field) !== undefined,
	);

const withoutIndexedBinaries = (output: JsonSchema): JsonSchema => ({
	...output,
	patternProperties: {},
	...(output.anyOf ? { anyOf: output.anyOf.map(withoutIndexedBinaries) } : {}),
});

/**
 * The host makes an agent tool of the action: a model calls it with JSON and reads its JSON
 * result. It reads or writes, one run for each call, with one data input and one data output.
 * A transform is no tool, because the model can change data itself. A batch reads all input
 * items, and a tool call has none.
 */
export function isToolContract(contract: ContractDocument): boolean {
	const required = new Set(contract.input.required ?? []);
	return (
		!('derived' in contract) &&
		contract.trigger === undefined &&
		contract.flow.effect !== 'transform' &&
		contract.flow.cardinality !== 'batch' &&
		// A tool call runs without the host imports of a step.
		!usesHostImports(contract) &&
		contract.outputs === undefined &&
		contract.output['x-n8n-passed'] !== true &&
		!usesProviders(contract) &&
		// The result goes to the model as JSON, and a model cannot give a file. Indexed binaries
		// are optional, so the JSON result is complete without them.
		!hasBinary(withoutIndexedBinaries(contract.output)) &&
		!Object.entries(contract.input.properties ?? {}).some(
			([name, field]) => required.has(name) && hasBinary(field),
		)
	);
}

const HOST_IMPORTS: ReadonlySet<string> = new Set<HostImport>([
	'dataTables',
	'code',
	'wait',
	'inputOf',
]);

/** A contract read from a manifest can name anything, so the runtime checks each import. */
export const isHostImport = (value: unknown): value is HostImport =>
	typeof value === 'string' && HOST_IMPORTS.has(value);

/**
 * A binary output field becomes `item.binary.<field>`, so it must be a top-level field or a
 * `t.indexedBinaries()` key, of the object or of a `t.union()` branch, and `binary` is not a JSON
 * field name.
 */
function binaryOutputIssues({ id, output }: ContractDocument): string[] {
	const objects = [output, ...(output.anyOf ?? [])];
	const reserved = objects.some((object) => object.properties?.binary)
		? [`${id}: output field "binary" is reserved for binaries`]
		: [];
	if (!hasBinary(output)) return reserved;
	const isBinaryKey = outputBinaryKeys(output);
	const issuesOf = (object: JsonSchema, at: string) => {
		const fields = Object.entries(object.properties ?? {});
		const nested = fields.filter(([, field]) => !field['x-n8n-binary'] && hasBinary(field));
		const patterns = Object.values(object.patternProperties ?? {});
		const outside =
			patterns.some((field) => !field['x-n8n-binary'] && hasBinary(field)) ||
			hasBinary({
				...object,
				properties: {},
				patternProperties: {},
				...(object === output ? { anyOf: [] } : {}),
			});
		const shadowed = fields.filter(([name, field]) => !field['x-n8n-binary'] && isBinaryKey(name));
		return [
			...nested.map(([name]) => `${id}: ${at}.${name} holds a binary below the top level`),
			...shadowed.map(
				([name]) => `${id}: ${at}.${name} is no binary, but the output takes its key as a binary`,
			),
			...(outside ? [`${id}: a binary output must be a top-level field of an object`] : []),
		];
	};
	return [
		...issuesOf(output, 'output'),
		...(output.anyOf ?? []).flatMap((branch, index) => issuesOf(branch, `output.anyOf[${index}]`)),
		...reserved,
	];
}

/** A binary that the host cannot find along fields, list items, and variant branches. */
const hasHiddenBinary = (schema: JsonSchema): boolean => {
	const branches = schema.discriminator ? (schema.oneOf ?? []) : [];
	const hidden = [
		...(schema.anyOf ?? []),
		...(schema.discriminator ? [] : (schema.oneOf ?? [])),
		...Object.values(schema.patternProperties ?? {}),
		...(typeof schema.additionalProperties === 'object' ? [schema.additionalProperties] : []),
	];
	const visible = [
		...Object.values(schema.properties ?? {}),
		...(schema.items ? [schema.items] : []),
		...branches,
	];
	return hidden.some(hasBinary) || visible.some(hasHiddenBinary);
};

/** A hint such as "A string" tells nothing that the schema does not. */
const TYPE_ONLY_HINT = /^(an? )?(string|text|number|integer|boolean|object|array|list|value)$/i;

/**
 * The problems of a contract that its data shows. Prose: one summary sentence of at most 120
 * characters that ends with a period, and hints of at most 80 characters, without a period, that
 * tell more than the type. Then outputs, binaries, egress, inputs and providers.
 */
export function lintContract(contract: ContractDocument): string[] {
	const names = fixedOutputNames(contract.outputs);
	const summary = contract.summary.trim();
	const allHints = [...hints(contract.input), ...hints(contract.output)];
	return [
		...(contract.summary.length > 120 ? [`${contract.id}: summary is over 120 characters`] : []),
		...(summary === '' ? [`${contract.id}: summary is empty`] : []),
		...(summary !== '' && !summary.endsWith('.')
			? [`${contract.id}: summary must end with a period`]
			: []),
		...(new Set(names).size < names.length ? [`${contract.id}: output names repeat`] : []),
		...allHints
			.filter((hint) => hint.length > 80)
			.map((hint) => `${contract.id}: hint is over 80 characters: ${hint}`),
		...allHints
			.filter((hint) => hint.trim().endsWith('.'))
			.map((hint) => `${contract.id}: hint must not end with a period: ${hint}`),
		...allHints
			.filter((hint) => TYPE_ONLY_HINT.test(hint.trim()))
			.map((hint) => `${contract.id}: hint only names the type: ${hint}`),
		...binaryOutputIssues(contract),
		...(hasHiddenBinary(contract.input)
			? [`${contract.id}: an input binary must be a field, a list item, or in a variant branch`]
			: []),
		...egressIssues(contract),
		...resourceIssues(contract),
		...typicalIssues(contract.id, 'output', contract.output),
		...inputIssues(contract),
		...providerIssues(contract.id, contract.input, contract.output, contract.flow),
	];
}

/** Each `examples` value in `schema`, checked against the schema that lists it. */
function exampleIssues(schema: JsonSchema, at: string): string[] {
	const own = (schema.examples ?? []).flatMap((example, index) =>
		validate(example, schema, { path: `${at}.examples[${index}]` }),
	);
	const { additionalProperties } = schema;
	const children: Array<[string, JsonSchema]> = [
		...Object.entries(schema.properties ?? {}).map(([key, child]): [string, JsonSchema] => [
			`${at}.${key}`,
			child,
		]),
		...(schema.items ? [[`${at}[]`, schema.items] satisfies [string, JsonSchema]] : []),
		...(schema.oneOf ?? schema.anyOf ?? []).map((child): [string, JsonSchema] => [at, child]),
		...(typeof additionalProperties === 'object'
			? [[`${at}.*`, additionalProperties] satisfies [string, JsonSchema]]
			: []),
	];
	return [...own, ...children.flatMap(([path, child]) => exampleIssues(child, path))];
}

/** An item of the derived shape must also match `output`, which n8n checks at run time. */
function deriveOutputIssues(action: Action): string[] {
	if (!action.deriveOutput) return [];
	const sample = exampleOf(action.inputSchema);
	// Without a valid sample input there is nothing to derive from.
	if (!isRecord(sample) || validate(sample, action.inputSchema).length > 0) return [];
	try {
		const derived = action.deriveOutput(sample);
		return validate(exampleOf(derived), action.output.json, { path: 'deriveOutput' });
	} catch (error) {
		return [`deriveOutput: throws for ${JSON.stringify(sample)}: ${String(error)}`];
	}
}

/**
 * The problems of an action or a trigger, one line each: `<id>: <schema path>: <problem>`.
 * It adds to `lintContract` what needs the code: `examples` against their schema, `deriveOutput`
 * against `output`, and scopes against the credential of the node.
 */
export function checkAction(action: Action | Trigger): string[] {
	const scopes = Object.keys(action.node.credential?.scopes ?? {});
	return [
		...lintContract(toContract(action)),
		...[
			...exampleIssues(action.inputSchema, 'input'),
			...exampleIssues(action.output.json, 'output'),
			...('kind' in action ? [] : deriveOutputIssues(action)),
			...action.scopes
				.filter((scope) => !scopes.includes(scope))
				.map((scope) => `scopes: "${scope}" is not a scope of the node's credential`),
		].map((issue) => `${action.id}: ${issue}`),
	];
}

function inputIssues({ id, inputs, flow, imports }: ContractDocument): string[] {
	return [
		...(inputs && new Set(inputs).size < inputs.length ? [`${id}: input names repeat`] : []),
		...(inputs && flow.cardinality !== 'batch' ? [`${id}: named inputs need batch`] : []),
		...(imports ?? [])
			.filter((name) => !isHostImport(name))
			.map((name) => `${id}: ${String(name)} is not a host import`),
	];
}

function resourceIssues({ id, input, output }: ContractDocument): string[] {
	const pointer = output['x-n8n-resource'];
	if (!pointer) return [];
	return [
		...(input.properties?.[pointer.input]
			? []
			: [`${id}: resourceOutput.input names no input field: ${pointer.input}`]),
		...(pointer.loadOptions.length ? [] : [`${id}: resourceOutput lists no loadOptions call`]),
	];
}

/** A typical field may be absent, so it cannot be required. */
function typicalIssues(id: string, at: string, schema: JsonSchema): string[] {
	const required = schema.required ?? [];
	return [
		...Object.entries(schema.properties ?? {}).flatMap(([name, field]) => [
			...(field['x-n8n-claim'] === 'typical' && required.includes(name)
				? [`${id}: ${at}.${name} is typical, so it must not be required`]
				: []),
			...typicalIssues(id, `${at}.${name}`, field),
		]),
		...(schema.items ? typicalIssues(id, `${at}[]`, schema.items) : []),
		...[...(schema.oneOf ?? []), ...(schema.anyOf ?? [])].flatMap((branch) =>
			typicalIssues(id, at, branch),
		),
	];
}

/** A lookup call of the builder: a load-options call on a legacy node. */
export interface ResourceLookupCall {
	/** The legacy node type, e.g. `n8n-nodes-base.notion`. */
	readonly nodeType: string;
	/** The legacy node version. */
	readonly version: number;
	/** The load-options method. */
	readonly methodName: string;
	/** The node parameters of the call, the resource ID included. */
	readonly currentNodeParameters: Record<string, unknown>;
}

/**
 * The calls that list the fields of the resource the parameters name, in the order to try them.
 * None when the contract has no `x-n8n-resource`, or the input field holds no ID.
 */
export function resourceLookupsOf(
	contract: Pick<ContractDocument, 'input' | 'output'>,
	parameters: Readonly<Record<string, unknown>>,
): ResourceLookupCall[] {
	const pointer = contract.output['x-n8n-resource'];
	const value = pointer ? parameters[pointer.input] : undefined;
	if (!pointer || typeof value !== 'string' || value.startsWith('=')) return [];
	const pattern = contract.input.properties?.[pointer.input]?.pattern;
	const id = pattern === undefined ? value : firstMatchOf(pattern, value);
	if (!id) return [];
	return pointer.loadOptions.map(
		({ nodeType, version, methodName, parameters: fixed, idParameter }) => ({
			nodeType,
			version,
			methodName,
			currentNodeParameters: { ...fixed, [idParameter]: { __rl: true, mode: 'id', value: id } },
		}),
	);
}

/** A template field stands for one host label, so the pattern check reads it as one. */
function egressIssues({ id, egress, input }: ContractDocument): string[] {
	const invalid = (egress?.hosts ?? []).filter(
		(host) => !isHostPattern(host.replace(/\{[^}]+\}/g, 'x')),
	);
	const { fromInput } = egress ?? {};
	return [
		...invalid.map(
			(host) => `${id}: egress host ${host} is not a host. Use api.example.com or *.example.com.`,
		),
		...(fromInput !== undefined && !input.properties?.[fromInput]
			? [`${id}: egress.fromInput names no input field: ${fromInput}`]
			: []),
	];
}
