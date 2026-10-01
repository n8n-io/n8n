import { errorChain } from '@n8n/utils/errors/error-chain';
import { findPlaceholderDetails, formatPlaceholderPath } from '@n8n/utils/placeholder';
import { sleep } from '@n8n/utils/sleep';
import { Readable } from 'node:stream';
import { compileFunction } from 'node:vm';
import {
	BINARY_ENCODING,
	isBinaryValue,
	NodeOperationError,
	safeRegex,
	UnexpectedError,
	UserError,
	VersionedNodeType,
	type IBinaryData,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestOptions,
	type INode,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { fromActionApiV1 } from './action-api-v1';
import { credentialDataOf } from './credentials';
import { parameterValue, toProperty } from './properties';
import {
	isHttpError,
	usesBinary,
	type Action,
	type ActionOutputs,
	type Binaries,
	type Http,
	type HttpMethod,
	type HttpRequest,
	type LogLevel,
	type NodeDefinition,
	type RequestBinding,
	type RequestValue,
	type RunInput,
	type RunLimits,
	type Trigger,
} from './define';
import { hasBinary, type AnySchema, type Binary, type JsonSchema, type Shape } from './schema';
import { applyDefaults, validate } from './validate';
import {
	ACTION_API_VERSION,
	apiSemverOf,
	DEFAULT_ACTION_API_RANGE,
	parseSemver,
	semverRange,
	sha256,
	type ActionApiVersion,
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
		url: request.url ?? `${baseUrl ?? ''}${request.path ?? ''}`,
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
	if (!type || !value?.baseUrl) return node.baseUrl;
	return value.baseUrl(credentialDataOf(value, await read(type)));
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
	/** The raw parameter value, as `getNodeParameter` returns it. */
	parameter(name: string, itemIndex: number): unknown;
	request(options: IHttpRequestOptions, credentialType: string | undefined): Promise<unknown>;
	/** The stored data of a credential, for a credential type with `baseUrl`. */
	credentialData?(credentialType: string): Promise<unknown>;
	continueOnFail(): boolean;
	/** Waits before a retry. */
	wait?(ms: number): Promise<void>;
	log?(level: LogLevel, message: string): void;
	readonly limits?: Partial<RunLimits>;
	/** Needed by an action with a `binary()` field only. */
	readonly binary?: BinaryStore;
}

const binaryStoreOf = (context: IExecuteFunctions): BinaryStore => ({
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

const hostOf = (context: IExecuteFunctions): ExecutorHost => ({
	items: context.getInputData(),
	node: context.getNode(),
	parameter: (name, itemIndex) => context.getNodeParameter(name, itemIndex, undefined),
	request: async (options, credentialType) => {
		const response: unknown = credentialType
			? await context.helpers.httpRequestWithAuthentication.call(context, credentialType, options)
			: await context.helpers.httpRequest(options);
		return response;
	},
	credentialData: async (type) => await context.getCredentials(type),
	continueOnFail: () => context.continueOnFail(),
	wait: async (ms) => await sleep(ms, context.getExecutionCancelSignal()),
	log: (level, message) => context.logger[level](message, { node: context.getNode().name }),
	binary: binaryStoreOf(context),
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
export function requestOf<I>(
	binding: RequestBinding<I>,
	input: Readonly<Record<string, unknown>>,
): HttpRequest {
	const path = binding.path.replace(/\{([^}]+)\}/g, (_, field: string) => {
		const value = input[field];
		// An empty segment sends the request to another URL, e.g. a collection.
		if (value === undefined || value === '') {
			throw new UserError(`The path field "${field}" has no value`);
		}
		return encodeURIComponent(String(queryValue(value)));
	});
	const query = inputValues(binding.query, input);
	const body = inputValues(binding.body, input);
	return {
		method: binding.method ?? 'GET',
		path: `/${path.replace(/^\//, '')}`,
		...(query
			? {
					query: Object.fromEntries(
						Object.entries(query).map(([key, value]) => [key, queryValue(value)]),
					),
				}
			: {}),
		...(binding.headers ? { headers: binding.headers } : {}),
		...(body ? { body } : {}),
	};
}

/** What a declarative binding gives back for one item: the body, or the items in one field. */
async function* requestItems<I>(
	http: Http,
	binding: RequestBinding<I>,
	field: string,
	input: Readonly<Record<string, unknown>>,
) {
	const body = await http.request(requestOf(binding, input));
	const items = isRecord(body) ? body[field] : undefined;
	if (!Array.isArray(items)) {
		throw new UnexpectedError(`The response has no array in "${field}"`);
	}
	yield* items;
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

/** One output item and the output it goes to. */
interface Routed {
	readonly output: number;
	readonly data: INodeExecutionData;
}

/** `value` with each binary in it replaced by `resolve(binary)`, along `schema`. */
async function withBinaries(
	value: unknown,
	schema: JsonSchema,
	resolve: (binary: unknown) => Promise<Binary>,
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
 * The `n8n:action@2` executor. Per-item and 1:N actions run once per input item with the
 * parameters of that item; a batch action runs once with all items and the parameters of the
 * first item. Each parameter set is filled with defaults and validated against `input`.
 * Transient failures of idempotent requests retry. Each output item is validated against
 * `output`, routed to its named output, and paired with the input items it comes from.
 * Continue-on-fail gives an error item on the last output, which n8n routes to the error
 * output when the node has one.
 */
export function executorOf<S extends Shape, O extends AnySchema>(
	action: Action<S, O>,
): (host: ExecutorHost) => Promise<INodeExecutionData[][]> {
	const inputKeys = Object.keys(action.input);
	const jsonKeys = new Set(
		Object.entries(action.input)
			.filter(([name, schema]) => toProperty(name, schema).type === 'json')
			.map(([name]) => name),
	);
	const outputSchema: JsonSchema = action.output.json;
	const passesOnly = outputSchema['x-n8n-passed'] === true;
	const isInput = (value: unknown): value is RunInput<S> =>
		validate(value, action.inputSchema).length === 0;
	const { request: binding } = action;
	const isBatch = action.flow.cardinality === 'batch';
	const scope = isBatch ? 'one run' : 'one input item';
	const binaryApi = usesBinary({ input: action.inputSchema, output: outputSchema });
	const binaryKeys = Object.entries(outputSchema.properties ?? {})
		.filter(([, field]) => field['x-n8n-binary'])
		.map(([key]) => key);

	return async (host) => {
		const { items } = host;
		// The bundle of an action without a binary field targets 2.1.0, which has no binary data.
		const binaryStore = (): BinaryStore => {
			if (!binaryApi) {
				throw new UnexpectedError(
					`${action.id} has no binary() field, so it targets n8n:action@2.1.0, which has no binary data`,
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
		const logged = { lines: 0 };
		const log = (level: LogLevel, message: string) => {
			logged.lines += 1;
			if (logged.lines <= MAX_LOG_LINES) {
				host.log?.(level, String(message).slice(0, MAX_LOG_LENGTH));
			} else if (logged.lines === MAX_LOG_LINES + 1) {
				host.log?.('warn', `${action.id} logged ${MAX_LOG_LINES} lines. n8n drops the rest.`);
			}
		};
		const selected = hasSelector(action) ? host.parameter(AUTHENTICATION, 0) : undefined;
		const credentialType = credentialTypeOf(action, host.node, selected);
		const baseUrl = await baseUrlOf(action.node, credentialType, async (type) => {
			if (!host.credentialData) throw new UnexpectedError(`${action.id} cannot read ${type}`);
			return await host.credentialData(type);
		});
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
				if (delay === undefined) throw error;
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

		const httpFor = (itemIndex: number): Http => {
			const sent = { requests: 0 };
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
				const requestOptions = toRequestOptions(options, baseUrl);
				return options.response === 'binary' || entries.has(options.body)
					? await sendBinary(options, requestOptions, retryable)
					: await send(async () => requestOptions, retryable, 0);
			}
			return { request };
		};

		const inputOf = async (itemIndex: number): Promise<RunInput<S>> => {
			const parameters = Object.fromEntries(
				inputKeys
					.map(
						(key) =>
							[key, parameterValue(host.parameter(key, itemIndex), jsonKeys.has(key))] as const,
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
			const input = binaryApi
				? await withBinaries(defaulted, action.inputSchema, async (value) =>
						handleOf(await binaryStore().input(itemIndex, value)),
					)
				: defaulted;
			if (!isInput(input)) {
				const issues = validate(input, action.inputSchema);
				throw new NodeOperationError(host.node, issues.join('; '), { itemIndex });
			}
			return input;
		};

		// Identity, not equality: a passed item must be one of the input items.
		const indexOf = new Map<unknown, number>(items.map((item, index) => [item, index]));
		const fail = (message: string, itemIndex: number) =>
			new NodeOperationError(host.node, message, { itemIndex });

		/** `current` is the input item of a per-item run; a batch output names its own lineage. */
		const routeOf = (names: readonly string[] | undefined, current: number | undefined) => {
			const pairOf = (source: unknown, at: number) => {
				const index = indexOf.get(source);
				if (index === undefined)
					throw fail(
						`${action.id} output ${at} names an item that is not an input item`,
						current ?? 0,
					);
				return { item: index };
			};
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
					const pairedItem = pairOf(value.item, at);
					const passed = items[pairedItem.item];
					if (!passed) throw fail(`${action.id} output ${at} has no input item`, current ?? 0);
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
			const http = httpFor(itemIndex);
			// The host sends a declarative request itself; no author code runs for it.
			// Only a 1:N binding names `items`.
			const result: Promise<unknown> | AsyncIterable<unknown> | Iterable<unknown> | undefined =
				binding
					? binding.items === undefined
						? http.request(requestOf(binding, input))
						: requestItems(http, binding, binding.items, input)
					: action.run?.({ input, http, log, limits, binary: binaries, item });
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
			data: { json: { error: errorMessage(error) }, pairedItem },
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
			if (items.length === 0) return { names, routed: [] };
			if (isBatch) {
				try {
					const input = await inputOf(0);
					const result = action.run?.({
						input,
						http: httpFor(0),
						log,
						limits,
						binary: binaries,
						items,
					});
					return { names, routed: await collect(result, routeOf(names, undefined)) };
				} catch (error) {
					if (!host.continueOnFail()) throw error;
					const all = items.map((_item, index) => ({ item: index }));
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

		const { names, routed } = await run();
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

/** An n8n node type for one action; the platform part is `executorOf`. */
export function toNodeType<S extends Shape, O extends AnySchema>(
	action: Action<S, O>,
): new () => INodeType {
	const { selector, credentials } = credentialDescriptionOf(action);
	const description: INodeTypeDescription = {
		displayName: `${action.node.displayName}: ${action.action}`,
		name: nodeNameOf(action.id),
		group: [GROUPS[action.flow.effect]],
		version: action.version,
		description: action.summary,
		defaults: { name: action.action },
		inputs: ['main'],
		...outputsOf(action.outputs),
		credentials,
		properties: [
			...selector,
			...Object.entries(action.input).map(([name, schema]) => toProperty(name, schema)),
		],
	};

	const run = executorOf(action);
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

/** Host modules a frozen bundle may import. They are part of every `n8n:action` version. */
const HOST_MODULES: Readonly<Record<string, unknown>> = { 'n8n-workflow': { safeRegex } };

const isContract = (value: unknown): value is Action | Trigger =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	typeof value.version === 'number' &&
	Array.isArray(value.credentialTypes) &&
	(typeof value.run === 'function' ||
		isRecord(value.request) ||
		isRecord(value.poll) ||
		isRecord(value.webhook));

/** The newest version of each `n8n:action` major that this host runs. */
const IMPLEMENTED_ACTION_APIS: readonly ActionApiVersion[] = [
	'n8n:action@1.0.0',
	ACTION_API_VERSION,
];

/** A newer minor than the host has uses imports that the host lacks. */
const implementsActionApi = (apiVersion: ActionApiVersion) => {
	const { major, minor } = parseSemver(apiSemverOf(apiVersion));
	return IMPLEMENTED_ACTION_APIS.some((implemented) => {
		const known = parseSemver(apiSemverOf(implemented));
		return known.major === major && known.minor >= minor;
	});
};

/**
 * Runs a CommonJS bundle from `freezeAction` and returns the action or trigger it exports.
 * An @1 bundle runs through its adapter, so the executor sees @2 only.
 */
export function evaluateBundle(code: string, apiVersion: ActionApiVersion): Action | Trigger {
	if (!implementsActionApi(apiVersion)) {
		throw new UserError(
			`This host cannot run ${apiVersion}. It implements ${IMPLEMENTED_ACTION_APIS.join(', ')}.`,
		);
	}
	const module: { exports: unknown } = { exports: {} };
	const hostRequire = (id: string) => {
		if (!(id in HOST_MODULES)) throw new UnexpectedError(`A frozen action cannot import ${id}`);
		return HOST_MODULES[id];
	};
	Reflect.apply(compileFunction(code, ['module', 'require']), undefined, [module, hostRequire]);
	const exported = isRecord(module.exports) ? module.exports.default : undefined;
	const contract = apiVersion.startsWith('n8n:action@1.') ? fromActionApiV1(exported) : exported;
	if (!isContract(contract)) throw new UnexpectedError('The bundle does not export a contract');
	return contract;
}

// One slot: the host sets its configured range once at start.
const actionApiRange = new Map<'range', { text: string; includes: (version: string) => boolean }>();

/** Sets the `n8n:action` versions this host runs, e.g. `>=2.0.0 <3.0.0`. Throws for a bad range. */
export const setActionApiRange = (range: string) => {
	actionApiRange.set('range', { text: range, includes: semverRange(range) });
};

const DEFAULT_RANGE = {
	text: DEFAULT_ACTION_API_RANGE,
	includes: semverRange(DEFAULT_ACTION_API_RANGE),
};

const rangeOf = () => actionApiRange.get('range') ?? DEFAULT_RANGE;

/** In the configured range, and implemented by this host. */
export const runsActionApi = (apiVersion: ActionApiVersion) =>
	rangeOf().includes(apiSemverOf(apiVersion)) && implementsActionApi(apiVersion);

function assertActionApi({ id, semver, apiVersion }: VersionManifest) {
	if (runsActionApi(apiVersion)) return;
	throw new UserError(
		`${id}@${semver} needs ${apiVersion}. This host runs n8n:action ${rangeOf().text} and implements ${IMPLEMENTED_ACTION_APIS.join(', ')}.`,
	);
}

/** The bundle of a frozen version, after its API version and its hash are checked. */
export async function verifiedBundleOf({ manifest, readBundle }: FrozenVersion) {
	assertActionApi(manifest);
	const { id, semver, apiVersion, bundleHash } = manifest;
	const code = await readBundle();
	if (sha256(code) !== bundleHash) {
		throw new UnexpectedError(`The bundle of ${id}@${semver} does not match ${bundleHash}`);
	}
	return evaluateBundle(code, apiVersion);
}

/** Executors by bundle hash. A bundle loads on its first execution only. */
const executors = new Map<
	string,
	Promise<(host: ExecutorHost) => Promise<INodeExecutionData[][]>>
>();

async function loadExecutor(frozen: FrozenVersion) {
	const action = await verifiedBundleOf(frozen);
	if ('kind' in action) throw new UnexpectedError(`${action.id} is a trigger, not an action`);
	return executorOf(action);
}

/**
 * Picks the version a node runs. `head` is the bundled version of the node's major. The
 * result must have the same major. The host sets it once at start.
 */
export type ContractVersionLoader = (
	context: IExecuteFunctions,
	head: FrozenVersion,
) => Promise<FrozenVersion>;

// One slot: the host replaces the default, which runs the bundled HEAD.
const versionLoader = new Map<'loader', ContractVersionLoader>();

export const setContractVersionLoader = (loader: ContractVersionLoader) => {
	versionLoader.set('loader', loader);
};

async function executeVersion(context: IExecuteFunctions, head: FrozenVersion) {
	const loader = versionLoader.get('loader');
	const frozen = loader ? await loader(context, head) : head;
	const { id, semver, apiVersion, bundleHash, contract } = frozen.manifest;
	if (contract.version !== head.manifest.contract.version || id !== head.manifest.id) {
		throw new UnexpectedError(
			`${id}@${semver} cannot run as ${head.manifest.id}@${head.manifest.semver}`,
		);
	}
	assertActionApi(frozen.manifest);
	// A failed read, for example a registry outage, must not stay in the cache.
	const executor =
		executors.get(bundleHash) ??
		loadExecutor(frozen).catch((error: unknown) => {
			executors.delete(bundleHash);
			throw error;
		});
	executors.set(bundleHash, executor);
	const outputs = await (await executor)(hostOf(context));
	context.setMetadata({ nodeContract: { action: id, version: semver, bundleHash, apiVersion } });
	return outputs;
}

/**
 * An n8n node type with one version per major. `typeOf` makes the node type of one version; its
 * description comes from the manifest.
 */
export function versionedTypeOf(
	versions: readonly FrozenVersion[],
	typeOf: (frozen: FrozenVersion) => INodeType,
): new () => VersionedNodeType {
	versions.forEach(({ manifest }) => assertActionApi(manifest));
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

/** The versioned node type of an action. The bundle loads on the first execution of its version. */
export const toVersionedNodeType = (versions: readonly FrozenVersion[]) =>
	versionedTypeOf(versions, (frozen) => ({
		description: frozen.manifest.description,
		async execute(this: IExecuteFunctions) {
			return await executeVersion(this, frozen);
		},
	}));
