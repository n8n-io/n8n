import { errorChain } from '@n8n/utils/errors/error-chain';
import { findPlaceholderDetails, formatPlaceholderPath } from '@n8n/utils/placeholder';
import { sleep } from '@n8n/utils/sleep';
import { Readable } from 'node:stream';
import { compileFunction } from 'node:vm';
import {
	BINARY_ENCODING,
	isBinaryValue,
	isFromAIOnlyExpression,
	jsonParse,
	nodeNameToToolName,
	NodeOperationError,
	safeRegex,
	traverseNodeParameters,
	UnexpectedError,
	UserError,
	VersionedNodeType,
	type FromAIArgument,
	type IBinaryData,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestOptions,
	type INode,
	type INodeExecutionData,
	type INodeInputConfiguration,
	type INodeProperties,
	type IPairedItemData,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { fromActionApiV1 } from './action-api-v1';
import { credentialBaseUrlOf, plainFieldsOf, redactedValue, secretRedactorOf } from './credentials';
import { codeRunnerOf, dataTableHostOf, dataTablesOf } from './host-imports';
import { actionHostsOf, credentialHostsOf, egressOf } from './egress';
import { parameterValue, toProperty } from './properties';
import {
	isHttpError,
	isToolContract,
	usesBinary,
	type Action,
	type ActionInputs,
	type ActionOutputs,
	type Binaries,
	type CodeRunner,
	type DataTable,
	type DataTables,
	type HostImport,
	type HostImports,
	type Http,
	type HttpMethod,
	type HttpRequest,
	limitOf,
	type ListBinding,
	type LogLevel,
	type NodeDefinition,
	nextLinkOf,
	nextOffsetOf,
	type PageParam,
	pages,
	paging,
	type RequestBinding,
	type RequestValue,
	type RunInput,
	type RunLimits,
	type Trigger,
} from './define';
import {
	hasBinary,
	hasPageValue,
	type AnySchema,
	type Binary,
	type JsonSchema,
	type Shape,
} from './schema';
import {
	fromLangChainTool,
	isSupply,
	SUPPLY_CONNECTIONS,
	suppliedKindOf,
	supplyFieldsOf,
	supplyOf,
	type SupplyField,
	type SupplyKind,
	type Tool,
} from './subnodes';
import { applyDefaults, list, matches, parse, validate } from './validate';
import {
	assertNodeContract,
	implementsNodeContract,
	IMPLEMENTED_NODE_CONTRACTS,
	sha256,
	type NodeContractVersion,
	type VersionManifest,
} from './version';

const isRecord = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
	typeof value === 'object' && value !== null && Symbol.asyncIterator in value;

const isIterable = (value: unknown): value is Iterable<unknown> =>
	typeof value === 'object' && value !== null && Symbol.iterator in value;

/** `notion.databasePage.getAll` → `notionDatabasePageGetAll`. */
export const nodeNameOf = (actionId: string) =>
	actionId
		.split('.')
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('');

/** The default of the legacy HTTP Request node. */
const DEFAULT_TIMEOUT_MS = 300_000;

// n8n sends `id[0]=a` for an array by default. Only a request with an array sets this.
const REPEAT_KEYS: Pick<IHttpRequestOptions, 'arrayFormat'> = { arrayFormat: 'repeat' };

const isWebUrl = (url: URL) => url.protocol === 'http:' || url.protocol === 'https:';

/** The absolute URL of a request. A `path` cannot leave the origin of the base URL. */
function requestUrlOf(request: HttpRequest, baseUrl: string | undefined): string {
	if (request.url !== undefined) {
		if (!URL.canParse(request.url) || !isWebUrl(new URL(request.url))) {
			throw new UserError('The request URL must be an absolute http or https URL');
		}
		return request.url;
	}
	const { path } = request;
	if (!/^\/(?![/\\])/.test(path)) {
		throw new UserError('The request path must start with one "/"');
	}
	if (!baseUrl || !URL.canParse(baseUrl) || !isWebUrl(new URL(baseUrl))) {
		throw new UserError('The request has a path, and no http or https base URL');
	}
	const base = new URL(baseUrl);
	// `new URL('/x', base)` drops the base path, so the path goes after it.
	const url = new URL(`${base.pathname.replace(/\/$/, '')}${path}`, base);
	if (url.origin !== base.origin) {
		throw new UserError('The request path leaves the origin of the base URL');
	}
	return url.href;
}

export function toRequestOptions(
	request: HttpRequest,
	baseUrl: string | undefined,
): IHttpRequestOptions {
	const query = Object.fromEntries(
		Object.entries(request.query ?? {}).flatMap(([key, value]) =>
			value === undefined ? [] : [[key, Array.isArray(value) ? [...value] : value]],
		),
	);
	return {
		method: request.method ?? 'GET',
		url: requestUrlOf(request, baseUrl),
		qs: query,
		...(Object.values(query).some(Array.isArray) ? REPEAT_KEYS : {}),
		headers: { ...request.headers },
		json: true,
		...(request.body !== undefined ? { body: request.body } : {}),
		...(request.fullResponse ? { returnFullResponse: true } : {}),
		timeout: request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
	};
}

const IDEMPOTENT_METHODS: ReadonlySet<HttpMethod> = new Set(['GET', 'HEAD', 'PUT']);
const RETRY_STATUSES: ReadonlySet<number> = new Set([429, 502, 503, 504]);
const RETRY_CODES: ReadonlySet<string> = new Set([
	'ECONNRESET',
	'ECONNREFUSED',
	'ETIMEDOUT',
	'EPIPE',
	'EAI_AGAIN',
	'UND_ERR_SOCKET',
]);
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;
/** A request that asks for a longer wait fails: the run would hold its worker too long. */
const RETRY_MAX_MS = 30_000;

/** `Retry-After` in seconds or as an HTTP date. */
function retryAfterMs(value: string | undefined): number | undefined {
	const text = value?.trim();
	if (!text) return undefined;
	if (/^\d+$/.test(text)) return Number(text) * 1000;
	const date = Date.parse(text);
	return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

// A local classifier: `retryabilityFromError` in @n8n/backend-network needs DI and undici.
/** The wait before retry number `retry`, or `undefined` when a retry cannot help. */
function retryDelay(error: unknown, retry: number): number | undefined {
	const transient = isHttpError(error)
		? RETRY_STATUSES.has(error.status)
		: errorChain(error).some(({ code }) => typeof code === 'string' && RETRY_CODES.has(code));
	if (!transient || retry >= MAX_RETRIES) return undefined;
	const asked = isHttpError(error) ? retryAfterMs(error.headers['retry-after']) : undefined;
	// Full jitter: executions that failed together do not retry together.
	const delay = asked ?? Math.random() * RETRY_BASE_MS * 2 ** retry;
	return delay <= RETRY_MAX_MS ? delay : undefined;
}

/** The HTTP response on a failed request: on the transport error, or on its `cause` in a NodeApiError. */
function responseOf(error: unknown): IDataObject | undefined {
	if (!isRecord(error)) return undefined;
	const { response, cause } = error;
	if (isRecord(response) && typeof response.status === 'number') return response;
	return cause === undefined ? undefined : responseOf(cause);
}

const headerText = (value: unknown): string | undefined =>
	Array.isArray(value)
		? value.filter((entry) => typeof entry === 'string').join(', ')
		: typeof value === 'string' || typeof value === 'number'
			? String(value)
			: undefined;

const headersOf = (headers: unknown): Record<string, string> =>
	Object.fromEntries(
		Object.entries(isRecord(headers) ? headers : {}).flatMap(([name, value]) => {
			const text = headerText(value);
			return text === undefined ? [] : [[name.toLowerCase(), text]];
		}),
	);

/** Adds the `HttpError` fields (status, headers, body) to the error n8n threw. */
export function withResponse(error: unknown): unknown {
	const response = responseOf(error);
	if (!(error instanceof Error) || !response) return error;
	// Change the caught error in place, so n8n still shows its NodeApiError message.
	return Object.assign(error, {
		status: response.status,
		headers: headersOf(response.headers),
		body: response.data,
	});
}

/** The credential `run()` gets: the type name and the fields without secrets. */
type RunCredentialValue =
	| { readonly type: string; readonly fields: Record<string, unknown> }
	| undefined;

/** Error members that n8n shows or stores, and the `HttpError` members that `run()` reads. */
const REDACTED_MEMBERS = ['description', 'messages', 'body', 'headers', 'context', 'errorResponse'];

/**
 * Removes the secrets of the credential from an error. It changes the error in place, as
 * `withResponse` does, so n8n keeps its class and message.
 */
function redactedError(error: unknown, redact: (text: string) => string): unknown {
	if (typeof error === 'string') return redact(error);
	if (!(error instanceof Error) || !isRecord(error)) return error;
	// Defined, not assigned: a `DOMException` has its message as a getter only.
	const set = (key: string, value: unknown) => {
		const own = Object.getOwnPropertyDescriptor(error, key);
		if (error[key] === value || own?.configurable === false) return;
		const enumerable = own?.enumerable ?? false;
		Object.defineProperty(error, key, { value, writable: true, configurable: true, enumerable });
	};
	const { cause } = error;
	set('message', redact(error.message));
	if (error.stack !== undefined) set('stack', redact(error.stack));
	REDACTED_MEMBERS.filter((key) => key in error).forEach((key) =>
		set(key, redactedValue(error[key], redact)),
	);
	const { response } = error;
	if (isRecord(response)) {
		// The client response also holds the signed request, so only its HTTP parts stay.
		const { status, statusText, headers, data } = response;
		set(
			'response',
			redactedValue({ status, statusText, headers: headersOf(headers), data }, redact),
		);
	}
	if (cause instanceof Error) {
		// The cause of a NodeApiError is the HTTP client error, which holds the signed request.
		set('cause', Object.assign(new Error(redact(cause.message)), { name: cause.name }));
	}
	return error;
}

export const AUTHENTICATION = 'authentication';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** What the runtime reads of an action or a trigger to pick its credential. */
export type CredentialUser = Pick<Action, 'credentialTypes' | 'node'>;

export const hasSelector = ({ credentialTypes, node }: CredentialUser) =>
	credentialTypes.length > 1 || node.credential?.optional === true;

/** The credential type a node runs with: the selected one, else the one the node has. */
export function credentialTypeOf(
	user: CredentialUser,
	node: INode,
	selected: unknown,
): string | undefined {
	const { credentialTypes } = user;
	const credentials = node.credentials ?? {};
	return (
		credentialTypes.find((type) => type === selected) ??
		(selected === 'none'
			? undefined
			: credentialTypes.find((type) => credentials[type] !== undefined))
	);
}

/**
 * The base URL for one credential: the credential type's (an account server) or the node's.
 * Only a type with `baseUrl` reads the stored data.
 */
export async function baseUrlOf(
	node: NodeDefinition,
	type: string | undefined,
	read: (type: string) => Promise<unknown>,
): Promise<string | undefined> {
	const value = node.credential?.types.find(({ name }) => name === type);
	if (!type || value?.baseUrl === undefined) return node.baseUrl;
	const { baseUrl } = value;
	return typeof baseUrl === 'string' && !baseUrl.includes('{')
		? baseUrl
		: credentialBaseUrlOf(value, await read(type));
}

/** The node description parts for the credential: the selector and the credential slots. */
export function credentialDescriptionOf(user: CredentialUser) {
	// A selector lets setup see one credential slot; each credential shows for its own value.
	const { credentialTypes } = user;
	const optional = user.node.credential?.optional === true;
	const selector: INodeProperties[] = hasSelector(user)
		? [
				{
					displayName: 'Authentication',
					name: AUTHENTICATION,
					type: 'options',
					options: [...(optional ? ['none'] : []), ...credentialTypes].map((value) => ({
						name: value,
						value,
					})),
					default: optional ? 'none' : (credentialTypes[0] ?? 'none'),
				},
			]
		: [];
	const credentials = credentialTypes.map((name) => ({
		name,
		required: !optional,
		...(selector.length > 0 ? { displayOptions: { show: { [AUTHENTICATION]: [name] } } } : {}),
	}));
	return { selector, credentials };
}

const DEFAULT_LIMITS: RunLimits = { maxRequests: 10_000, maxItems: 1_000_000 };

// An action that logs in a loop must not fill the n8n log.
const MAX_LOG_LENGTH = 2_000;
const MAX_LOG_LINES = 100;

/** File details for the store, from the action or from the response headers. */
export interface BinaryWriteMeta {
	readonly mimeType?: string;
	readonly fileName?: string;
}

/** The n8n binary data store. `IBinaryData` is the entry an n8n item keeps under `binary`. */
export interface BinaryStore {
	/** The binary a parameter names on input item `itemIndex`: a binary field name or a binary object. */
	input(itemIndex: number, value: unknown): Promise<IBinaryData>;
	/** A new stream from the first byte. */
	read(binary: IBinaryData): Promise<Readable>;
	/** Stores the bytes as they arrive. */
	write(bytes: Readable, meta: BinaryWriteMeta): Promise<IBinaryData>;
}

/** The n8n services the executor uses. Fixture replay and `runAction` provide them without n8n. */
export interface ExecutorHost {
	/** The input items. A passed item keeps its binary data. */
	readonly items: readonly INodeExecutionData[];
	readonly node: INode;
	/**
	 * The parameter value, as `getNodeParameter` returns it. `raw` keeps its expressions
	 * unresolved, for a field with a `pageValue()` that `run()` reads for each page.
	 */
	parameter(name: string, itemIndex: number, raw?: boolean): unknown;
	request(options: IHttpRequestOptions, credentialType: string | undefined): Promise<unknown>;
	/**
	 * The stored data of a credential: the fields `baseUrl` reads and the user's "Allowed HTTP
	 * Request Domains" setting. Without it, only the declared credential hosts limit a request.
	 */
	credentialData?(credentialType: string): Promise<unknown>;
	continueOnFail(): boolean;
	/** Waits before a retry. */
	wait?(ms: number): Promise<void>;
	log?(level: LogLevel, message: string): void;
	readonly limits?: Partial<RunLimits>;
	/** Needed by an action with a `binary()` field only. */
	readonly binary?: BinaryStore;
	/** The items of input `index`, for an action with named inputs. Input 0 is `items`. */
	inputItems?(index: number): readonly INodeExecutionData[];
	/** Needed by an action that imports `dataTables`. */
	readonly dataTables?: DataTables;
	/** Needed by an action that imports `code`. */
	readonly code?: CodeRunner;
	/** Needed by an action that imports `wait`: the next nodes run at `at`, not before. */
	waitUntil?(at: Date): Promise<void>;
	/**
	 * What the sub-nodes of a `kind` supply: one value, a list, or `undefined`. Needed by an
	 * action with a `supplied()` input field only.
	 */
	supplied?(kind: SupplyKind): Promise<unknown>;
}

/** The n8n context of a node run: `execute()` of a root node, `supplyData()` of a sub-node. */
type NodeContext = IExecuteFunctions | ISupplyDataFunctions;

const binaryStoreOf = (context: NodeContext): BinaryStore => ({
	input: async (itemIndex, value) => {
		if (typeof value !== 'string' && !isBinaryValue(value)) {
			throw new NodeOperationError(
				context.getNode(),
				'A binary field needs the name of a binary of the input item, e.g. data',
				{ itemIndex },
			);
		}
		const data = context.helpers.assertBinaryData(itemIndex, value);
		if (data.bytes !== undefined) return data;
		// Entries stored before n8n kept `bytes` have only the size in the store.
		const bytes = data.id
			? (await context.helpers.getBinaryMetadata(data.id)).fileSize
			: Buffer.byteLength(data.data, BINARY_ENCODING);
		return { ...data, bytes };
	},
	read: async (data) =>
		data.id
			? await context.helpers.getBinaryStream(data.id)
			: Readable.from([Buffer.from(data.data, BINARY_ENCODING)]),
	write: async (bytes, { fileName, mimeType }) =>
		await context.helpers.prepareBinaryData(bytes, fileName, mimeType),
});

/** The host parts that do not depend on the items of the run. */
const hostBaseOf = (context: NodeContext) => ({
	node: context.getNode(),
	request: async (options: IHttpRequestOptions, credentialType: string | undefined) => {
		const response: unknown = credentialType
			? await context.helpers.httpRequestWithAuthentication.call(context, credentialType, options)
			: await context.helpers.httpRequest(options);
		return response;
	},
	credentialData: async (type: string) => await context.getCredentials(type),
	wait: async (ms: number) => await sleep(ms, context.getExecutionCancelSignal()),
	log: (level: LogLevel, message: string) =>
		context.logger[level](message, { node: context.getNode().name }),
	binary: binaryStoreOf(context),
});

// n8n gives sub-nodes the root item 0, as the legacy chains read their model.
const SUPPLY_ITEM = 0;

const hostOf = (context: IExecuteFunctions): ExecutorHost => ({
	...hostBaseOf(context),
	items: context.getInputData(),
	parameter: (name, itemIndex, raw) =>
		context.getNodeParameter(name, itemIndex, undefined, raw ? { rawExpressions: true } : {}),
	continueOnFail: () => context.continueOnFail(),
	inputItems: (index) => {
		try {
			return context.getInputData(index);
		} catch {
			// An input without a connection has no data.
			return [];
		}
	},
	dataTables: dataTablesOf(dataTableHostOf(context)),
	code: codeRunnerOf(context),
	// A time wait gives no resume URL, as the Wait node does for a time interval.
	waitUntil: async (at) => await context.putExecutionToWait(at, { acceptsResumeRequest: false }),
	supplied: async (kind) =>
		await context.getInputConnectionData(SUPPLY_CONNECTIONS[kind], SUPPLY_ITEM),
});

/**
 * A sub-node runs as one item. Its parameters resolve against item `itemIndex` of the root
 * node, and a failure always reaches the root node.
 */
const supplyHostOf = (context: ISupplyDataFunctions, itemIndex: number): ExecutorHost => ({
	...hostBaseOf(context),
	items: [{ json: {} }],
	parameter: (name, _itemIndex, raw) =>
		context.getNodeParameter(name, itemIndex, undefined, raw ? { rawExpressions: true } : {}),
	continueOnFail: () => false,
	supplied: async (kind) =>
		await context.getInputConnectionData(SUPPLY_CONNECTIONS[kind], itemIndex),
});

const inputValue = <I>(value: RequestValue<I>, input: Readonly<Record<string, unknown>>) =>
	typeof value === 'object' ? input[value.input] : value;

const inputValues = <I>(
	values: Readonly<Record<string, RequestValue<I>>> | undefined,
	input: Readonly<Record<string, unknown>>,
) =>
	values &&
	Object.fromEntries(
		Object.entries(values).flatMap(([key, value]) => {
			const resolved = inputValue(value, input);
			return resolved === undefined ? [] : [[key, resolved]];
		}),
	);

const queryValue = (value: unknown) =>
	typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
		? value
		: JSON.stringify(value);

/** The request of a declarative binding for one item's input. */
export function requestOf<I>(binding: RequestBinding<I>, input: I): HttpRequest {
	const values: Readonly<Record<string, unknown>> = isRecord(input) ? input : {};
	const path = binding.path.replace(/\{([^}]+)\}/g, (_, field: string) => {
		const value = values[field];
		// An empty segment sends the request to another URL, e.g. a collection.
		if (value === undefined || value === '') {
			throw new UserError(`The path field "${field}" has no value`);
		}
		return encodeURIComponent(String(queryValue(value)));
	});
	const query =
		typeof binding.query === 'function' ? binding.query(input) : inputValues(binding.query, values);
	const headers = typeof binding.headers === 'function' ? binding.headers(input) : binding.headers;
	const body = inputValues(binding.body, values);
	return {
		method: binding.method ?? 'GET',
		path: `/${path.replace(/^\//, '')}`,
		...(query
			? {
					query: Object.fromEntries(
						Object.entries(query).map(([key, value]) => [
							key,
							Array.isArray(value) || value === undefined ? value : queryValue(value),
						]),
					),
				}
			: {}),
		...(headers ? { headers } : {}),
		...(body ? { body } : {}),
	};
}

/** The request with `value` in the query parameter or the body field that `param` names. */
const withParam = (request: HttpRequest, param: PageParam, value: string | number): HttpRequest =>
	param.query === undefined
		? { ...request, body: { ...(isRecord(request.body) ? request.body : {}), [param.body]: value } }
		: { ...request, query: { ...request.query, [param.query]: value } };

/**
 * The outputs of a `list` binding, page by page. The host checks each page against `response`,
 * applies the `paging` input, and stops at the end of the list or at a repeated cursor.
 */
export function listItems<I>(
	http: Http,
	binding: ListBinding<I, string, AnySchema, unknown>,
	input: I,
) {
	const style = binding.pages;
	const first = requestOf(binding, input);
	const linked = style?.style === 'link';
	// The `Link` header is in the full response, so a linked list reads it.
	const pageOf = (response: unknown) => {
		const full = linked && isRecord(response) ? response : {};
		return {
			body: parse(binding.response, linked ? full.body : response, 'page'),
			link: isRecord(full.headers) ? headerText(full.headers.link) : undefined,
		};
	};
	const byPage = style?.style === 'offset' && style.unit === 'page';
	/** Page numbers count pages of one size, so a numbered list asks for the same size each time. */
	const sizeFor = (room: number | undefined) =>
		style?.size && (byPage ? style.size.max : Math.min(room ?? style.size.max, style.size.max));
	const values: Readonly<Record<string, unknown>> = isRecord(input) ? input : {};
	return pages(http, {
		page: pageOf,
		request: (cursor, room) => {
			if (linked && cursor !== undefined) {
				return { method: first.method, url: cursor, headers: first.headers, fullResponse: true };
			}
			const size = sizeFor(room);
			const sized = style?.size && size !== undefined ? withParam(first, style.size, size) : first;
			const sent =
				style && style.style !== 'link' && cursor !== undefined
					? withParam(sized, style.send, style.style === 'offset' ? Number(cursor) : cursor)
					: sized;
			return linked ? { ...sent, fullResponse: true } : sent;
		},
		items: ({ body }) => binding.items(body, input),
		next: ({ body, link }, { items, cursor, room }) => {
			if (style?.style === 'cursor') return style.next(body);
			if (style?.style === 'link') return nextLinkOf(link);
			if (style?.style !== 'offset') return undefined;
			const { unit, start } = style;
			return nextOffsetOf(unit, { count: items.length, size: sizeFor(room), cursor, start });
		},
		limit: style && matches(paging, values.paging) ? limitOf(values.paging) : undefined,
		maxPages: style ? Infinity : 1,
	});
}

/** The output names for the parameters of the first item, or `undefined` for one unnamed output. */
function outputNamesOf(
	outputs: ActionOutputs | undefined,
	input: Readonly<Record<string, unknown>>,
): readonly string[] | undefined {
	if (outputs === undefined || !('each' in outputs)) return outputs;
	const entries = input[outputs.each];
	return [
		...(Array.isArray(entries) ? entries : []).map((entry: unknown) =>
			isRecord(entry) && typeof entry.output === 'string' ? entry.output : '',
		),
		...(outputs.then ?? []),
	];
}

/** The capabilities the sub-nodes supply, by field. A value of another kind fails the run. */
async function readSupplies(
	actionId: string,
	fields: readonly SupplyField[],
	host: ExecutorHost,
): Promise<Record<string, unknown>> {
	const { supplied } = host;
	if (!supplied) throw new UnexpectedError(`${actionId} takes sub-nodes, and this host has none`);
	const entries = await Promise.all(
		fields.map(async ({ name, kind, many }) => {
			const value = await supplied(kind);
			const values = (many ? list(value) : value === undefined ? [] : [value]).map((entry) =>
				fromLangChainTool(kind, entry),
			);
			if (!values.every((entry) => isSupply(kind, entry))) {
				throw new NodeOperationError(
					host.node,
					`The ${name} input needs a ${kind} from a node contract sub-node`,
					{ description: 'Connect a sub-node of @n8n/nodes-base-next to this input.' },
				);
			}
			return [name, many ? values : values[0]] as const;
		}),
	);
	return Object.fromEntries(entries.filter(([, value]) => value !== undefined));
}

/** One output item and the output it goes to. */
interface Routed {
	readonly output: number;
	readonly data: INodeExecutionData;
}

/** `value` with each binary in it replaced by `resolve(binary)`, along `schema`. */
export async function withBinaries(
	value: unknown,
	schema: JsonSchema,
	resolve: (binary: unknown) => Promise<unknown>,
): Promise<unknown> {
	if (value === undefined || !hasBinary(schema)) return value;
	if (schema['x-n8n-binary']) return await resolve(value);
	const { items } = schema;
	if (Array.isArray(value) && items) {
		return await Promise.all(value.map(async (entry) => await withBinaries(entry, items, resolve)));
	}
	if (!isRecord(value)) return value;
	const tag = schema.discriminator?.propertyName;
	const branch =
		tag === undefined
			? schema
			: schema.oneOf?.find((candidate) => candidate.properties?.[tag]?.const === value[tag]);
	const fields = await Promise.all(
		Object.entries(value).map(async ([key, entry]) => {
			const field = branch?.properties?.[key];
			return [key, field ? await withBinaries(entry, field, resolve) : entry] as const;
		}),
	);
	return Object.fromEntries(fields);
}

async function* buffersOf(
	chunks: AsyncIterable<Uint8Array | string> | Iterable<Uint8Array | string>,
) {
	for await (const chunk of chunks) {
		yield typeof chunk === 'string'
			? Buffer.from(chunk)
			: Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
	}
}

const decoded = (text: string) => {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
};

/** `report.pdf` from `attachment; filename="report.pdf"` or from the last segment of the URL. */
function fileNameOf(headers: Readonly<Record<string, string>>, url: string): string | undefined {
	const disposition = headers['content-disposition'] ?? '';
	const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
	const plain = /filename=\s*"?([^";]+)"?/i.exec(disposition)?.[1];
	const segment = URL.canParse(url) ? new URL(url).pathname.split('/').pop() : undefined;
	const name = encoded ?? plain ?? segment;
	return name ? decoded(name) : undefined;
}

