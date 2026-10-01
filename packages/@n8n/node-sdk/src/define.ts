import type { AnyCredentialType, Credential, CredentialKey } from './credentials';
import {
	hasBinary,
	obj,
	type AnySchema,
	type Binary,
	type BinaryMeta,
	type Infer,
	type JsonSchema,
	type ObjectOf,
	type Schema,
	type Shape,
} from './schema';
import type { PollConfig, TriggerKind, WebhookConfig } from './triggers';

/** The integration identity: name, credential, and base URL shared by its actions. */
export interface NodeDefinition {
	/** Short id, the first segment of every action id: `notion`. */
	readonly id: string;
	readonly displayName: string;
	/** The one credential of the node: its credential types and its scopes. */
	readonly credential?: Credential;
	readonly baseUrl?: string;
	readonly icon?: string;
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

/** What the action does to the item stream. */
export interface ActionFlow {
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
	readonly json: Readonly<Record<string, unknown>>;
}

/**
 * One output per entry of the input list `each`, named by the `output` field of the entry,
 * then the outputs in `then`. Switch cases use it.
 */
export interface OutputsPerEntry {
	readonly each: string;
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
	? { readonly outputs: { readonly each: EntryListKey<Full> } }
	: unknown;

/** The input item or items that an output item comes from. */
export type Lineage = InputItem | readonly InputItem[];

type Routed<Outs> = Outs extends ActionOutputs
	? { readonly to: OutputName<Outs> }
	: { readonly to?: never };

/** An input item passed on unchanged, or a new output item. */
type Passed = { readonly item: InputItem; readonly json?: never; readonly from?: never };
type Made<Output, From> = { readonly json: Output; readonly item?: never } & From;

/**
 * One output of `run()`. A batch output names its lineage in `from`; a per-item output comes
 * from the current item. An action with named outputs routes each output with `to`.
 */
export type Emit<C, Output, Outs> = C extends 'batch'
	? Routed<Outs> & (Passed | Made<Output, { readonly from: Lineage }>)
	: Outs extends ActionOutputs
		? Routed<Outs> & (Passed | Made<Output, { readonly from?: never }>)
		: Output;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

type QueryValue = string | number | boolean;

interface HttpRequestOptions {
	readonly method?: HttpMethod;
	/** An array value repeats its key: `{ id: ['a', 'b'] }` sends `id=a&id=b`. */
	readonly query?: Readonly<Record<string, QueryValue | readonly QueryValue[] | undefined>>;
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
	/** 300000 (5 minutes) when omitted, the default of the legacy HTTP Request node. */
	readonly timeoutMs?: number;
	/**
	 * The host retries a 429, 502, 503, 504, or a dropped connection when the request is
	 * idempotent: GET, HEAD, PUT, or an action with `flow.idempotent`. `true` also retries
	 * another method; `false` never retries.
	 */
	readonly retry?: boolean;
}

/**
 * `url` is an absolute http or https URL. `path` starts with one `/` and goes after the base
 * URL. The host must be in the egress of the action and in the hosts of the credential.
 */
export type HttpRequest = HttpRequestOptions &
	(
		| { readonly url: string; readonly path?: never }
		| { readonly path: `/${string}`; readonly url?: never }
	);

/** An HTTP client with the node's credential already applied. A non-2xx response throws an `HttpError`. */
export interface Http {
	request(
		request: HttpRequest & { readonly response: 'binary'; readonly fullResponse?: false },
	): Promise<Binary>;
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

/** Creates files in the n8n binary data store. */
export interface Binaries {
	/** The chunks go to the store as the action yields them, so a large file never sits in memory. */
	create(
		meta: Omit<BinaryMeta, 'bytes'>,
		chunks: AsyncIterable<Uint8Array | string> | Iterable<Uint8Array | string>,
	): Promise<Binary>;
}

/** One field per host import of `spec/n8n-action@2.wit`. */
export interface RunHost {
	readonly http: Http;
	/** Writes to the n8n log with the node name. Do not log credentials or personal data. */
	log(level: LogLevel, message: string): void;
	/** The limits the host enforces for this run. */
	readonly limits: RunLimits;
	/**
	 * Binary data (`n8n:action@2.2.0`). Only an action with a `binary()` field gets it: the
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

export type ContextOf<C extends ActionFlow['cardinality'], Input> = C extends 'batch'
	? BatchContext<Input>
	: RunContext<Input>;

/** What `run()` gives back. The host validates each output item and sets its lineage. */
export type RunResult<C extends ActionFlow['cardinality'], E> = C extends '1:N'
	? AsyncIterable<E>
	: C extends 'batch'
		? Iterable<E> | AsyncIterable<E>
		: Promise<E>;

/** A field of the resource an action reads (a Notion property, a sheet column), as a host lookup lists it. */
export interface ResourceField {
	readonly name: string;
	readonly value: string | number | boolean;
}

/** A value in a request description: a literal, or the input field `{ input: 'page' }`. */
export type RequestValue<Input> =
	| string
	| number
	| boolean
	| { readonly input: keyof Input & string };

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

/** The declarative binding: data that says which request the host sends for each item. */
export interface RequestBinding<Input, P extends string = string> {
	readonly method?: HttpMethod;
	/** After the node's `baseUrl`. `{field}` is the URL-encoded input field, e.g. `/pages/{page}`. */
	readonly path: P & `/${string}` & RequestPath<P, Input>;
	readonly query?: Readonly<Record<string, RequestValue<Input>>>;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: Readonly<Record<string, RequestValue<Input>>>;
}

/**
 * A `1:N` request names the response field with the items, e.g. `results`. One request, no
 * pages. The host sends one request per item, so a `batch` action has no request binding.
 */
type RequestItems<C extends ActionFlow['cardinality']> = C extends '1:N'
	? { readonly items: string }
	: C extends 'batch'
		? never
		: { readonly items?: never };

/** How the action runs: code (`run`), or a request description the host sends (`request`). */
export type ActionBinding<
	Full extends Shape,
	O extends AnySchema,
	F extends ActionFlow,
	P extends string,
	Outs extends ActionOutputs | undefined,
> =
	| {
			/** `flow.cardinality` sets how often it runs and what it gives back, see `RunResult`. */
			run(
				context: ContextOf<F['cardinality'], RunInput<Full>>,
			): RunResult<F['cardinality'], Emit<F['cardinality'], Infer<O>, Outs>>;
			readonly request?: never;
	  }
	| {
			readonly request: RequestBinding<RunInput<Full>, P> & RequestItems<F['cardinality']>;
			readonly run?: never;
			// The response goes to the only output.
			readonly outputs?: never;
	  };

interface ContractSpec<Own extends Shape, O extends AnySchema, Sc extends string> {
	/** Integer major, 1 when omitted. It is the n8n `typeVersion`. */
	readonly version?: number;
	/** Bump for an additive contract change. 0 when omitted. */
	readonly minor?: number;
	/** Bump for a code change that keeps the contract hash. 0 when omitted. */
	readonly patch?: number;
	/** At most 120 characters. */
	readonly summary: string;
	/** The scopes of the node's credential that this contract needs. */
	readonly scopes?: readonly Sc[];
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
> extends ContractSpec<Own, O, Sc> {
	/** The label users pick, e.g. "Get many database pages". */
	readonly action: string;
	readonly flow: F;
	readonly egress?: Egress<RunInput<Full>, H>;
	/** Named outputs. An input list can name them, e.g. one output per Switch case. */
	readonly outputs?: Outs;
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
> = ActionSpecBase<Own, Full, O, F, Sc, Outs, H> & ActionBinding<Full, O, F, P, Outs>;

/** What every contract has after its node built it. */
interface Built {
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
	readonly scopes: readonly string[];
}

export type Action<
	S extends Shape = Shape,
	O extends AnySchema = AnySchema,
	F extends ActionFlow = ActionFlow,
	Outs extends ActionOutputs | undefined = ActionOutputs | undefined,
> = ActionSpec<S, S, O, F, string, string, Outs> & Built;

type TriggerHead<Own extends Shape, O extends AnySchema, Sc extends string> = ContractSpec<
	Own,
	O,
	Sc
> & {
	/** The label users pick, e.g. "On page added to database". */
	readonly trigger: string;
};

type WebhookSource<I, Out, K extends string> = {
	readonly webhook: WebhookConfig<I, Out, K>;
	readonly poll?: never;
};

type PollSource<I, T, Out> = { readonly poll: PollConfig<I, T, Out>; readonly webhook?: never };

/** What an author writes for one trigger: a webhook the service calls, or a poll. */
export type TriggerSpec<
	Own extends Shape,
	Full extends Shape,
	O extends AnySchema,
	Sc extends string = string,
	K extends string = string,
	T = unknown,
> = TriggerHead<Own, O, Sc> &
	(WebhookSource<RunInput<Full>, Infer<O>, K> | PollSource<RunInput<Full>, T, Infer<O>>);

/** A trigger starts an execution. Each emitted item matches `output`. `kind` names its source. */
export type Trigger<S extends Shape = Shape, O extends AnySchema = AnySchema> = TriggerHead<
	S,
	O,
	string
> &
	Built &
	(
		| ({ readonly kind: 'webhook' } & WebhookSource<RunInput<S>, Infer<O>, string>)
		| ({ readonly kind: 'poll' } & PollSource<RunInput<S>, unknown, Infer<O>>)
	);

/** Where a contract sits in its node: the resource, if any, and the operation or event. */
export interface ActionPath {
	readonly resource?: string;
	readonly operation: string;
}

export interface ResourcePath {
	readonly resource: string;
	readonly operation: string;
}

function built(
	node: NodeDefinition,
	path: ActionPath,
	spec: Pick<
		ContractSpec<Shape, AnySchema, string>,
		'version' | 'minor' | 'patch' | 'input' | 'scopes'
	>,
) {
	const version = spec.version ?? 1;
	return {
		node,
		id: [node.id, path.resource, path.operation].filter((part) => part !== undefined).join('.'),
		version,
		semver: `${version}.${spec.minor ?? 0}.${spec.patch ?? 0}`,
		inputSchema: obj(spec.input).json,
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
>(
	node: NodeDefinition,
	path: P,
	spec: ActionSpec<S, S, O, F, string, string, Outs>,
): Action<S, O, F, Outs> & P {
	return { ...spec, ...path, ...built(node, path, spec) };
}

function toTrigger<S extends Shape, O extends AnySchema, P extends ActionPath>(
	node: NodeDefinition,
	path: P,
	spec: TriggerSpec<S, S, O>,
): Trigger<S, O> & P {
	const head = { ...spec, ...path, ...built(node, path, spec) };
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
>(
	operation: string,
	spec: ActionSpec<S, RS & S, O, F, ScopeOf<N>, P, Outs, H> & OutputsCheck<Outs, RS & S>,
) => Action<RS & S, O, F, Outs> & Path;

type NodeTrigger<N extends NodeDefinition, RS extends Shape, Path extends ActionPath> = <
	S extends Shape,
	O extends AnySchema,
	T = unknown,
>(
	event: string,
	spec: TriggerSpec<S, RS & S, O, ScopeOf<N>, CredentialKey<CredentialTypeOf<N>>, T>,
) => Trigger<RS & S, O> & Path;

/** A resource of a node. Its `input` goes into the input of each of its actions and triggers. */
export interface NodeResource<N extends NodeDefinition, RS extends Shape> {
	readonly name: string;
	readonly action: NodeAction<N, RS, ResourcePath>;
	/** A trigger on this resource, e.g. `databasePage.trigger('added', …)`. */
	readonly trigger: NodeTrigger<N, RS, ResourcePath>;
}

/** A node and its builders. Each child comes from its parent, so a node never imports its actions. */
export type NodeBuilder<N extends NodeDefinition> = N & {
	resource<RS extends Shape = Record<never, never>>(
		name: string,
		options?: { readonly input: RS },
	): NodeResource<N, RS>;
	readonly action: NodeAction<N, Record<never, never>, ActionPath>;
	readonly trigger: NodeTrigger<N, Record<never, never>, ActionPath>;
};

function buildersOf<N extends NodeDefinition, RS extends Shape, Path extends ActionPath>(
	node: N,
	shared: RS,
	pathOf: (operation: string) => Path,
): { readonly action: NodeAction<N, RS, Path>; readonly trigger: NodeTrigger<N, RS, Path> } {
	// Typed by `NodeAction`: a second generic signature would infer `P` again and not match.
	const action: NodeAction<N, RS, Path> = (operation, spec) =>
		toAction(node, pathOf(operation), { ...spec, input: { ...shared, ...spec.input } });
	return {
		action,
		trigger: <S extends Shape, O extends AnySchema, T>(
			event: string,
			spec: TriggerSpec<S, RS & S, O, ScopeOf<N>, CredentialKey<CredentialTypeOf<N>>, T>,
		) => {
			const input: RS & S = { ...shared, ...spec.input };
			return toTrigger<RS & S, O, Path>(node, pathOf(event), { ...spec, input });
		},
	};
}

/** The action id is the node id, the resource name, and the operation, joined with dots. */
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
	readonly id: string;
	/** The major. Minor and patch live in the version manifest. */
	readonly version: number;
	readonly node: string;
	/** The label: the action, or the trigger event. */
	readonly action: string;
	readonly summary: string;
	readonly flow: ActionFlow & { readonly passthrough: 'replace' };
	readonly credentials: readonly string[];
	/** The scopes of the node's credential it needs. Absent when it needs none. */
	readonly scopes?: readonly string[];
	/** Set on a trigger: it starts a workflow and reads no items. */
	readonly trigger?: TriggerKind;
	readonly input: JsonSchema;
	readonly output: JsonSchema;
	/** Named outputs in n8n output order. Absent for one unnamed output. */
	readonly outputs?: ActionOutputs;
	/** The declared egress, hosts sorted. Absent when the action reaches its base URL hosts only. */
	readonly egress?: ContractEgress;
}

export interface ContractEgress {
	readonly hosts?: readonly string[];
	readonly fromInput?: string;
}

type ContractSource = Pick<
	Action,
	'id' | 'version' | 'node' | 'summary' | 'credentialTypes' | 'inputSchema' | 'output'
> & { readonly scopes?: readonly string[] } & (
		| Pick<Action, 'action' | 'flow' | 'outputs' | 'egress'>
		| Pick<Trigger, 'trigger' | 'kind'>
	);

/** Hosts are a set, so their order is not part of the contract. */
function contractEgressOf(egress: ContractEgress | undefined): ContractEgress | undefined {
	const hosts = [...new Set(egress?.hosts ?? [])].sort();
	const fromInput = egress?.fromInput;
	if (hosts.length === 0 && fromInput === undefined) return undefined;
	return { ...(hosts.length ? { hosts } : {}), ...(fromInput === undefined ? {} : { fromInput }) };
}

// A trigger emits the items of one event: it reads the service, and one event gives N items.
const TRIGGER_FLOW: ActionFlow = { effect: 'read', cardinality: '1:N' };

export const toContract = (source: ContractSource): ContractDocument => {
	const egress = 'kind' in source ? undefined : contractEgressOf(source.egress);
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
		...('kind' in source ? { trigger: source.kind } : {}),
		input: source.inputSchema,
		output: source.output.json,
		...(!('kind' in source) && source.outputs ? { outputs: source.outputs } : {}),
		...(egress ? { egress } : {}),
	};
};

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

/** The action has a `binary()` field, so its bundle targets `n8n:action@2.2.0`. */
export const usesBinary = (contract: Pick<ContractDocument, 'input' | 'output'>) =>
	hasBinary(contract.input) || hasBinary(contract.output);

/**
 * A binary output field becomes `item.binary.<field>`, so it must be a top-level field, and
 * `binary` is not a JSON field name.
 */
function binaryOutputIssues({ id, output }: ContractDocument): string[] {
	const reserved = output.properties?.binary
		? [`${id}: output field "binary" is reserved for binaries`]
		: [];
	if (!hasBinary(output)) return reserved;
	const fields = Object.entries(output.properties ?? {});
	const nested = fields.filter(([, field]) => !field['x-n8n-binary'] && hasBinary(field));
	const outside = hasBinary({ ...output, properties: {} });
	return [
		...nested.map(([name]) => `${id}: output.${name} holds a binary below the top level`),
		...(outside ? [`${id}: a binary output must be a top-level field of an object`] : []),
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

/** Prose budgets from the contract format: summary at most 120, each hint at most 80. */
export function lintContract(contract: ContractDocument): string[] {
	const names = fixedOutputNames(contract.outputs);
	return [
		...(contract.summary.length > 120 ? [`${contract.id}: summary is over 120 characters`] : []),
		...(new Set(names).size < names.length ? [`${contract.id}: output names repeat`] : []),
		...[...hints(contract.input), ...hints(contract.output)]
			.filter((hint) => hint.length > 80)
			.map((hint) => `${contract.id}: hint is over 80 characters: ${hint}`),
		...binaryOutputIssues(contract),
		...(hasHiddenBinary(contract.input)
			? [`${contract.id}: an input binary must be a field, a list item, or in a variant branch`]
			: []),
		...egressIssues(contract),
	];
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
