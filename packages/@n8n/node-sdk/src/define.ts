import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
} from 'n8n-workflow';

import {
	obj,
	type AnySchema,
	type Infer,
	type JsonSchema,
	type ObjectOf,
	type Schema,
	type Shape,
} from './schema';

/** The integration identity: name, credentials, and base URL shared by its actions. */
export interface NodeDefinition {
	/** Short id, the first segment of every action id: `notion`. */
	readonly id: string;
	readonly displayName: string;
	/** Credential types any action of this node accepts. */
	readonly credentials: readonly string[];
	readonly baseUrl?: string;
	readonly icon?: string;
	/** The node also runs without a credential (a public HTTP API). */
	readonly authOptional?: boolean;
}

/** An n8n credential type. `defineCredential` builds one. */
export type CredentialDefinition = ICredentialType;

export interface CredentialField {
	readonly name: string;
	readonly displayName: string;
	readonly type: 'string';
	readonly typeOptions?: { readonly password?: boolean };
	readonly default?: string;
	readonly required?: boolean;
	readonly description?: string;
}

export interface CredentialSpec {
	/** The credential type a node lists in `credentials`, e.g. `todoApi`. */
	readonly name: string;
	readonly displayName: string;
	readonly documentationUrl?: string;
	readonly properties: readonly CredentialField[];
	/** Header and query values are templates, e.g. `'=Bearer {{$credentials.apiKey}}'`. */
	readonly authenticate:
		| {
				readonly headers?: Readonly<Record<string, string>>;
				readonly qs?: Readonly<Record<string, string>>;
		  }
		| ((
				credentials: ICredentialDataDecryptedObject,
				request: IHttpRequestOptions,
		  ) => Promise<IHttpRequestOptions>);
	readonly test?: ICredentialTestRequest;
}

export function defineCredential(spec: CredentialSpec): CredentialDefinition {
	const { authenticate } = spec;
	return {
		name: spec.name,
		displayName: spec.displayName,
		...(spec.documentationUrl ? { documentationUrl: spec.documentationUrl } : {}),
		properties: spec.properties.map((field) => ({
			...field,
			typeOptions: { ...field.typeOptions },
			default: field.default ?? '',
		})),
		authenticate:
			typeof authenticate === 'function'
				? authenticate
				: {
						type: 'generic',
						properties: { headers: { ...authenticate.headers }, qs: { ...authenticate.qs } },
					},
		...(spec.test ? { test: spec.test } : {}),
	};
}