/**
 * The executor of the action interface. Per-item and 1:N actions run once per input item with the
 * parameters of that item; a batch action runs once with all items and the parameters of the
 * first item. Each parameter set is filled with defaults and validated against `input`.
 * Transient failures of idempotent requests retry. Each output item is validated against
 * `output`, routed to its named output, and paired with the input items it comes from.
 * Continue-on-fail gives an error item on the last output, which n8n routes to the error
 * output when the node has one.
 */
/** A native action or trigger has no SDK runtime: n8n runs its built-in node, so nothing freezes or loads it. */
export const nativeRunError = ({ id, native }: Pick<Action | Trigger, 'id' | 'native'>) =>
	new UnexpectedError(`${id} runs as the built-in node ${native?.type ?? ''}`);

export function executorOf<S extends Shape, O extends AnySchema>(
	action: Action<S, O>,
): (host: ExecutorHost) => Promise<INodeExecutionData[][]> {
	if (action.native) throw nativeRunError(action);
	const supplyFields = supplyFieldsOf(action.input);
	const supplyNames = new Set(supplyFields.map(({ name }) => name));
	const inputKeys = Object.keys(action.input).filter((key) => !supplyNames.has(key));
	const jsonKeys = new Set(
		Object.entries(action.input)
			.filter(([name, schema]) => toProperty(name, schema).type === 'json')
			.map(([name]) => name),
	);
	const rawKeys = new Set(
		Object.entries(action.input)
			.filter(([, schema]) => hasPageValue(schema.json))
			.map(([name]) => name),
	);
	const outputSchema: JsonSchema = action.output.json;
	const passesOnly = outputSchema['x-n8n-passed'] === true;
	const isInput = (value: unknown): value is RunInput<S> =>
		validate(value, action.inputSchema).length === 0;
	const { request: binding, list: listBinding } = action;
	const isBatch = action.flow.cardinality === 'batch';
	const scope = isBatch ? 'one run' : 'one input item';
	const binaryApi = usesBinary({ input: action.inputSchema, output: outputSchema });
	const binaryKeys = Object.entries(outputSchema.properties ?? {})
		.filter(([, field]) => field['x-n8n-binary'])
		.map(([key]) => key);
	const declared: ReadonlySet<HostImport> = new Set(action.imports ?? []);

	return async (host) => {
		const { items } = host;
		const inputNames = action.inputs;
		const inputLists: ReadonlyArray<readonly INodeExecutionData[]> = inputNames
			? inputNames.map((_name, index) => (index === 0 ? items : (host.inputItems?.(index) ?? [])))
			: [items];
		// The bundle of an action without a binary field targets 2.1.0, which has no binary data.
		const binaryStore = (): BinaryStore => {
			if (!binaryApi) {
				throw new UnexpectedError(
					`${action.id} has no binary() field, so it targets Node Contract 2.1.0, which has no binary data`,
				);
			}
			if (!host.binary) {
				throw new UnexpectedError(
					`${action.id} uses binary data, and this host has no binary store`,
				);
			}
			return host.binary;
		};
		// The handle table of this execution: `run()` sees handles, never the n8n entries.
		const entries = new Map<unknown, IBinaryData>();
		async function* chunksOf(stream: AsyncIterable<unknown>) {
			for await (const chunk of stream) {
				if (!(chunk instanceof Uint8Array)) throw new UnexpectedError('A binary stream gave text');
				yield chunk;
			}
		}
		const handleOf = (entry: IBinaryData): Binary => {
			const { mimeType, fileName, bytes } = entry;
			const handle: Binary = Object.freeze({
				meta: Object.freeze({
					mimeType,
					...(fileName === undefined ? {} : { fileName }),
					...(bytes === undefined ? {} : { bytes }),
				}),
				async *read() {
					yield* chunksOf(await binaryStore().read(entry));
				},
			});
			entries.set(handle, entry);
			return handle;
		};
		const binaries: Binaries = {
			create: async (meta, chunks) =>
				handleOf(
					await binaryStore().write(Readable.from(buffersOf(chunks), { objectMode: false }), meta),
				),
		};

		// Frozen: `run()` gets the object that the host enforces.
		const limits: RunLimits = Object.freeze({ ...DEFAULT_LIMITS, ...host.limits });
		const wait = host.wait ?? (async (ms: number) => await sleep(ms));
		const selected = hasSelector(action) ? host.parameter(AUTHENTICATION, 0) : undefined;
		const credentialType = credentialTypeOf(action, host.node, selected);
		// One read per run: the base URL and the egress policy both need the stored data.
		const stored = new Map<string, Promise<unknown>>();
		const credentialData = async (type: string) => {
			if (!host.credentialData) throw new UnexpectedError(`${action.id} cannot read ${type}`);
			const read = stored.get(type) ?? host.credentialData(type);
			stored.set(type, read);
			return await read;
		};
		const baseUrl = await baseUrlOf(action.node, credentialType, credentialData);
		const credentialValue = action.node.credential?.types.find(
			({ name }) => name === credentialType,
		);
		// A failed read fails later, where the run needs the data; redaction then has the patterns.
		const storedCredential =
			credentialType && host.credentialData
				? await credentialData(credentialType).catch(() => undefined)
				: undefined;
		const redact = secretRedactorOf(credentialValue, storedCredential);
		// n8n stores a token it requested or refreshed during the run, so an error reads the data
		// again. A static scheme stores no token, and each read is a database read.
		const storesTokens = !['apply', 'when', 'none', 'custom'].includes(
			credentialValue?.scheme.kind ?? 'compat',
		);
		const redactNow = async () => {
			const now =
				credentialType && storesTokens
					? await host.credentialData?.(credentialType).catch(() => undefined)
					: undefined;
			if (now === undefined) return redact;
			const fresh = secretRedactorOf(credentialValue, now);
			return (text: string) => fresh(redact(text));
		};
		// Read when `run()` reads it: stored data that fails the declared fields fails only then.
		const runCredentials = new Map<'credential', RunCredentialValue>();
		const runCredential = (): RunCredentialValue => {
			const known = runCredentials.get('credential');
			if (known !== undefined || credentialType === undefined) return known;
			const fields = credentialValue ? plainFieldsOf(credentialValue, storedCredential) : {};
			const value = Object.freeze({ type: credentialType, fields });
			runCredentials.set('credential', value);
			return value;
		};
		const logged = { lines: 0 };
		const log = (level: LogLevel, message: string) => {
			logged.lines += 1;
			if (logged.lines <= MAX_LOG_LINES) {
				host.log?.(level, redact(String(message)).slice(0, MAX_LOG_LENGTH));
			} else if (logged.lines === MAX_LOG_LINES + 1) {
				host.log?.('warn', `${action.id} logged ${MAX_LOG_LINES} lines. n8n drops the rest.`);
			}
		};
		/** The policy for the requests of one item. A credential that refuses every host fails the item. */
		const egressPolicyOf = async (input: Readonly<Record<string, unknown>>, itemIndex: number) => {
			const data =
				credentialType && host.credentialData ? await credentialData(credentialType) : {};
			try {
				return {
					...actionHostsOf(action.egress, input, [action.node.baseUrl, baseUrl]),
					credential: credentialType
						? credentialHostsOf(credentialValue, data, {
								surface: action.node.displayName,
								baseUrl,
							})
						: undefined,
				};
			} catch (error) {
				if (!(error instanceof UserError)) throw error;
				throw new NodeOperationError(host.node, error.message, { itemIndex });
			}
		};
		/** `build` gives the options of each attempt, so a stream body opens again for a retry. */
		const send = async (
			build: () => Promise<IHttpRequestOptions>,
			retryable: boolean,
			retry: number,
		): Promise<unknown> => {
			try {
				return await host.request(await build(), credentialType);
			} catch (caught) {
				const error = withResponse(caught);
				const delay = retryable ? retryDelay(error, retry) : undefined;
				if (delay === undefined) throw redactedError(error, await redactNow());
				// The failed attempt is not read, so free its connection.
				if (isHttpError(error) && error.body instanceof Readable) error.body.destroy();
				await wait(delay);
				return await send(build, retryable, retry + 1);
			}
		};

		/** The body streams from the store. The response stays a stream when `response` is `binary`. */
		const sendBinary = async (
			request: HttpRequest,
			options: IHttpRequestOptions,
			retryable: boolean,
		): Promise<unknown> => {
			const store = binaryStore();
			const body = entries.get(request.body);
			const named = new Set(Object.keys(options.headers ?? {}).map((name) => name.toLowerCase()));
			const keep = request.response === 'binary';
			const build = async (): Promise<IHttpRequestOptions> => ({
				...options,
				...(body ? { body: await store.read(body) } : {}),
				headers: {
					...(body && !named.has('content-type') ? { 'content-type': body.mimeType } : {}),
					...(body?.bytes === undefined ? {} : { 'content-length': body.bytes }),
					// A file of any type, not the JSON that the client asks for by default.
					...(keep && !named.has('accept') ? { accept: '*/*' } : {}),
					...options.headers,
				},
				...(keep ? { json: false, encoding: 'stream', returnFullResponse: true } : {}),
				// To follow a redirect, the client keeps the whole body in memory to send it again.
				...(body ? { disableFollowRedirect: true } : {}),
			});
			if (!keep) return await send(build, retryable, 0);
			const response = await send(build, retryable, 0).catch((error: unknown) => {
				// An error response is not read, so free its connection.
				if (isHttpError(error) && error.body instanceof Readable) error.body.destroy();
				throw error;
			});
			const stream = isRecord(response) ? response.body : undefined;
			if (!(stream instanceof Readable)) {
				throw new UnexpectedError('The HTTP client gave no response stream');
			}
			const headers = headersOf(isRecord(response) ? response.headers : undefined);
			const entry = await store.write(stream, {
				mimeType: headers['content-type']?.split(';')[0]?.trim() || undefined,
				fileName: fileNameOf(headers, options.url),
			});
			const file = handleOf(entry);
			const statusCode = isRecord(response) ? response.statusCode : undefined;
			return request.fullResponse ? { body: file, headers, statusCode } : file;
		};

		const httpFor = (itemIndex: number, input: Readonly<Record<string, unknown>>): Http => {
			const sent = { requests: 0 };
			const policy = new Map<'policy', ReturnType<typeof egressPolicyOf>>();
			function request(
				options: HttpRequest & { readonly response: 'binary'; readonly fullResponse?: false },
			): Promise<Binary>;
			function request(options: HttpRequest): Promise<unknown>;
			async function request(options: HttpRequest): Promise<unknown> {
				if (sent.requests >= limits.maxRequests) {
					throw new NodeOperationError(
						host.node,
						`${action.id} sent ${limits.maxRequests} requests for ${scope}, the most one run may send`,
						{ itemIndex },
					);
				}
				sent.requests += 1;
				const retryable =
					options.retry ??
					(IDEMPOTENT_METHODS.has(options.method ?? 'GET') || action.flow.idempotent === true);
				const built = toRequestOptions(options, baseUrl);
				// Every request, page and binary transfer passes here; the request layer checks redirects.
				const current = policy.get('policy') ?? egressPolicyOf(input, itemIndex);
				policy.set('policy', current);
				const allowedDomains = egressOf(await current, built.url, {
					node: host.node,
					actionId: action.id,
					itemIndex,
				});
				const requestOptions = allowedDomains === undefined ? built : { ...built, allowedDomains };
				return options.response === 'binary' || entries.has(options.body)
					? await sendBinary(options, requestOptions, retryable)
					: await send(async () => requestOptions, retryable, 0);
			}
			return { request };
		};

		// One read per run: each read runs the sub-nodes and adds a sub-node run in n8n.
		const supplies = new Map<'supplies', Promise<Record<string, unknown>>>();
		const suppliesOf = async () => {
			const read = supplies.get('supplies') ?? readSupplies(action.id, supplyFields, host);
			supplies.set('supplies', read);
			return await read;
		};

		const inputOf = async (itemIndex: number): Promise<RunInput<S>> => {
			const parameters = Object.fromEntries(
				inputKeys
					.map(
						(key) =>
							[
								key,
								parameterValue(host.parameter(key, itemIndex, rawKeys.has(key)), jsonKeys.has(key)),
							] as const,
					)
					.filter(([, value]) => value !== undefined && value !== ''),
			);
			const placeholders = findPlaceholderDetails(parameters);
			if (placeholders.length > 0) {
				// The marker in the message lets the AI builder route the run to setup.
				const fields = placeholders.map(
					({ path, label }) =>
						`input.${formatPlaceholderPath(path)} (<__PLACEHOLDER_VALUE__${label}__>)`,
				);
				throw new NodeOperationError(
					host.node,
					`Needs setup: fill ${fields.join(', ')} before the run`,
					{ itemIndex },
				);
			}
			const defaulted = applyDefaults(parameters, action.inputSchema);
			const withFiles = binaryApi
				? await withBinaries(defaulted, action.inputSchema, async (value) =>
						handleOf(await binaryStore().input(itemIndex, value)),
					)
				: defaulted;
			// After the defaults: a capability is not data, so nothing may copy it.
			const input =
				supplyFields.length > 0 && isRecord(withFiles)
					? { ...withFiles, ...(await suppliesOf()) }
					: withFiles;
			if (!isInput(input)) {
				const issues = validate(input, action.inputSchema);
				throw new NodeOperationError(host.node, issues.join('; '), { itemIndex });
			}
			return input;
		};

		// Identity, not equality: a passed item must be one of the input items, of any input.
		const sources = new Map<
			unknown,
			{ readonly pair: IPairedItemData; readonly data: INodeExecutionData }
		>(
			inputLists.flatMap((list, input) =>
				list.map(
					(data, item) => [data, { pair: input > 0 ? { item, input } : { item }, data }] as const,
				),
			),
		);
		const fail = (message: string, itemIndex: number) =>
			new NodeOperationError(host.node, message, { itemIndex });

		const openTables = new Map<string, Promise<DataTable>>();
		const refuse = (name: HostImport) => {
			throw new UnexpectedError(`${action.id} does not list "${name}" in its imports`);
		};
		const hostService = <T>(name: HostImport, service: T | undefined): T => {
			if (!declared.has(name)) return refuse(name);
			if (service === undefined) {
				throw new UnexpectedError(`${action.id} imports "${name}", and this host has none`);
			}
			return service;
		};
		/** Only the declared imports work. The others throw, so a bundle cannot reach past its contract. */
		const imports: HostImports<RunInput<S>> = {
			dataTables: {
				// One open per table and run: a per-item action names the same table for each item.
				open: async (table) => {
					const key = JSON.stringify(table);
					const opened =
						openTables.get(key) ?? hostService('dataTables', host.dataTables).open(table);
					openTables.set(key, opened);
					return await opened.catch((error: unknown) => {
						openTables.delete(key);
						throw error;
					});
				},
				list: async (query) => await hostService('dataTables', host.dataTables).list(query),
				create: async (table) => await hostService('dataTables', host.dataTables).create(table),
			},
			code: { run: async (request) => await hostService('code', host.code).run(request) },
			wait: {
				until: async (at) => {
					if (Number.isNaN(at.getTime())) throw new UserError('The wait time is not a date');
					await hostService('wait', host.waitUntil)(at);
				},
			},
			inputOf: async (item) => {
				if (!declared.has('inputOf')) return refuse('inputOf');
				const source = sources.get(item);
				if (source === undefined || (source.pair.input ?? 0) > 0) {
					throw new UnexpectedError(
						`${action.id} reads the input of an item that is not an input item`,
					);
				}
				return await inputOf(source.pair.item);
			},
		};

		/** `current` is the input item of a per-item run; a batch output names its own lineage. */
		const routeOf = (names: readonly string[] | undefined, current: number | undefined) => {
			const sourceOf = (source: unknown, at: number) => {
				const known = sources.get(source);
				if (known === undefined)
					throw fail(
						`${action.id} output ${at} names an item that is not an input item`,
						current ?? 0,
					);
				return known;
			};
			const pairOf = (source: unknown, at: number) => sourceOf(source, at).pair;
			const lineageOf = (from: unknown, at: number) => {
				if (current !== undefined) return { item: current };
				if (!Array.isArray(from)) return pairOf(from, at);
				if (from.length === 0) throw fail(`${action.id} output ${at} comes from no input item`, 0);
				return from.map((source) => pairOf(source, at));
			};
			const checked = (json: unknown, at: number) => {
				const issues = validate(json, outputSchema, { path: `output[${at}]` });
				if (issues.length > 0 || !isRecord(json)) {
					throw fail(
						`Output does not match the contract: ${issues.join('; ') || 'not an object'}`,
						current ?? 0,
					);
				}
				return json;
			};
			/** A made item. A binary field leaves the JSON and becomes `item.binary.<field>`. */
			const made = (value: unknown, at: number): Pick<INodeExecutionData, 'json' | 'binary'> => {
				const json = checked(value, at);
				if (binaryKeys.length === 0) return { json };
				const binary = Object.fromEntries(
					binaryKeys.flatMap((key) => {
						if (json[key] === undefined) return [];
						const entry = entries.get(json[key]);
						if (!entry)
							throw fail(`output[${at}].${key}: must be a binary of this run`, current ?? 0);
						return [[key, entry] as const];
					}),
				);
				return {
					json: Object.fromEntries(
						Object.entries(json).filter(([key]) => !binaryKeys.includes(key)),
					),
					...(Object.keys(binary).length > 0 ? { binary } : {}),
				};
			};
			return (value: unknown, at: number): Routed => {
				if (at >= limits.maxItems) {
					throw fail(
						`${action.id} yielded ${limits.maxItems} items for ${scope}, the most one run may yield`,
						current ?? 0,
					);
				}
				if (passesOnly && !(isRecord(value) && value.item !== undefined)) {
					throw fail(
						`${action.id} passes items on unchanged, so output ${at} must be { item }`,
						current ?? 0,
					);
				}
				if (names === undefined && !isBatch && !passesOnly) {
					return {
						output: 0,
						data: { ...made(value, at), pairedItem: { item: current ?? 0 } },
					};
				}
				if (!isRecord(value))
					throw fail(`${action.id} output ${at} is not an object`, current ?? 0);
				const to = typeof value.to === 'string' ? value.to : JSON.stringify(value.to);
				const output = names === undefined ? 0 : names.indexOf(to);
				if (output < 0) {
					throw fail(
						`${action.id} routes output ${at} to "${to}", which is not one of ${names?.join(', ')}`,
						current ?? 0,
					);
				}
				if (value.item !== undefined) {
					if (current !== undefined && value.item !== items[current]) {
						throw fail(`${action.id} passes on an item other than the current item`, current);
					}
					const { pair: pairedItem, data: passed } = sourceOf(value.item, at);
					checked(passed.json, at);
					return { output, data: { ...passed, pairedItem } };
				}
				return {
					output,
					data: { ...made(value.json, at), pairedItem: lineageOf(value.from, at) },
				};
			};
		};

		/** Validates each output when it is given, so a bad output fails before the next page downloads. */
		const collect = async (result: unknown, route: (value: unknown, at: number) => Routed) => {
			const routed: Routed[] = [];
			if (!isAsyncIterable(result) && !isIterable(result)) {
				throw fail(
					`${action.id} is ${action.flow.cardinality}, so run() must give its outputs as a list or yield them`,
					0,
				);
			}
			for await (const value of result) routed.push(route(value, routed.length));
			return routed;
		};

		const runItem = async (itemIndex: number, names: readonly string[] | undefined) => {
			const item = items[itemIndex];
			if (!item) return [];
			const input = await inputOf(itemIndex);
			const route = routeOf(names, itemIndex);
			const http = httpFor(itemIndex, input);
			// The host sends a declarative request or list itself.
			const result: Promise<unknown> | AsyncIterable<unknown> | Iterable<unknown> | undefined =
				binding
					? http.request(requestOf(binding, input))
					: listBinding
						? listItems(http, listBinding, input)
						: action.run?.({
								input,
								http,
								log,
								limits,
								binary: binaries,
								item,
								get credential() {
									return runCredential();
								},
								...imports,
							});
			if (!result) throw new UnexpectedError(`${action.id} has no run() and no request`);
			if (action.flow.cardinality === 'per-item') return [route(await result, 0)];
			return await collect(result, route);
		};

		// The last output is the "no" path of a routing action: false, discarded, or fallback.
		const errorItem = (
			error: unknown,
			pairedItem: INodeExecutionData['pairedItem'],
			names: readonly string[] | undefined,
		): Routed => ({
			output: Math.max(0, (names?.length ?? 1) - 1),
			data: { json: { error: redact(errorMessage(error)) }, pairedItem },
		});

		// Outputs per entry take their names from the raw list of the first item, as the editor
		// does, so one bad item does not change the outputs of the others.
		const namesOf = (): readonly string[] | undefined => {
			const { outputs } = action;
			if (outputs === undefined || !('each' in outputs)) return outputs;
			try {
				const entries = parameterValue(host.parameter(outputs.each, 0), jsonKeys.has(outputs.each));
				return outputNamesOf(outputs, { [outputs.each]: entries });
			} catch (error) {
				if (!host.continueOnFail()) throw error;
				return outputNamesOf(outputs, {});
			}
		};

		const run = async (): Promise<{ names: readonly string[] | undefined; routed: Routed[] }> => {
			const names = namesOf();
			if (inputLists.every((list) => list.length === 0)) return { names, routed: [] };
			if (isBatch) {
				try {
					const input = await inputOf(0);
					const context = {
						input,
						http: httpFor(0, input),
						log,
						limits,
						binary: binaries,
						...imports,
					};
					// A getter, not a value: a spread would read the credential before `run()` does.
					const result = inputNames
						? action.run?.({
								...context,
								get credential() {
									return runCredential();
								},
								inputs: Object.fromEntries(
									inputNames.map((name, index) => [name, inputLists[index] ?? []]),
								),
							})
						: action.run?.({
								...context,
								get credential() {
									return runCredential();
								},
								items,
							});
					return { names, routed: await collect(result, routeOf(names, undefined)) };
				} catch (error) {
					if (!host.continueOnFail()) throw error;
					const all = [...sources.values()].map(({ pair }) => pair);
					return { names, routed: [errorItem(error, all, names)] };
				}
			}
			// One list for all items: a copy per item would make a large input quadratic.
			const routed: Routed[] = [];
			await items.reduce(async (previous, _item, itemIndex) => {
				await previous;
				try {
					for (const entry of await runItem(itemIndex, names)) routed.push(entry);
				} catch (error) {
					if (!host.continueOnFail()) throw error;
					routed.push(errorItem(error, { item: itemIndex }, names));
				}
			}, Promise.resolve());
			return { names, routed };
		};

		const { names, routed } = await run().catch(async (error: unknown) => {
			throw redactedError(error, await redactNow());
		});
		const duplicate = names?.find((name, index) => names.indexOf(name) !== index);
		if (duplicate !== undefined) throw fail(`${action.id} has two outputs named "${duplicate}"`, 0);
		const outputs: INodeExecutionData[][] = Array.from({ length: names?.length || 1 }, () => []);
		routed.forEach(({ output, data }) => outputs[output]?.push(data));
		return outputs;
	};
}

const GROUPS = { read: 'input', write: 'output', transform: 'transform' } as const;

/**
 * The n8n outputs of `outputs`. n8n evaluates this function as an expression in the editor;
 * it reads the list as the editor stores a `json` parameter: as text.
 */
function outputsPerEntry(parameters: Record<string, unknown>, each: string, then: string[]) {
	const value = parameters[each];
	const parsed: unknown = (() => {
		try {
			return typeof value === 'string' ? JSON.parse(value) : value;
		} catch {
			return [];
		}
	})();
	const entries: unknown[] = Array.isArray(parsed) ? parsed : [];
	const names = entries.map((entry, index) =>
		typeof entry === 'object' &&
		entry !== null &&
		'output' in entry &&
		typeof entry.output === 'string'
			? entry.output
			: String(index),
	);
	return [...names, ...then].map((displayName) => ({ type: 'main', displayName }));
}

/** @internal Exported for a test: the description keeps it as expression text only. */
export const outputsPerEntryOf = outputsPerEntry;

function outputsOf(
	outputs: ActionOutputs | undefined,
): Pick<INodeTypeDescription, 'outputs' | 'outputNames'> {
	if (outputs === undefined) return { outputs: ['main'] };
	if ('each' in outputs) {
		const args = [JSON.stringify(outputs.each), JSON.stringify(outputs.then ?? [])].join(', ');
		return { outputs: `={{(${outputsPerEntry.toString()})($parameter, ${args})}}` };
	}
	return { outputs: outputs.map(() => 'main'), outputNames: [...outputs] };
}