/** What the action does to the item stream. */
export interface ActionFlow {
	readonly effect: 'read' | 'write' | 'transform';
	/** `per-item`: `run()` returns one output item. `1:N`: `run()` yields each output item. */
	readonly cardinality: 'per-item' | '1:N';
	/** A repeated request has no extra effect, so the host may retry any of its requests. */
	readonly idempotent?: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

type QueryValue = string | number | boolean;

interface HttpRequestOptions {
	readonly method?: HttpMethod;
	/** An array value repeats its key: `{ id: ['a', 'b'] }` sends `id=a&id=b`. */
	readonly query?: Readonly<Record<string, QueryValue | readonly QueryValue[] | undefined>>;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: unknown;
	/** Return `{ body, headers, statusCode }` instead of the body. */
	readonly fullResponse?: boolean;
	/** 300000 (5 minutes) when omitted, the default of the legacy HTTP Request node. */
	readonly timeoutMs?: number;
	/**
	 * The host retries a 429, 502, 503, 504, or a dropped connection when the request is
	 * idempotent: GET, HEAD, PUT, or an action with `flow.idempotent`. `true` also retries
	 * another method; `false` never retries.
	 */
	readonly retry?: boolean;
}

/** `url` is absolute (e.g. a `next` link). `path` goes after the node's `baseUrl`. */
export type HttpRequest = HttpRequestOptions &
	(
		| { readonly url: string; readonly path?: never }
		| { readonly path: `/${string}`; readonly url?: never }
	);

/** An HTTP client with the node's credential already applied. A non-2xx response throws an `HttpError`. */
export interface Http {
	request(request: HttpRequest): Promise<unknown>;
}

/** The error `http.request` throws for a non-2xx response. */
export interface HttpError extends Error {
	readonly status: number;
	/** Header names are lower case, e.g. `retry-after`. */
	readonly headers: Readonly<Record<string, string>>;
	readonly body: unknown;
}

// A property check, not `instanceof`: a frozen bundle has its own copy of the SDK.
export const isHttpError = (error: unknown): error is HttpError =>
	error instanceof Error &&
	'status' in error &&
	typeof error.status === 'number' &&
	'headers' in error &&
	typeof error.headers === 'object' &&
	error.headers !== null &&
	'body' in error;

export interface PaginateOptions<T> {
	/**
	 * The request for one page. `cursor` is undefined for the first page. `room` is the limit
	 * minus the items so far, e.g. for a page size parameter.
	 */
	request(cursor: string | undefined, room: number | undefined): HttpRequest;
	/** The items in one page body. */
	items(body: unknown): readonly T[];
	/** The cursor of the next page, or undefined on the last page. */
	next(body: unknown): string | undefined;
	readonly limit?: number;
	readonly maxPages?: number;
}

/**
 * Yields the items of each page in order. It stops at `limit` items, after `maxPages` pages,
 * at a page without a next cursor, and at a cursor it already sent, so an API that repeats a
 * cursor cannot loop. The host request limit also applies. It is a helper, not a host method:
 * it inlines into each bundle, so an older host runs it too.
 */
export async function* paginate<T>(
	http: Http,
	{ request, items, next, limit, maxPages = Infinity }: PaginateOptions<T>,
): AsyncGenerator<T, void, undefined> {
	// `for...of` also visits the pages the loop appends: one request per page.
	const pages: Array<{ readonly cursor?: string; readonly emitted: number }> = [{ emitted: 0 }];
	for (const { cursor, emitted } of pages) {
		const room = limit === undefined ? undefined : limit - emitted;
		const body = await http.request(request(cursor, room));
		const page = items(body).slice(0, room);
		yield* page;
		const nextCursor = next(body);
		const count = emitted + page.length;
		const sent = pages.some((entry) => entry.cursor === nextCursor);
		if (nextCursor && !sent && pages.length < maxPages && (limit === undefined || count < limit)) {
			pages.push({ cursor: nextCursor, emitted: count });
		}
	}
}

type DefaultedKeys<S extends Shape> = {
	[K in keyof S]: S[K] extends Schema<unknown, true, true> ? K : never;
}[keyof S];

/** The input `run()` gets. n8n fills in each default, so a field with `.default(v)` is always set. */
export type RunInput<S extends Shape> = ObjectOf<S> & { [K in DefaultedKeys<S>]: Infer<S[K]> };

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Safety limits for one `run()` call. The defaults are far above normal use. */
export interface RunLimits {
	/** A page is one request. */
	readonly maxRequests: number;
	readonly maxItems: number;
}

/** One field per host import of `spec/n8n-action@2.wit`, plus `input`. */
export interface RunContext<Input> {
	/** Parameters for the current item, expressions resolved, defaults filled in, and validated. */
	readonly input: Input;
	readonly http: Http;
	/** Writes to the n8n log with the node name. Do not log credentials or personal data. */
	log(level: LogLevel, message: string): void;
	/** The limits the host enforces for this run. */
	readonly limits: RunLimits;
}

/** What `run()` gives back for one input item. The host validates each output item. */
export type RunResult<C extends ActionFlow['cardinality'], Output> = C extends '1:N'
	? AsyncIterable<Output>
	: Promise<Output>;

/** A field of the resource an action reads (a Notion property, a sheet column), as a host lookup lists it. */
export interface ResourceField {
	readonly name: string;
	readonly value: string | number | boolean;
}

/** What an author writes for one action. `Own` is its own input; `Full` adds the resource input. */
export interface ActionSpec<
	Own extends Shape,
	Full extends Shape,
	O extends AnySchema,
	F extends ActionFlow,
	C extends string = string,
> {
	/** Integer major, 1 when omitted. It is the n8n `typeVersion`. */
	readonly version?: number;
	/** Bump for an additive contract change. 0 when omitted. */
	readonly minor?: number;
	/** Bump for a code change that keeps the contract hash. 0 when omitted. */
	readonly patch?: number;
	/** The label users pick, e.g. "Get many database pages". */
	readonly action: string;
	/** At most 120 characters. */
	readonly summary: string;
	readonly flow: F;
	/** Credential types this action accepts, when they differ from the node's. */
	readonly credentials?: readonly C[];
	readonly input: Own;
	readonly output: O;
	/**
	 * Pure hatch: the output shape for these parameters (fields a filter guarantees, fields a
	 * mapping creates). Leaves other than discriminators may still be expression strings.
	 */
	deriveOutput?(input: ObjectOf<Full>): JsonSchema;
	/**
	 * Pure hatch: the output shape from the fields of the resource these parameters name.
	 * `method` names a lookup the host runs with the node's credential. Without fields, the host
	 * keeps `deriveOutput`.
	 */
	readonly resourceOutput?: {
		readonly method: string;
		toOutput(fields: readonly ResourceField[], input: ObjectOf<Full>): JsonSchema;
	};
	/** Runs once per input item. `flow.cardinality` sets what it gives back, see `RunResult`. */
	run(context: RunContext<RunInput<Full>>): RunResult<F['cardinality'], Infer<O>>;
	/**
	 * Pure hatch on a new major: the parameters of an older major in, the parameters of this
	 * major out. No I/O. Fixture pairs replay it.
	 */
	migrate?(fromMajor: number, params: Readonly<Record<string, unknown>>): Record<string, unknown>;
}

export interface Action<
	S extends Shape = Shape,
	O extends AnySchema = AnySchema,
	F extends ActionFlow = ActionFlow,
> extends ActionSpec<S, S, O, F> {
	readonly node: NodeDefinition;
	/** `<node>.<resource>.<operation>` or `<node>.<operation>`, e.g. `notion.databasePage.getAll`. */
	readonly id: string;
	readonly resource?: string;
	readonly operation: string;
	readonly version: number;
	/** `major.minor.patch`. */
	readonly semver: string;
	readonly inputSchema: JsonSchema;
	readonly credentialTypes: readonly string[];
}

interface ActionPath {
	readonly resource?: string;
	readonly operation: string;
}

function toAction<S extends Shape, O extends AnySchema, F extends ActionFlow, P extends ActionPath>(
	node: NodeDefinition,
	path: P,
	spec: ActionSpec<S, S, O, F>,
): Action<S, O, F> & P {
	const version = spec.version ?? 1;
	return {
		...spec,
		...path,
		node,
		id: [node.id, path.resource, path.operation].filter((part) => part !== undefined).join('.'),
		version,
		semver: `${version}.${spec.minor ?? 0}.${spec.patch ?? 0}`,
		inputSchema: obj(spec.input).json,
		credentialTypes: spec.credentials ?? node.credentials,
	};
}

type CredentialOf<N extends NodeDefinition> = N['credentials'][number];

/** A resource of a node. Its `input` goes into the input of each of its actions. */
export interface NodeResource<N extends NodeDefinition, RS extends Shape> {
	readonly name: string;
	action<S extends Shape, O extends AnySchema, const F extends ActionFlow>(
		operation: string,
		spec: ActionSpec<S, RS & S, O, F, CredentialOf<N>>,
	): Action<RS & S, O, F> & { readonly resource: string; readonly operation: string };
}

/** A node and its builders. Each child comes from its parent, so a node never imports its actions. */
export type NodeBuilder<N extends NodeDefinition> = N & {
	resource<RS extends Shape = Record<never, never>>(
		name: string,
		options?: { readonly input: RS },
	): NodeResource<N, RS>;
	action<S extends Shape, O extends AnySchema, const F extends ActionFlow>(
		operation: string,
		spec: ActionSpec<S, S, O, F, CredentialOf<N>>,
	): Action<S, O, F>;
};

function resourceOf<N extends NodeDefinition, RS extends Shape>(
	node: N,
	name: string,
	shared: RS,
): NodeResource<N, RS> {
	return {
		name,
		action: <S extends Shape, O extends AnySchema, const F extends ActionFlow>(
			operation: string,
			spec: ActionSpec<S, RS & S, O, F, CredentialOf<N>>,
		) => {
			const input: RS & S = { ...shared, ...spec.input };
			const path = { resource: name, operation };
			return toAction<RS & S, O, F, typeof path>(node, path, { ...spec, input });
		},
	};
}

/** The action id is the node id, the resource name, and the operation, joined with dots. */
export function defineNode<const N extends NodeDefinition>(node: N): NodeBuilder<N> {
	return {
		...node,
		resource: <RS extends Shape>(name: string, options?: { readonly input: RS }) =>
			options ? resourceOf(node, name, options.input) : resourceOf(node, name, {}),
		action: (operation, spec) => toAction(node, { operation }, spec),
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
	readonly id: string;
	/** The major. Minor and patch live in the version manifest. */
	readonly version: number;
	readonly node: string;
	readonly action: string;
	readonly summary: string;
	readonly flow: ActionFlow & { readonly passthrough: 'replace' };
	readonly credentials: readonly string[];
	readonly input: JsonSchema;
	readonly output: JsonSchema;
}

export const toContract = (
	action: Pick<
		Action,
		| 'id'
		| 'version'
		| 'node'
		| 'action'
		| 'summary'
		| 'flow'
		| 'credentialTypes'
		| 'inputSchema'
		| 'output'
	>,
): ContractDocument => ({
	id: action.id,
	version: action.version,
	node: action.node.id,
	action: action.action,
	summary: action.summary,
	// Each contract hash includes passthrough. Remove it at the next major of each action.
	flow: { ...action.flow, passthrough: 'replace' },
	credentials: action.credentialTypes,
	input: action.inputSchema,
	output: action.output.json,
});

function hints(schema: JsonSchema): string[] {
	const children = [
		...Object.values(schema.properties ?? {}),
		...(schema.items ? [schema.items] : []),
		...(schema.oneOf ?? []),
		...(schema.anyOf ?? []),
	];
	return [...(schema['x-n8n-hint'] ? [schema['x-n8n-hint']] : []), ...children.flatMap(hints)];
}

/** Prose budgets from the contract format: summary at most 120, each hint at most 80. */
export function lintContract(contract: ContractDocument): string[] {
	return [
		...(contract.summary.length > 120 ? [`${contract.id}: summary is over 120 characters`] : []),
		...[...hints(contract.input), ...hints(contract.output)]
			.filter((hint) => hint.length > 80)
			.map((hint) => `${contract.id}: hint is over 80 characters: ${hint}`),
	];
}