/** Named inputs run when one of them has items, as the Merge node does. */
const mainInputsOf = (
	inputs: ActionInputs | undefined,
): Pick<INodeTypeDescription, 'requiredInputs'> & {
	inputs: Array<'main' | INodeInputConfiguration>;
} =>
	inputs
		? {
				inputs: inputs.map((displayName) => ({ type: 'main', displayName })),
				requiredInputs: 1,
			}
		: { inputs: ['main'] };

const SUPPLY_LABELS: Record<SupplyKind, string> = {
	chatModel: 'Chat Model',
	memory: 'Memory',
	tool: 'Tool',
	embeddings: 'Embeddings',
};

/** The n8n input of a `supplied()` field. A list takes any number of sub-nodes. */
const supplyInputOf = ({ kind, many, required, title }: SupplyField): INodeInputConfiguration => ({
	type: SUPPLY_CONNECTIONS[kind],
	displayName: title ?? SUPPLY_LABELS[kind],
	required,
	...(many ? {} : { maxConnections: 1 }),
});

/**
 * The n8n inputs and outputs. A sub-node has no main connection: n8n runs it when its root
 * node reads it.
 */
function connectionsOf(
	action: Action,
): Pick<INodeTypeDescription, 'inputs' | 'requiredInputs' | 'outputs' | 'outputNames'> {
	const supplyInputs = supplyFieldsOf(action.input).map(supplyInputOf);
	const kind = suppliedKindOf(action.output.json);
	if (kind) {
		return {
			inputs: supplyInputs,
			outputs: [SUPPLY_CONNECTIONS[kind]],
			outputNames: [SUPPLY_LABELS[kind]],
		};
	}
	const main = mainInputsOf(action.inputs);
	return { ...main, inputs: [...main.inputs, ...supplyInputs], ...outputsOf(action.outputs) };
}

/**
 * Records each call of a capability as a run of the sub-node, as the legacy sub-nodes do, so
 * the editor and the execution data show what the root node asked and got.
 */
function recordedSupply(
	value: Record<string, unknown>,
	kind: SupplyKind,
	context: ISupplyDataFunctions,
): Record<string, unknown> {
	const type = SUPPLY_CONNECTIONS[kind];
	// A JSON copy: the run data must not hold functions or change with the capability.
	const dataOf = (entry: unknown): IDataObject => {
		const text = JSON.stringify(entry ?? null);
		const parsed: unknown = JSON.parse(text);
		return isRecord(parsed) ? parsed : { value: text };
	};
	return Object.fromEntries(
		Object.entries(value).map(([key, member]) => {
			if (typeof member !== 'function') return [key, member];
			const call = async (...args: unknown[]) => {
				const { index } = context.addInputData(type, [[{ json: { [key]: dataOf(args[0]) } }]]);
				try {
					const result: unknown = await Reflect.apply(member, value, args);
					context.addOutputData(type, index, [[{ json: { response: dataOf(result) } }]]);
					return result;
				} catch (error) {
					context.addOutputData(
						type,
						index,
						new NodeOperationError(context.getNode(), errorMessage(error)),
					);
					throw error;
				}
			};
			return [key, call];
		}),
	);
}

/** The `supplyData()` result of a sub-node from the one output item its run gives. */
function supplyDataOf(
	actionId: string,
	kind: SupplyKind,
	outputs: INodeExecutionData[][],
	context: ISupplyDataFunctions,
): SupplyData {
	const value = outputs[0]?.[0]?.json;
	if (!isSupply(kind, value)) {
		throw new UnexpectedError(`${actionId} supplies ${kind}, and its run() gave something else`);
	}
	return { response: recordedSupply(value, kind, context) };
}

/** An n8n node type for one action; the platform part is `executorOf`. */
export function toNodeType<S extends Shape, O extends AnySchema>(
	action: Action<S, O>,
): new () => INodeType {
	if (action.native) throw nativeRunError(action);
	const { selector, credentials } = credentialDescriptionOf(action);
	const description: INodeTypeDescription = {
		displayName: `${action.node.displayName}: ${action.action}`,
		name: nodeNameOf(action.id),
		group: [GROUPS[action.flow.effect]],
		version: action.version,
		description: action.summary,
		defaults: { name: action.action },
		...connectionsOf(action),
		credentials,
		properties: [
			...selector,
			...Object.entries(action.input)
				.filter(([, schema]) => supplyOf(schema.json) === undefined)
				.map(([name, schema]) => toProperty(name, schema)),
		],
	};

	const run = executorOf(action);
	const kind = suppliedKindOf(action.output.json);
	if (kind) {
		return class implements INodeType {
			description = description;

			async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
				return supplyDataOf(action.id, kind, await run(supplyHostOf(this, itemIndex)), this);
			}
		};
	}
	return class implements INodeType {
		description = description;

		async execute(this: IExecuteFunctions) {
			return await run(hostOf(this));
		}
	};
}

/** A frozen action version: its manifest and a reader for its bundle. */
export interface FrozenVersion {
	readonly manifest: VersionManifest;
	readBundle(): Promise<string>;
}

/** Host modules a frozen bundle may import. They are part of every Node Contract version. */
const HOST_MODULES: Readonly<Record<string, unknown>> = { 'n8n-workflow': { safeRegex } };

const isContract = (value: unknown): value is Action | Trigger =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	typeof value.version === 'number' &&
	Array.isArray(value.credentialTypes) &&
	(typeof value.run === 'function' ||
		isRecord(value.request) ||
		isRecord(value.list) ||
		isRecord(value.poll) ||
		isRecord(value.webhook));

/**
 * Runs a CommonJS bundle from `freezeAction` and returns the action or trigger it exports.
 * An @1 bundle runs through its adapter, so the executor sees @2 only.
 */
export function evaluateBundle(code: string, nodeContract: NodeContractVersion): Action | Trigger {
	if (!implementsNodeContract(nodeContract)) {
		throw new UserError(
			`This host cannot run Node Contract ${nodeContract}. It implements ${IMPLEMENTED_NODE_CONTRACTS.join(', ')}.`,
		);
	}
	const module: { exports: unknown } = { exports: {} };
	const hostRequire = (id: string) => {
		if (!(id in HOST_MODULES)) throw new UnexpectedError(`A frozen action cannot import ${id}`);
		return HOST_MODULES[id];
	};
	Reflect.apply(compileFunction(code, ['module', 'require']), undefined, [module, hostRequire]);
	const exported = isRecord(module.exports) ? module.exports.default : undefined;
	const contract = nodeContract.startsWith('1.') ? fromActionApiV1(exported) : exported;
	if (!isContract(contract)) throw new UnexpectedError('The bundle does not export a contract');
	return contract;
}

/** The code of a frozen version, after its Node Contract version and its hash are checked. */
export async function verifiedCodeOf({ manifest, readBundle }: FrozenVersion) {
	assertNodeContract(manifest);
	const { id, semver, bundleHash } = manifest;
	const code = await readBundle();
	if (sha256(code) !== bundleHash) {
		throw new UnexpectedError(`The bundle of ${id}@${semver} does not match ${bundleHash}`);
	}
	return code;
}

/** The bundle of a frozen version, after its Node Contract version and its hash are checked. */
export async function verifiedBundleOf(frozen: FrozenVersion) {
	return evaluateBundle(await verifiedCodeOf(frozen), frozen.manifest.nodeContract);
}

/** The executor of the action interface for one node execution. */
export type Executor = (host: ExecutorHost) => Promise<INodeExecutionData[][]>;

/** Executors by bundle hash and HEAD bundle hash. A bundle loads on its first execution only. */
const executors = new Map<string, Promise<Executor>>();

/**
 * n8n has one credential type for each name and signs with it, so the hosts of a credential
 * type come from the bundled version. A type that it does not list keeps the hosts of `action`.
 */
export function withCredentialHostsOf(head: Action | Trigger, action: Action): Action {
	const credential = action.node.credential;
	if (!credential) return action;
	const current = head.node.credential?.types ?? [];
	const types = credential.types.map((type) => {
		const hosts = current.find(({ name }) => name === type.name)?.hosts;
		return hosts === undefined ? type : { ...type, hosts };
	});
	return { ...action, node: { ...action.node, credential: { ...credential, types } } };
}

/** The executor of a frozen version with its bundle in this process. `head` gives the credential hosts. */
export async function loadExecutor(frozen: FrozenVersion, head: FrozenVersion): Promise<Executor> {
	const action = await verifiedBundleOf(frozen);
	if ('kind' in action) throw new UnexpectedError(`${action.id} is a trigger, not an action`);
	if (frozen.manifest.bundleHash === head.manifest.bundleHash) return executorOf(action);
	return executorOf(withCredentialHostsOf(await verifiedBundleOf(head), action));
}

/** Makes the executor of a frozen version, e.g. in a sandbox. The default is `loadExecutor`. */
export type ExecutorLoader = (frozen: FrozenVersion, head: FrozenVersion) => Promise<Executor>;

// One slot: the host sets it once at start, as the version loader.
const executorLoader = new Map<'loader', ExecutorLoader>();

export const setExecutorLoader = (loader: ExecutorLoader) => {
	executorLoader.set('loader', loader);
	// An executor of the old loader must not run on.
	executors.clear();
};

/**
 * Picks the version a node runs. `head` is the bundled version of the node's major. The
 * result must have the same major. The host sets it once at start.
 */
export type ContractVersionLoader = (
	context: NodeContext,
	head: FrozenVersion,
) => Promise<FrozenVersion>;

// One slot: the host replaces the default, which runs the bundled HEAD.
const versionLoader = new Map<'loader', ContractVersionLoader>();

export const setContractVersionLoader = (loader: ContractVersionLoader) => {
	versionLoader.set('loader', loader);
};

/** The executor of the version a node runs, and its manifest. */
async function versionExecutorOf(context: NodeContext, head: FrozenVersion) {
	const loader = versionLoader.get('loader');
	const frozen = loader ? await loader(context, head) : head;
	const { id, semver, bundleHash, contract } = frozen.manifest;
	if (contract.version !== head.manifest.contract.version || id !== head.manifest.id) {
		throw new UnexpectedError(
			`${id}@${semver} cannot run as ${head.manifest.id}@${head.manifest.semver}`,
		);
	}
	assertNodeContract(frozen.manifest);
	// A failed read, for example a registry outage, must not stay in the cache.
	// The credential hosts come from `head`, so the executor depends on both bundles.
	const key = `${bundleHash}:${head.manifest.bundleHash}`;
	const executor =
		executors.get(key) ??
		(executorLoader.get('loader') ?? loadExecutor)(frozen, head).catch((error: unknown) => {
			executors.delete(key);
			throw error;
		});
	executors.set(key, executor);
	return { executor: await executor, manifest: frozen.manifest };
}

async function executeVersion(context: IExecuteFunctions, head: FrozenVersion) {
	const { executor, manifest } = await versionExecutorOf(context, head);
	const outputs = await executor(hostOf(context));
	recordVersion(context, manifest);
	return outputs;
}

/** The run data tells which version of the action ran. */
function recordVersion(
	context: IExecuteFunctions,
	{ id, semver, bundleHash, nodeContract }: FrozenVersion['manifest'],
) {
	context.setMetadata({ nodeContract: { action: id, version: semver, bundleHash, nodeContract } });
}

async function supplyVersion(
	context: ISupplyDataFunctions,
	head: FrozenVersion,
	kind: SupplyKind,
	itemIndex: number,
) {
	const { executor, manifest } = await versionExecutorOf(context, head);
	const outputs = await executor(supplyHostOf(context, itemIndex));
	return supplyDataOf(manifest.id, kind, outputs, context);
}

/**
 * An n8n node type with one version per major. `typeOf` makes the node type of one version; its
 * description comes from the manifest.
 */
export function versionedTypeOf(
	versions: readonly FrozenVersion[],
	typeOf: (frozen: FrozenVersion) => INodeType,
): new () => VersionedNodeType {
	versions.forEach(({ manifest }) => assertNodeContract(manifest));
	const majorOf = ({ manifest }: FrozenVersion) => manifest.contract.version;
	const latest = versions.reduce<FrozenVersion | undefined>(
		(best, frozen) => (best && majorOf(best) > majorOf(frozen) ? best : frozen),
		undefined,
	);
	if (!latest) throw new UnexpectedError('A versioned node type needs at least one version');
	const nodeVersions = Object.fromEntries(
		versions.map((frozen): [number, INodeType] => [majorOf(frozen), typeOf(frozen)]),
	);
	const { displayName, name, group, description } = latest.manifest.description;
	const base = { displayName, name, group, description, defaultVersion: majorOf(latest) };
	return class extends VersionedNodeType {
		constructor() {
			super(nodeVersions, base);
		}
	};
}

/**
 * The versioned node type of an action. The bundle loads on the first execution of its version.
 * A sub-node action supplies its capability instead.
 */
export const toVersionedNodeType = (versions: readonly FrozenVersion[]) =>
	versionedTypeOf(versions, (frozen): INodeType => {
		const { description, contract } = frozen.manifest;
		const kind = suppliedKindOf(contract.output);
		if (kind) {
			return {
				description,
				async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
					return await supplyVersion(this, frozen, kind, itemIndex);
				},
			};
		}
		return {
			// The host generates the tool node types from this flag, as for a legacy node.
			description: isToolContract(contract) ? { ...description, usableAsTool: true } : description,
			async execute(this: IExecuteFunctions) {
				return await executeVersion(this, frozen);
			},
		};
	});

/**
 * The description of a field that the model fills: its value is one `$fromAI()` call. A field
 * without `$fromAI()` is set by the workflow.
 */
function modelFieldOf(
	node: INode,
	name: string,
	raw: unknown,
): { description: string } | undefined {
	const calls: FromAIArgument[] = [];
	traverseNodeParameters(raw, calls);
	const [call] = calls;
	if (!call) return undefined;
	if (calls.length === 1 && typeof raw === 'string' && isFromAIOnlyExpression(raw)) {
		return { description: call.description ?? '' };
	}
	throw new NodeOperationError(node, `The ${name} field uses $fromAI() inside a value`, {
		description: `A node contract tool takes whole fields from the model. Set ${name} to {{ $fromAI('${name}') }}, or give it a value without $fromAI().`,
	});
}

/** A field schema as a model reads it: without the n8n keywords, and the hint as its description. */
const modelSchemaOf = (schema: JsonSchema): JsonSchema =>
	jsonParse<JsonSchema>(
		JSON.stringify(schema, (key, value: unknown) => {
			if (key.startsWith('x-n8n-')) return undefined;
			if (!isRecord(value) || value.description !== undefined) return value;
			const hint = value['x-n8n-hint'];
			return typeof hint === 'string' ? { ...value, description: hint } : value;
		}),
	);

/** The input schema of a tool: the contract schemas of the fields that the model fills. */
function toolInputOf(input: JsonSchema, descriptions: ReadonlyMap<string, string>): JsonSchema {
	const fields = Object.entries(input.properties ?? {}).filter(([name]) => descriptions.has(name));
	return {
		type: 'object',
		properties: Object.fromEntries(
			fields.map(([name, field]) => {
				const description = descriptions.get(name);
				return [name, modelSchemaOf(description ? { ...field, description } : field)];
			}),
		),
		required: (input.required ?? []).filter((name) => descriptions.has(name)),
		additionalProperties: false,
	};
}

/**
 * The tool of one tool node. The model gives the fields that the workflow sets to `$fromAI()`,
 * and the workflow fixes the others. A call runs the version the node runs, with the same
 * credential, egress and limits as a step. The bundle loads on the first call.
 */
function toolOf(context: NodeContext, frozen: FrozenVersion, itemIndex: number) {
	const node = context.getNode();
	const { contract } = frozen.manifest;
	const descriptions = new Map(
		Object.entries(contract.input.properties ?? {}).flatMap(([name, schema]) => {
			const raw = context.getNodeParameter(name, itemIndex, undefined, { rawExpressions: true });
			const field = modelFieldOf(node, name, raw);
			if (field && hasPageValue(schema)) {
				throw new NodeOperationError(node, `The model cannot fill ${name}: it reads each page`);
			}
			return field ? [[name, field.description] as const] : [];
		}),
	);
	const description = context.getNodeParameter('toolDescription', itemIndex, '');
	return {
		name: nodeNameToToolName(node),
		description:
			typeof description === 'string' && description.trim() ? description : contract.summary,
		input: toolInputOf(contract.input, descriptions),
		async call(args: Readonly<Record<string, unknown>>) {
			const { executor } = await versionExecutorOf(context, frozen);
			const outputs = await executor({
				...hostBaseOf(context),
				items: [{ json: {} }],
				// Only the model fields come from the model, so it cannot change a fixed field.
				parameter: (name, _index, raw) =>
					descriptions.has(name)
						? args[name]
						: context.getNodeParameter(
								name,
								itemIndex,
								undefined,
								raw ? { rawExpressions: true } : {},
							),
				continueOnFail: () => false,
			});
			return (outputs[0] ?? []).map(({ json }) => json);
		},
	} satisfies Tool;
}

/**
 * The versioned node type of the agent tool of an action, with one version per major.
 * `describe` makes the tool description of a version, so the host names all its tools one way.
 */
export const toVersionedToolType = (
	versions: readonly FrozenVersion[],
	describe: (description: INodeTypeDescription) => INodeTypeDescription,
) =>
	versionedTypeOf(
		versions.map((frozen) => ({
			...frozen,
			manifest: { ...frozen.manifest, description: describe(frozen.manifest.description) },
		})),
		(frozen): INodeType => ({
			description: frozen.manifest.description,
			async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
				return { response: recordedSupply(toolOf(this, frozen, itemIndex), 'tool', this) };
			},
			// An agent that has the engine run its tool calls runs this node: each item is one call.
			async execute(this: IExecuteFunctions) {
				const outputs = await this.getInputData().reduce<Promise<INodeExecutionData[]>>(
					async (done, item, index) => {
						const results = await toolOf(this, frozen, index).call(item.json);
						return [
							...(await done),
							...results.map((json) => ({ json, pairedItem: { item: index } })),
						];
					},
					Promise.resolve([]),
				);
				recordVersion(this, (await versionExecutorOf(this, frozen)).manifest);
				return [outputs];
			},
		}),
	);
