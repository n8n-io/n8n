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
	NodeError,
	NodeOperationError,
	OperationalError,
	safeRegex,
	traverseNodeParameters,
	UnexpectedError,
	UserError,
	VersionedNodeType,
	type Failure,
	type FromAIArgument,
	type IBinaryData,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INode,
	type INodeExecutionData,
	type INodeInputConfiguration,
	type INodeListSearchResult,
	type INodeProperties,
	type IPairedItemData,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type IWebhookDescription,
	type SupplyData,
} from 'n8n-workflow';

import {
	compat,
	compatTypeOfManifest,
	credentialBaseUrlOf,
	plainFieldsOf,
	redactedValue,
	secretRedactorOf,
} from './credentials';
import {
	codeRunnerOf,
	dataTableHostOf,
	dataTablesOf,
	fileExtractor,
	fileRequestIssues,
	isFileExtractRequest,
	isFileResult,
	type FileExtractor,
} from './host-imports';
import {
	actionHostsOf,
	credentialHostsOf,
	egressOf,
	permissionsOf,
	reportRedirectRefusal,
	reportRefusal,
} from './egress';
import { actionUiSchema, type CredentialManifest } from './manifest';
import {
	formPropertiesOf,
	inputReaderOf,
	locatorValueOf,
	parameterPathOf,
	storedFieldOf,
	toolUiOf,
	type ActionUiDocument,
	type StoredField,
} from './properties';
import {
	bytesOf,
	payloadOf,
	runProfileListener,
	runRecorder,
	type RunProfile,
	type RunRecorder,
	type RunRequest,
} from './profile';
import {
	DEFAULT_RUN_LIMITS,
	DEFAULT_WEBHOOK_ENDPOINT,
	isHttpError,
	inputCountOf,
	isToolContract,
	usesBinary,
	type Action,
	type ActionOutputs,
	type Binaries,
	type CodeRunner,
	type DataTable,
	type DataTables,
	type HostImport,
	type HostImports,
	type Http,
	type HttpMethod,
	type EncodedPath,
	type HttpRequest,
	isRequestPath,
	limitOf,
	type ListBinding,
	type LogLevel,
	type LookupDocument,
	type LookupEntry,
	lookupsOf,
	type NodeDefinition,
	nextLinkOf,
	nextOffsetOf,
	type PageParam,
	pages,
	paging,
	pathSegmentOf,
	type RequestBinding,
	type RunContext,
	type RunInput,
	type RunLimits,
	toContract,
	type ContractDocument,
	credentialOptionsOf,
	type Trigger,
} from './define';
import { firstMatchOf, testPattern } from './pattern';
import {
	binaryKeyIssue,
	hasBinary,
	hasPageValue,
	Schema,
	shapeOf,
	t,
	type AnySchema,
	type Binary,
	type JsonSchema,
	type Shape,
} from './schema';
import {
	fromLangChainTool,
	provider,
	PROVIDER_CONNECTIONS,
	providedKindOf,
	providerInputsOf,
	providerInputOf,
	type ProviderInputField,
	type ProviderKind,
	type Tool,
} from './providers';
import { applyDefaults, list, matches, outputBinaryKeys, readAs } from './validate';
import { validate } from './validator';
import type { WebhookEndpoint } from './triggers';
import {
	assertNodeContract,
	implementsNodeContract,
	IMPLEMENTED_NODE_CONTRACTS,
	NODE_CONTRACT_VERSION,
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

/** True when the request got no response: a connection, DNS or time-out failure. */
const transportFailed = (error: unknown) =>
	errorChain(error).some(({ code }) => typeof code === 'string' && RETRY_CODES.has(code));

// A local classifier: `retryabilityFromError` in @n8n/backend-network needs DI and undici.
/** The wait before retry number `retry`, or `undefined` when a retry cannot help. */
function retryDelay(error: unknown, retry: number): number | undefined {
	const transient = isHttpError(error) ? RETRY_STATUSES.has(error.status) : transportFailed(error);
	if (!transient || retry >= MAX_RETRIES) return undefined;
	const asked = isHttpError(error) ? retryAfterMs(error.headers['retry-after']) : undefined;
	// Full jitter: executions that failed together do not retry together.
	const delay = asked ?? Math.random() * RETRY_BASE_MS * 2 ** retry;
	return delay <= RETRY_MAX_MS ? delay : undefined;
}

/**
 * Why a run failed, as n8n reads it from `failure`: a timed cause can pass with a wait, an
 * actionable cause needs the user. A 4xx response or a `UserError` is the user's to fix; a 5xx,
 * 408 or 429 response, a transport failure or an `OperationalError` is transient.
 */
function failureOf(error: unknown): Failure | undefined {
	const status = isHttpError(error) ? error.status : undefined;
	const asked = isHttpError(error) ? retryAfterMs(error.headers['retry-after']) : undefined;
	const wait = asked === undefined ? {} : { retryAfterMs: asked };
	if (status === 429) return { cause: 'rate-limited', ...wait };
	if (
		status === 408 ||
		(status !== undefined && status >= 500) ||
		(status === undefined && (transportFailed(error) || error instanceof OperationalError))
	) {
		return { cause: 'temporarily-unavailable', ...wait };
	}
	if (status === 401) return { cause: 'credential-invalid' };
	if ((status !== undefined && status >= 400) || error instanceof UserError) {
		return { cause: 'configuration-invalid' };
	}
	return undefined;
}

/**
 * The n8n node error of a failed run, with the item index and the failure cause. An n8n node
 * error stays, so n8n keeps its message; other errors become its `cause`. An `HttpError` keeps
 * its status, headers and body, as `withResponse` gives them.
 */
function nodeErrorOf(node: INode, error: unknown, itemIndex: number | undefined): NodeError {
	const failure = failureOf(error);
	if (error instanceof NodeError) {
		// Changed in place, as `withResponse` does, so the class and the message stay.
		error.failure ??= failure;
		if (itemIndex !== undefined) error.context.itemIndex = itemIndex;
		return error;
	}
	const wrapped = new NodeOperationError(node, error instanceof Error ? error : String(error), {
		itemIndex,
		...(failure ? { failure } : {}),
	});
	return isHttpError(error)
		? Object.assign(wrapped, { status: error.status, headers: error.headers, body: error.body })
		: wrapped;
}

/**
 * The response of a request, after the node's `errorOf` checked a JSON body. An in-band error
 * throws a `UserError`. The in-process executor, the sandbox guest and triggers call it.
 */
export function checkedResponse(
	node: Pick<NodeDefinition, 'errorOf'>,
	request: HttpRequest,
	response: unknown,
): unknown {
	if (!node.errorOf || request.response === 'binary') return response;
	const message = node.errorOf(
		request.fullResponse && isRecord(response) ? response.body : response,
	);
	if (message !== undefined) throw new UserError(message);
	return response;
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

/** The parts of an HTTP attempt that its request gives. */
type RequestLabel = Omit<
	RunRequest,
	'startMs' | 'endMs' | 'resendCount' | 'status' | 'errorType' | 'responseBytes' | 'responseBody'
>;

type AttemptOutcome = Pick<RunRequest, 'status' | 'errorType' | 'responseBytes' | 'responseBody'>;

const DEFAULT_PORTS: Readonly<Record<string, number>> = { 'http:': 80, 'https:': 443 };

function requestLabelOf(
	options: IHttpRequestOptions,
	fields: Pick<RequestLabel, 'itemIndex' | 'template' | 'page' | 'requestBytes' | 'requestBody'>,
): RequestLabel {
	const url = new URL(options.url);
	return {
		...fields,
		method: options.method ?? 'GET',
		scheme: url.protocol.replace(/:$/, ''),
		host: url.hostname,
		port: url.port ? Number(url.port) : (DEFAULT_PORTS[url.protocol] ?? 0),
	};
}

/** The size of a text or byte body. A parsed body is not serialized again to measure it. */
const rawBytesOf = (body: unknown) =>
	typeof body === 'string' || body instanceof Uint8Array ? bytesOf(body) : undefined;

/** A full response gives its status and length. */
function responseOutcomeOf(response: unknown, full: boolean): AttemptOutcome {
	if (!full || !isRecord(response)) return { responseBytes: rawBytesOf(response) };
	const { statusCode, headers, body } = response;
	const length = headersOf(headers)['content-length'];
	return {
		...(typeof statusCode === 'number' ? { status: statusCode } : {}),
		responseBytes: length && /^\d+$/.test(length) ? Number(length) : rawBytesOf(body),
	};
}

/** The status of an HTTP error, else the transport error code or the error name. */
function attemptOutcomeOf(error: unknown): AttemptOutcome {
	if (isHttpError(error)) return { status: error.status, errorType: String(error.status) };
	const code = errorChain(error)
		.map((entry) => entry.code)
		.find((entry): entry is string => typeof entry === 'string');
	return { errorType: code ?? (error instanceof Error ? error.name : 'Error') };
}

/** The credential `run()` gets: the type name and the fields without secrets. */
type RunCredentialValue =
	| { readonly type: string; readonly fields: Record<string, unknown> }
	| undefined;

/** Error members that n8n shows or stores, and the `HttpError` members that `run()` reads. */
const REDACTED_MEMBERS = ['description', 'messages', 'body', 'headers', 'context', 'errorResponse'];

const MAX_CAUSE_DEPTH = 3;

/**
 * A copy of an error and its causes with only the name, the redacted message and the system error
 * code. The code stays because `failureOf` reads it, and the causes stay because they hold the
 * reason of a network failure. The depth limit stops a cause cycle.
 */
const plainError = (error: Error, redact: (text: string) => string, depth = 0): Error =>
	Object.assign(
		new Error(
			redact(error.message),
			depth < MAX_CAUSE_DEPTH && error.cause instanceof Error
				? { cause: plainError(error.cause, redact, depth + 1) }
				: undefined,
		),
		{
			name: error.name,
			...('code' in error && typeof error.code === 'string' ? { code: redact(error.code) } : {}),
		},
	);

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
		set('cause', plainError(cause, redact));
	}
	return error;
}

/** The name of the node parameter that picks the credential type. */
export const AUTHENTICATION = 'authentication';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** What the runtime reads of an action or a trigger to pick its credential. */
export type CredentialUser = Pick<Action, 'credentialTypes' | 'node'>;

export const hasSelector = ({ credentialTypes, node }: CredentialUser) =>
	credentialTypes.length > 1 || node.credential?.optional === true;

/** The credential type a node runs with: the selected one, else the one the node has. */
export function credentialTypeOf(
	user: Pick<CredentialUser, 'credentialTypes'>,
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
function credentialDescriptionOf({
	credentials: credentialTypes,
	credentialOptional,
}: Pick<ContractDocument, 'credentials' | 'credentialOptional'>) {
	// A selector lets setup see one credential slot; each credential shows for its own value.
	const optional = credentialOptional === true;
	const options = credentialOptionsOf({ credentials: credentialTypes, credentialOptional });
	const selector: INodeProperties[] =
		options.length > 0
			? [
					{
						displayName: 'Authentication',
						name: AUTHENTICATION,
						type: 'options',
						options: options.map((value) => ({ name: value, value })),
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

// The same default as `N8N_AI_MAX_RESPONSE_SIZE`, the response limit of the n8n AI clients.
const DEFAULT_MAX_RESPONSE_BYTES = 100 * 1024 * 1024;

// An action that logs in a loop must not fill the n8n log.
const MAX_LOG_LENGTH = 2_000;
const MAX_LOG_LINES = 100;
// One warning names this many output issues, so a large drifted list stays readable.
const MAX_DRIFT_ISSUES = 10;

/** File details for the store, from the action or from the response headers. */
export interface BinaryWriteMeta {
	/** The MIME type, e.g. `application/pdf`. */
	readonly mimeType?: string;
	/** The file name, e.g. `report.pdf`. */
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
	/** The workflow node that runs the action. */
	readonly node: INode;
	/**
	 * The parameter value of the input field `name`, as `getNodeParameter` returns it. An n8n host
	 * reads it at the parameter path of the form, e.g. `options.<name>` for an advanced field.
	 * `raw` keeps its expressions unresolved, for a field with a `t.pageValue()` that `run()`
	 * reads for each page.
	 */
	parameter(name: string, itemIndex: number, raw?: boolean): unknown;
	/** Sends a request with the credential of `credentialType` applied, as n8n does. */
	request(options: IHttpRequestOptions, credentialType: string | undefined): Promise<unknown>;
	/**
	 * The stored data of a credential: the fields `baseUrl` reads and the user's "Allowed HTTP
	 * Request Domains" setting. Without it, only the declared credential hosts limit a request.
	 */
	credentialData?(credentialType: string): Promise<unknown>;
	/** True when the node setting "On Error" continues: a failed item goes to the output. */
	continueOnFail(): boolean;
	/** Waits before a retry. */
	wait?(ms: number): Promise<void>;
	/** Writes to the n8n log. */
	log?(level: LogLevel, message: string): void;
	/**
	 * Shows a warning on the node run. With it, an output that does not match the contract
	 * passes on and the run warns once, and so does a list page field that the list does not
	 * read. Without it, the output or page fails the item, as in tests.
	 */
	warn?(message: string): void;
	/** Limits that replace the defaults of `RunLimits`. */
	readonly limits?: Partial<RunLimits>;
	/**
	 * The most bytes of one HTTP response body, after decompression. `Infinity` is no limit.
	 * Default: 100 MiB. `request` gets it as `maxResponseBytes` for a body that the client
	 * buffers, and must read no more than the limit. The executor counts the bytes of a binary
	 * response itself. n8n sets it from `N8N_NODE_RESPONSE_SIZE_MAX`.
	 */
	readonly maxResponseBytes?: number;
	/**
	 * The host patterns that a URL from input (`egress.fromInput`) may reach, and its redirect
	 * hops with the action hosts. Absent or empty is no limit. n8n sets it from
	 * `N8N_NODE_EGRESS_INPUT_HOSTS`.
	 */
	readonly egressInputHosts?: readonly string[];
	/** Needed by an action with a `t.binary()` field only. */
	readonly binary?: BinaryStore;
	/** The items of input `index`, for an action with named inputs. Input 0 is `items`. */
	inputItems?(index: number): readonly INodeExecutionData[];
	/** Needed by an action that imports `dataTables`. */
	readonly dataTables?: DataTables;
	/**
	 * Needed by an action that imports `parsers`. It gets a binary of the run, never another one.
	 * The executor checks the shape of the answer.
	 */
	readonly extractFile?: FileExtractor;
	/** Needed by an action that imports `code`. */
	readonly code?: CodeRunner;
	/** Needed by an action that imports `wait`: the next nodes run at `at`, not before. */
	waitUntil?(at: Date): Promise<void>;
	/**
	 * What the sub-nodes of a `kind` supply: one value, a list, or `undefined`. Needed by an
	 * action with a `provider.input()` field only.
	 */
	supplied?(kind: ProviderKind): Promise<unknown>;
	/** Records the run profile. Set only when the host has a run profile listener. */
	readonly recorder?: RunRecorder;
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

// One slot: the host sets the admin list once at start, as the executor loader.
const egressInputHosts = new Map<'hosts', readonly string[]>();
const maxResponseBytesSlot = new Map<'bytes', number | undefined>();

/**
 * Sets the most bytes of one HTTP response body in every node run. `Infinity` is no limit.
 * `undefined` is the default of `ExecutorHost.maxResponseBytes`.
 */
export const setMaxResponseBytes = (bytes: number | undefined) => {
	maxResponseBytesSlot.set('bytes', bytes);
};

/** Sets the hosts that a URL from input may reach in every node run. Empty is no limit. */
export const setEgressInputHosts = (hosts: readonly string[]) => {
	// The matcher compares lowercase hosts, and an admin list can have spaces after the commas.
	egressInputHosts.set(
		'hosts',
		hosts.map((host) => host.trim().toLowerCase()).filter((host) => host.length > 0),
	);
};

/** The limits that the host sets once at start, for the `ExecutorHost` of every node run. */
export const hostLimitsOf = (): Pick<ExecutorHost, 'egressInputHosts' | 'maxResponseBytes'> => ({
	egressInputHosts: egressInputHosts.get('hosts'),
	maxResponseBytes: maxResponseBytesSlot.get('bytes'),
});

/** The host parts that do not depend on the items of the run. */
const hostBaseOf = (context: NodeContext) => ({
	node: context.getNode(),
	...hostLimitsOf(),
	request: async (options: IHttpRequestOptions, credentialType: string | undefined) => {
		const response: unknown = credentialType
			? await context.helpers.httpRequestWithAuthentication.call(context, credentialType, options)
			: await context.helpers.httpRequest(options);
		return response;
	},
	credentialData: async (type: string) => await context.getCredentials(type),
	wait: async (ms: number) => await sleep(ms, context.getExecutionCancelSignal()),
	log: (level: LogLevel, message: string) => {
		const traceId = context.getTraceId();
		context.logger[level](message, {
			node: context.getNode().name,
			...(traceId === undefined ? {} : { traceId }),
		});
	},
	warn: (message: string) => context.addExecutionHints({ message, type: 'warning' }),
	binary: binaryStoreOf(context),
});

// n8n gives sub-nodes the root item 0, as the legacy chains read their model.
const SUPPLY_ITEM = 0;

/**
 * n8n does not fill the defaults of collection options, so an unset advanced field has no
 * parameter. The runtime reads '' as unset. A top-level field always has its default.
 */
const unsetValueOf = (name: string, path: string) => (path === name ? undefined : '');

/** The stored field of an input in a form without a `ui` block. */
const plainField = (name: string): StoredField => ({ path: name, read: (value) => value });

/** `fieldOf` gives where the form stores an input field, see `storedFieldOf`. */
const hostOf = (
	context: IExecuteFunctions,
	fieldOf: (name: string) => StoredField = plainField,
): ExecutorHost => ({
	...hostBaseOf(context),
	items: context.getInputData(),
	parameter: (name, itemIndex, raw) => {
		const { path, read } = fieldOf(name);
		return read(
			context.getNodeParameter(
				path,
				itemIndex,
				unsetValueOf(name, path),
				raw ? { rawExpressions: true } : {},
			),
		);
	},
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
	extractFile: fileExtractor(),
	code: codeRunnerOf(context),
	// A time wait gives no resume URL, as the Wait node does for a time interval.
	waitUntil: async (at) => await context.putExecutionToWait(at, { acceptsResumeRequest: false }),
	supplied: async (kind) =>
		await context.getInputConnectionData(PROVIDER_CONNECTIONS[kind], SUPPLY_ITEM),
});

/**
 * A sub-node runs as one item. Its parameters resolve against item `itemIndex` of the root
 * node, and a failure always reaches the root node.
 */
const supplyHostOf = (
	context: ISupplyDataFunctions,
	itemIndex: number,
	fieldOf: (name: string) => StoredField = plainField,
): ExecutorHost => ({
	...hostBaseOf(context),
	items: [{ json: {} }],
	parameter: (name, _itemIndex, raw) => {
		const { path, read } = fieldOf(name);
		return read(
			context.getNodeParameter(
				path,
				itemIndex,
				unsetValueOf(name, path),
				raw ? { rawExpressions: true } : {},
			),
		);
	},
	continueOnFail: () => false,
	supplied: async (kind) =>
		await context.getInputConnectionData(PROVIDER_CONNECTIONS[kind], itemIndex),
});

const isInputField = (value: object): value is { readonly input: string } =>
	Object.keys(value).length === 1 && 'input' in value && typeof value.input === 'string';

/** A body value with each `{ input }` object replaced by the input field it names. */
const inputValue = (value: unknown, input: Readonly<Record<string, unknown>>): unknown => {
	if (typeof value !== 'object' || value === null) return value;
	if (Array.isArray(value)) return value.map((entry) => inputValue(entry, input));
	if (isInputField(value)) return input[value.input];
	return inputValues(isRecord(value) ? value : {}, input);
};

/** The values with each input field filled in. An unset input field leaves its key out. */
function inputValues(
	values: Readonly<Record<string, unknown>> | undefined,
	input: Readonly<Record<string, unknown>>,
) {
	return (
		values &&
		Object.fromEntries(
			Object.entries(values).flatMap(([key, value]) => {
				const resolved = inputValue(value, input);
				return resolved === undefined ? [] : [[key, resolved]];
			}),
		)
	);
}

const queryValue = (value: unknown) =>
	typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
		? value
		: JSON.stringify(value);

/** A declarative request: a `path` after the base URL, or the absolute `url` of a lookup. */
export type RequestTarget<I> = Omit<RequestBinding<I>, 'path'> &
	(
		| { readonly path: string; readonly url?: never }
		| { readonly url: string; readonly path?: never }
	);

/** `path` with each `{field}` filled in from the input, URL-encoded. */
function filledPathOf(
	path: string,
	values: Readonly<Record<string, unknown>>,
): { readonly path: EncodedPath } {
	const filled = path.replace(/\{([^}]+)\}/g, (_, field: string) => {
		const value = values[field];
		// An empty segment sends the request to another URL, e.g. a collection.
		if (value === undefined || value === '') {
			throw new UserError(`The path field "${field}" has no value`);
		}
		return pathSegmentOf(String(queryValue(value)));
	});
	const encoded = `/${filled.replace(/^\//, '')}`;
	if (!isRequestPath(encoded)) throw new UserError(`The path ${encoded} must start with one "/"`);
	return { path: encoded };
}

/** The request of a declarative binding for one item's input. */
export function requestOf<I>(binding: RequestTarget<I>, input: I): HttpRequest {
	const values: Readonly<Record<string, unknown>> = isRecord(input) ? input : {};
	const target =
		binding.url === undefined ? filledPathOf(binding.path, values) : { url: binding.url };
	const query =
		typeof binding.query === 'function' ? binding.query(input) : inputValues(binding.query, values);
	const headers = typeof binding.headers === 'function' ? binding.headers(input) : binding.headers;
	const body = inputValues(binding.body, values);
	return {
		method: binding.method ?? 'GET',
		...target,
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
 * applies the `paging` input, and stops at the end of the list or at a repeated cursor. A page
 * fails when a field that `items` or the cursor reads does not match. `drift` gets the other
 * issues of a page; without it, they fail the page too.
 */
export function listItems<I>(
	http: Http,
	binding: Omit<ListBinding<I, string, AnySchema, unknown>, 'path'> & RequestTarget<I>,
	input: I,
	drift?: (issues: readonly string[]) => void,
) {
	const style = binding.pages;
	const first = requestOf(binding, input);
	const linked = style?.style === 'link';
	// The `Link` header is in the full response, so a linked list reads it.
	const pageOf = (response: unknown) => {
		const full = linked && isRecord(response) ? response : {};
		const { value: body, drift: issues } = readAs(binding.response, linked ? full.body : response, {
			path: 'page',
			read: (value) => [
				binding.items(value, input),
				style?.style === 'cursor' ? style.next(value) : undefined,
			],
		});
		if (issues.length > 0 && !drift) throw new Error(issues.join('; '));
		if (issues.length > 0) drift?.(issues);
		return { body, link: isRecord(full.headers) ? headerText(full.headers.link) : undefined };
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

/** The capabilities the providers give, by field. A value of another kind fails the run. */
async function readCapabilities(
	actionId: string,
	fields: readonly ProviderInputField[],
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
			if (!values.every((entry) => provider.is(kind, entry))) {
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

/** The context that `run()` gets for one item of a chunk. */
export type ChunkContext = RunContext<unknown> &
	HostImports<unknown> & { readonly credential?: unknown };

/** The output that `run()` gives for one item, or the error of that item. */
export type ItemOutcome = { readonly value: unknown } | { readonly error: unknown };

/**
 * Runs a `per-item` action over many items at once, e.g. in one guest run of the sandbox. It
 * gives one outcome per context, in order. Without `continueOnFail`, it ends after the first error.
 */
export type ChunkRunner = (
	contexts: readonly ChunkContext[],
	continueOnFail: boolean,
) => AsyncIterable<ItemOutcome>;

/** One output item and the output it goes to. */
interface Routed {
	readonly output: number;
	readonly data: INodeExecutionData;
}

/** `value` with each binary key in it replaced by `resolve(key, path)`, along `schema`. */
export async function withBinaries(
	value: unknown,
	schema: JsonSchema,
	resolve: (key: unknown, at: string) => Promise<unknown>,
	at = 'input',
): Promise<unknown> {
	if (value === undefined || !hasBinary(schema)) return value;
	if (schema['x-n8n-binary']) return await resolve(value, at);
	const { items } = schema;
	if (Array.isArray(value) && items) {
		return await Promise.all(
			value.map(
				async (entry, index) => await withBinaries(entry, items, resolve, `${at}[${index}]`),
			),
		);
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
			return [
				key,
				field ? await withBinaries(entry, field, resolve, `${at}.${key}`) : entry,
			] as const;
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

/** A native action or trigger has no SDK runtime: n8n runs its legacy node, so nothing freezes or loads it. */
export const nativeRunError = ({ id, native }: Pick<Action | Trigger, 'id' | 'native'>) =>
	new UnexpectedError(`${id} runs as the legacy node ${native?.type ?? ''}`);

/**
 * The executor of the action interface. Per-item and 1:N actions run once per input item with the
 * parameters of that item; a batch action runs once with all items and the parameters of the
 * first item. Each parameter set is filled with defaults and validated against `input`.
 * Transient failures of idempotent requests retry. Each output item is checked against
 * `output`, routed to its named output, and paired with the input items it comes from. A
 * mismatch passes on with one warning per run when the host has `warn`, and fails otherwise.
 * Continue-on-fail gives an error item on the last output, which n8n routes to the error
 * output when the node has one.
 */
export function executorOf<S extends Shape, O extends AnySchema>(
	action: Action<S, O> & { readonly runChunk?: ChunkRunner },
): (host: ExecutorHost) => Promise<INodeExecutionData[][]> {
	if (action.native) throw nativeRunError(action);
	const providerFields = providerInputsOf(action.input);
	const providerNames = new Set(providerFields.map(({ name }) => name));
	const inputKeys = Object.keys(action.input).filter((key) => !providerNames.has(key));
	const readers = new Map(
		Object.entries(action.input).map(([name, schema]) => [name, inputReaderOf(schema)]),
	);
	const readerOf = (key: string) => readers.get(key) ?? ((value: unknown) => value);
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
	const isBinaryKey = outputBinaryKeys(outputSchema);
	const declared: ReadonlySet<HostImport> = new Set(action.imports ?? []);
	const counted = inputCountOf({ input: action.inputSchema, inputs: action.inputs });
	const inputNames = action.inputs && !('count' in action.inputs) ? action.inputs : undefined;
	// Counted inputs read every possible input. The count of the run cuts the list.
	const inputCount = counted?.max ?? inputNames?.length ?? 1;
	const countOf = (input: unknown) => {
		const value = counted && isRecord(input) ? input[counted.field] : undefined;
		return typeof value === 'number' ? value : (counted?.initial ?? inputCount);
	};

	return async (host) => {
		const { items, recorder } = host;
		const inputLists: ReadonlyArray<readonly INodeExecutionData[]> = Array.from(
			{ length: inputCount },
			(_, index) => (index === 0 ? items : (host.inputItems?.(index) ?? [])),
		);
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
		const limits: RunLimits = Object.freeze({ ...DEFAULT_RUN_LIMITS, ...host.limits });
		const maxResponseBytes = host.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
		const responseTooLarge = () =>
			new UserError(
				`${action.id} got a response larger than ${maxResponseBytes} bytes, the most one response may have. The n8n setting N8N_NODE_RESPONSE_SIZE_MAX sets the limit`,
			);
		// axios gives no own code when it stops at `maxContentLength`, only this message.
		const stoppedAtLimit = (error: unknown) =>
			errorChain(error).some(
				({ message }) => message === `maxContentLength size of ${maxResponseBytes} exceeded`,
			);
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
		const credentialStart = credentialType === undefined ? undefined : recorder?.now();
		const baseUrl = await baseUrlOf(action.node, credentialType, credentialData);
		const credentialValue = action.node.credential?.types.find(
			({ name }) => name === credentialType,
		);
		// A failed read fails later, where the run needs the data; redaction then has the patterns.
		const storedCredential =
			credentialType && host.credentialData
				? await credentialData(credentialType).catch(() => undefined)
				: undefined;
		if (recorder && credentialType !== undefined && credentialStart !== undefined) {
			recorder.phase({
				name: 'credential',
				startMs: credentialStart,
				endMs: recorder.now(),
				credentialType,
				scheme: credentialValue?.scheme.kind ?? 'compat',
			});
		}
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
		const capture = recorder?.payloads;
		// n8n can store a new token during a request, so the payload redactor reads the data again after it.
		const payloadRedactor = new Map<'redact', (text: string) => string>();
		const payloadRedact = () => payloadRedactor.get('redact') ?? redact;
		const payloadTextOf = (value: unknown) =>
			capture === undefined || value === undefined
				? undefined
				: payloadOf(value, capture, payloadRedact());
		const payloadFor = (value: unknown) =>
			capture === undefined ? undefined : () => payloadOf(value, capture, payloadRedact());
		const refreshesPayloadRedactor = capture !== undefined && storesTokens;
		const responseBodyOf = (body: unknown) => {
			const text = payloadTextOf(body);
			return text === undefined ? {} : { responseBody: text };
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
					// No egress and no base URL is no host, as in the sandbox.
					...actionHostsOf(action.egress ?? { hosts: [] }, input, [action.node.baseUrl, baseUrl], {
						inputHosts: host.egressInputHosts ?? [],
						node: host.node,
						actionId: action.id,
					}),
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
		/** Adds an attempt to the profile. `label` is set only when the host records. */
		const recordAttempt = (
			label: RequestLabel | undefined,
			startMs: number | undefined,
			endMs: number | undefined,
			resendCount: number,
			outcome: () => AttemptOutcome,
		) => {
			if (!recorder || !label || startMs === undefined || endMs === undefined) return;
			recorder.request({ ...label, startMs, endMs, resendCount, ...outcome() });
		};

		/** `build` gives the options of each attempt, so a stream body opens again for a retry. */
		const send = async (
			build: () => Promise<IHttpRequestOptions>,
			retryable: boolean,
			retry: number,
			label: RequestLabel | undefined,
		): Promise<unknown> => {
			const startMs = label && recorder?.now();
			try {
				const options = await build();
				const response = await host.request(options, credentialType);
				const full = options.returnFullResponse === true;
				const endMs = recorder?.now();
				if (refreshesPayloadRedactor) payloadRedactor.set('redact', await redactNow());
				recordAttempt(label, startMs, endMs, retry, () => ({
					...responseOutcomeOf(response, full),
					...responseBodyOf(full && isRecord(response) ? response.body : response),
				}));
				return response;
			} catch (caught) {
				const error = withResponse(caught);
				const endMs = recorder?.now();
				const refreshed = refreshesPayloadRedactor ? await redactNow() : undefined;
				if (refreshed) payloadRedactor.set('redact', refreshed);
				recordAttempt(label, startMs, endMs, retry, () => ({
					...attemptOutcomeOf(error),
					...(isHttpError(error) ? responseBodyOf(error.body) : {}),
				}));
				if (stoppedAtLimit(error)) throw responseTooLarge();
				const delay = retryable ? retryDelay(error, retry) : undefined;
				if (delay === undefined) {
					// Before the redaction, which replaces the causes with plain errors.
					reportRedirectRefusal(error, { node: host.node, actionId: action.id });
					throw redactedError(error, refreshed ?? (await redactNow()));
				}
				// The failed attempt is not read, so free its connection.
				if (isHttpError(error) && error.body instanceof Readable) error.body.destroy();
				await wait(delay);
				return await send(build, retryable, retry + 1, label);
			}
		};

		/** The body streams from the store. The response stays a stream when `response` is `binary`. */
		const sendBinary = async (
			request: HttpRequest,
			options: IHttpRequestOptions,
			retryable: boolean,
			label: RequestLabel | undefined,
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
			if (!keep) return await send(build, retryable, 0, label);
			const response = await send(build, retryable, 0, label).catch((error: unknown) => {
				// An error response is not read, so free its connection.
				if (isHttpError(error) && error.body instanceof Readable) error.body.destroy();
				throw error;
			});
			const stream = isRecord(response) ? response.body : undefined;
			if (!(stream instanceof Readable)) {
				throw new UnexpectedError('The HTTP client gave no response stream');
			}
			const headers = headersOf(isRecord(response) ? response.headers : undefined);
			// After decompression, the HTTP client can keep the compressed `content-length`. Only a body
			// that compression makes larger, a few bytes under the limit, fails here too early.
			if (Number(headers['content-length']) > maxResponseBytes) {
				stream.destroy();
				throw responseTooLarge();
			}
			// Count the bytes as they arrive, so the store never gets more than the limit.
			const read = { bytes: 0 };
			async function* limited(source: AsyncIterable<unknown>) {
				for await (const chunk of source) {
					read.bytes += bytesOf(chunk) ?? 0;
					// The throw ends `for await`, and that destroys the response stream.
					if (read.bytes > maxResponseBytes) throw responseTooLarge();
					yield chunk;
				}
			}
			const entry = await store
				.write(Readable.from(limited(stream), { objectMode: false }), {
					mimeType: headers['content-type']?.split(';')[0]?.trim() || undefined,
					fileName: fileNameOf(headers, options.url),
				})
				.catch((error: unknown) => {
					// The store can wrap the stream error, so the count decides.
					throw read.bytes > maxResponseBytes ? responseTooLarge() : error;
				});
			const file = handleOf(entry);
			const statusCode = isRecord(response) ? response.statusCode : undefined;
			return request.fullResponse ? { body: file, headers, statusCode } : file;
		};

		/** `binding` is the declarative binding that sends the requests, for the profile. */
		const httpFor = (
			itemIndex: number,
			input: Readonly<Record<string, unknown>>,
			binding?: { readonly path: string; readonly paged: boolean },
		): Http => {
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
				// The client stops a buffered body at the limit. The executor counts a binary stream.
				const withLimit =
					options.response === 'binary' || !Number.isFinite(maxResponseBytes)
						? built
						: { ...built, maxResponseBytes };
				const requestOptions =
					allowedDomains === undefined ? withLimit : { ...withLimit, allowedDomains };
				const requestBody = payloadTextOf(requestOptions.body);
				const label =
					recorder &&
					requestLabelOf(requestOptions, {
						itemIndex,
						template: binding?.path,
						page: binding?.paged ? sent.requests : undefined,
						requestBytes: entries.has(options.body)
							? entries.get(options.body)?.bytes
							: bytesOf(requestOptions.body),
						...(requestBody === undefined ? {} : { requestBody }),
					});
				const response =
					options.response === 'binary' || entries.has(options.body)
						? await sendBinary(options, requestOptions, retryable, label)
						: await send(async () => requestOptions, retryable, 0, label);
				return checkedResponse(action.node, options, response);
			}
			return { request };
		};

		// One read per run: each read runs the sub-nodes and adds a sub-node run in n8n.
		const capabilities = new Map<'capabilities', Promise<Record<string, unknown>>>();
		const capabilitiesOf = async () => {
			const read =
				capabilities.get('capabilities') ?? readCapabilities(action.id, providerFields, host);
			capabilities.set('capabilities', read);
			return await read;
		};

		const readInput = async (itemIndex: number): Promise<RunInput<S>> => {
			const parameters = Object.fromEntries(
				inputKeys
					.map(
						(key) =>
							[key, readerOf(key)(host.parameter(key, itemIndex, rawKeys.has(key)))] as const,
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
				? await withBinaries(defaulted, action.inputSchema, async (key, at) => {
						// n8n resolved an expression to the binary itself, which is not a key.
						const issue = binaryKeyIssue(key, at);
						if (issue) throw new NodeOperationError(host.node, issue, { itemIndex });
						return handleOf(await binaryStore().input(itemIndex, key));
					})
				: defaulted;
			// After the defaults: a capability is not data, so nothing may copy it.
			const input =
				providerFields.length > 0 && isRecord(withFiles)
					? { ...withFiles, ...(await capabilitiesOf()) }
					: withFiles;
			if (!isInput(input)) {
				const issues = validate(input, action.inputSchema);
				throw new NodeOperationError(host.node, issues.join('; '), { itemIndex });
			}
			return input;
		};

		const inputOf = async (itemIndex: number): Promise<RunInput<S>> => {
			const startMs = recorder?.now();
			const input = await readInput(itemIndex);
			if (recorder && startMs !== undefined) {
				recorder.input(recorder.now() - startMs, payloadFor(input));
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
		// The run warns once. Each item of a per-item run starts at output[0], so issues repeat.
		const drift = new Set<string>();
		const addDrift = (issues: readonly string[]) => issues.forEach((issue) => drift.add(issue));

		const openTables = new Map<string, Promise<DataTable>>();
		const refuse = (name: HostImport) => {
			const message = `${action.id} does not list "${name}" in its imports`;
			reportRefusal({ action: action.id, node: host.node, permission: name, message });
			throw new UnexpectedError(message);
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
			parsers: {
				async extract(file, format, options = {}) {
					const extract = hostService('parsers', host.extractFile);
					// A bundle can make an object that looks like a binary. Only a handle of this run is read.
					if (!entries.has(file)) {
						throw new UnexpectedError(`${action.id} reads a file that is not a binary of this run`);
					}
					// The options come from the bundle, so the host checks them before its parser reads them.
					const request = { format, options };
					if (!isFileExtractRequest(request)) {
						throw new UserError(fileRequestIssues(request).join('; '));
					}
					const value = await extract(file, request);
					if (!isFileResult(format, value)) {
						throw new UnexpectedError(
							`The host gave the ${format} content of a file in another shape`,
						);
					}
					return value;
				},
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
				const startMs = recorder?.now();
				const issues = validate(json, outputSchema, { path: `output[${at}]` });
				if (recorder && startMs !== undefined) {
					recorder.output(recorder.now() - startMs, payloadFor(json));
				}
				if (issues.length > 0 && host.warn && isRecord(json)) {
					addDrift(issues);
					return json;
				}
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
				if (!binaryApi) return { json };
				const binary = Object.fromEntries(
					Object.entries(json).flatMap(([key, field]) => {
						if (!isBinaryKey(key)) {
							// A drift warning lets an undeclared field through, but never a file.
							if (entries.has(field))
								throw fail(
									`output[${at}].${key}: holds a binary, and the contract declares no binary under this key`,
									current ?? 0,
								);
							return [];
						}
						if (field === undefined) return [];
						const entry = entries.get(field);
						if (!entry)
							throw fail(`output[${at}].${key}: must be a binary of this run`, current ?? 0);
						return [[key, entry] as const];
					}),
				);
				return {
					json: Object.fromEntries(Object.entries(json).filter(([key]) => !isBinaryKey(key))),
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

		const itemContextOf = (
			item: INodeExecutionData,
			input: RunInput<S>,
			http: Http,
		): RunContext<RunInput<S>> & HostImports<RunInput<S>> & { readonly credential: unknown } => ({
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

		const runItem = async (itemIndex: number, names: readonly string[] | undefined) => {
			const item = items[itemIndex];
			if (!item) return [];
			const input = await inputOf(itemIndex);
			const route = routeOf(names, itemIndex);
			const bound = binding ?? listBinding;
			const http = httpFor(
				itemIndex,
				input,
				bound && { path: bound.path, paged: bound === listBinding },
			);
			// The host sends a declarative request or list itself.
			const result: Promise<unknown> | AsyncIterable<unknown> | Iterable<unknown> | undefined =
				binding
					? http.request(requestOf(binding, input))
					: listBinding
						? listItems(http, listBinding, input, host.warn ? addDrift : undefined)
						: action.run?.(itemContextOf(item, input, http));
			if (!result) throw new UnexpectedError(`${action.id} has no run() and no request`);
			if (action.flow.cardinality === 'per-item') return [route(await result, 0)];
			return await collect(result, route);
		};

		/**
		 * The per-item run of all items through `runChunk`. The inputs come first. Without
		 * continue-on-fail, the items before a failed input still run, and then the input error fails.
		 */
		const runChunked = async (
			runChunk: ChunkRunner,
			names: readonly string[] | undefined,
		): Promise<Routed[]> => {
			const continueOnFail = host.continueOnFail();
			const prepared: Array<{ itemIndex: number; context?: ChunkContext; error?: unknown }> = [];
			for (const [itemIndex, item] of items.entries()) {
				try {
					const input = await inputOf(itemIndex);
					prepared.push({
						itemIndex,
						context: itemContextOf(item, input, httpFor(itemIndex, input)),
					});
				} catch (error) {
					prepared.push({ itemIndex, error });
					if (!continueOnFail) break;
				}
			}
			const contexts = prepared.flatMap(({ context }) => (context ? [context] : []));
			const outcomes = runChunk(contexts, continueOnFail)[Symbol.asyncIterator]();
			const routed: Routed[] = [];
			try {
				for (const { itemIndex, context, error } of prepared) {
					const next = context ? await outcomes.next() : undefined;
					try {
						if (!context) throw error;
						if (!next || next.done)
							throw new UnexpectedError(`${action.id} gave no outcome for item ${itemIndex}`);
						if ('error' in next.value) throw next.value.error;
						routed.push(routeOf(names, itemIndex)(next.value.value, 0));
					} catch (failure) {
						if (!continueOnFail) throw failure;
						routed.push(errorItem(failure, { item: itemIndex }, names));
					}
				}
			} finally {
				await outcomes.return?.();
			}
			return routed;
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
				const entries = readerOf(outputs.each)(host.parameter(outputs.each, 0));
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
					const result = counted
						? action.run?.({
								...context,
								get credential() {
									return runCredential();
								},
								inputs: inputLists.slice(0, countOf(input)),
							})
						: inputNames
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
					// A batch fails as a whole, so no item index fits.
					if (!host.continueOnFail()) throw nodeErrorOf(host.node, error, undefined);
					const all = [...sources.values()].map(({ pair }) => pair);
					return { names, routed: [errorItem(error, all, names)] };
				}
			}
			if (action.runChunk && action.flow.cardinality === 'per-item') {
				return { names, routed: await runChunked(action.runChunk, names) };
			}
			// One list for all items: a copy per item would make a large input quadratic.
			const routed: Routed[] = [];
			await items.reduce(async (previous, _item, itemIndex) => {
				await previous;
				try {
					for (const entry of await runItem(itemIndex, names)) routed.push(entry);
				} catch (error) {
					if (!host.continueOnFail()) throw nodeErrorOf(host.node, error, itemIndex);
					routed.push(errorItem(error, { item: itemIndex }, names));
				}
			}, Promise.resolve());
			return { names, routed };
		};

		const { names, routed } = await run().catch(async (error: unknown) => {
			throw redactedError(error, await redactNow());
		});
		recorder?.drift(drift.size);
		if (drift.size > 0) {
			const shown = [...drift].slice(0, MAX_DRIFT_ISSUES).join('; ');
			const more = drift.size > MAX_DRIFT_ISSUES ? ` (${drift.size - MAX_DRIFT_ISSUES} more)` : '';
			host.warn?.(
				redact(
					`The response of ${action.id} does not match its contract, so check the fields: ${shown}${more}`,
				),
			);
		}
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
 * it reads the list as the editor stores a `json` parameter (text) or a `list` widget (rows).
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
	const rows: unknown =
		typeof parsed === 'object' &&
		parsed !== null &&
		!Array.isArray(parsed) &&
		'values' in parsed &&
		Object.keys(parsed).length === 1
			? parsed.values
			: parsed;
	const entries: unknown[] = Array.isArray(rows) ? rows : [];
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

/**
 * The n8n inputs of counted inputs, then `then`: one per count, as the legacy Merge node makes
 * them. n8n evaluates this function as an expression, so the count follows the parameter.
 */
function countedInputs(
	parameters: Record<string, unknown>,
	field: string,
	bounds: { min: number; max: number; initial: number },
	then: unknown[],
) {
	const value = Number(parameters[field] ?? bounds.initial);
	const count = Number.isInteger(value)
		? Math.min(bounds.max, Math.max(bounds.min, value))
		: bounds.initial;
	const main = Array.from({ length: count }, (_, index) => ({
		type: 'main',
		displayName: `Input ${index + 1}`,
	}));
	return [...main, ...then];
}

/** @internal Exported for a test: the description keeps it as expression text only. */
export const countedInputsOf = countedInputs;

/** Inputs run when one of them has items, as the Merge node does. */
function mainInputsOf(
	contract: ContractDocument,
	supplyInputs: INodeInputConfiguration[],
): Pick<INodeTypeDescription, 'inputs' | 'requiredInputs'> {
	const counted = inputCountOf(contract);
	if (counted) {
		const { field, ...bounds } = counted;
		const args = [field, bounds, supplyInputs].map((value) => JSON.stringify(value)).join(', ');
		return {
			inputs: `={{(${countedInputs.toString()})($parameter, ${args})}}`,
			requiredInputs: 1,
		};
	}
	const { inputs } = contract;
	return inputs && !('count' in inputs)
		? {
				inputs: [
					...inputs.map((displayName): INodeInputConfiguration => ({ type: 'main', displayName })),
					...supplyInputs,
				],
				requiredInputs: 1,
			}
		: { inputs: ['main', ...supplyInputs] };
}

const SUPPLY_LABELS: Record<ProviderKind, string> = {
	chatModel: 'Chat Model',
	memory: 'Memory',
	tool: 'Tool',
	embeddings: 'Embeddings',
};

/** The n8n input of a `provider.input()` field. A list takes any number of sub-nodes. */
const supplyInputOf = ({
	kind,
	many,
	required,
	title,
}: ProviderInputField): INodeInputConfiguration => ({
	type: PROVIDER_CONNECTIONS[kind],
	displayName: title ?? SUPPLY_LABELS[kind],
	required,
	...(many ? {} : { maxConnections: 1 }),
});

/**
 * The n8n inputs and outputs. A sub-node has no main connection: n8n runs it when its root
 * node reads it.
 */
function connectionsOf(
	contract: ContractDocument,
	input: Shape,
): Pick<INodeTypeDescription, 'inputs' | 'requiredInputs' | 'outputs' | 'outputNames'> {
	const supplyInputs = providerInputsOf(input).map(supplyInputOf);
	const kind = providedKindOf(contract.output);
	if (kind) {
		return {
			inputs: supplyInputs,
			outputs: [PROVIDER_CONNECTIONS[kind]],
			outputNames: [SUPPLY_LABELS[kind]],
		};
	}
	return { ...mainInputsOf(contract, supplyInputs), ...outputsOf(contract.outputs) };
}

/** How often a call runs before its error stays, and the wait between two tries. */
interface Tries {
	readonly count: number;
	readonly waitMs: number;
}

const ONE_TRY: Tries = { count: 1, waitMs: 0 };

/**
 * The tries of a tool call that a root node makes, from the node settings. The bounds are those
 * of `makeHandleToolInvocation` in n8n core, which calls a legacy tool node.
 */
const toolTriesOf = ({ retryOnFail, maxTries, waitBetweenTries }: INode): Tries =>
	retryOnFail === true
		? {
				count: Math.min(5, Math.max(2, maxTries ?? 3)),
				waitMs: Math.min(5000, Math.max(0, waitBetweenTries ?? 1000)),
			}
		: ONE_TRY;

async function tried<T>(
	run: () => Promise<T>,
	tries: Tries,
	signalOf: () => AbortSignal | undefined,
	done = 1,
): Promise<T> {
	try {
		return await run();
	} catch (error) {
		if (done >= tries.count) throw error;
		const signal = signalOf();
		if (signal?.aborted) throw error;
		await sleep(tries.waitMs, signal);
		return await tried(run, tries, signalOf, done + 1);
	}
}

/**
 * Records each call of a capability as a run of the sub-node, as the legacy sub-nodes do, so
 * the editor and the execution data show what the root node asked and got. Each try is one run.
 */
function recordedSupply(
	value: Record<string, unknown>,
	kind: ProviderKind,
	context: ISupplyDataFunctions,
	tries = ONE_TRY,
): Record<string, unknown> {
	const type = PROVIDER_CONNECTIONS[kind];
	// A JSON copy: the run data must not hold functions or change with the capability.
	const dataOf = (entry: unknown): IDataObject => {
		const text = JSON.stringify(entry ?? null);
		const parsed: unknown = JSON.parse(text);
		return isRecord(parsed) ? parsed : { value: text };
	};
	return Object.fromEntries(
		Object.entries(value).map(([key, member]) => {
			if (typeof member !== 'function') return [key, member];
			const once = async (args: unknown[]) => {
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
			const call = async (...args: unknown[]) =>
				await tried(
					async () => await once(args),
					tries,
					() => context.getExecutionCancelSignal(),
				);
			return [key, call];
		}),
	);
}

/** The `supplyData()` result of a sub-node from the one output item its run gives. */
function supplyDataOf(
	actionId: string,
	kind: ProviderKind,
	outputs: INodeExecutionData[][],
	context: ISupplyDataFunctions,
): SupplyData {
	const value = outputs[0]?.[0]?.json;
	if (!provider.is(kind, value)) {
		throw new UnexpectedError(`${actionId} provides ${kind}, and its run() gave something else`);
	}
	return { response: recordedSupply(value, kind, context) };
}

/** The n8n webhook of a webhook trigger. */
function webhookOf({
	method = DEFAULT_WEBHOOK_ENDPOINT.method,
	path = DEFAULT_WEBHOOK_ENDPOINT.path,
}: WebhookEndpoint = {}): IWebhookDescription {
	return { name: 'default', httpMethod: method, responseMode: 'onReceived', path };
}

/** The most entries one lookup gives. A search narrows a longer list. */
export const MAX_LOOKUP_ENTRIES = 500;

const lookupEntry = t.obj({ id: t.str(), label: t.str(), url: t.str().optional() });

/** The value at a dot path, e.g. `title.0.plain_text`. An empty path is the value itself. */
const valueAtPath = (value: unknown, at: string | undefined): unknown =>
	(at ?? '')
		.split('.')
		.filter((key) => key !== '')
		.reduce<unknown>(
			(current, key) =>
				Array.isArray(current)
					? current[Number(key)]
					: isRecord(current)
						? current[key]
						: undefined,
			value,
		);

/** A template of a lookup item with each `{path}` filled in from one entry. */
const filledTemplate = (template: string, entry: unknown) =>
	template.replace(/\{([^}]+)\}/g, (_, at: string) => {
		const value = valueAtPath(entry, at);
		return ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : '';
	});

/** The entries of one lookup page. A `label` search keeps the entries whose label has the text. */
export function lookupEntriesOf(
	lookup: LookupDocument,
	page: unknown,
	search: string | undefined,
): LookupEntry[] {
	const list = valueAtPath(page, lookup.items);
	const text = lookup.search === 'label' ? search?.trim().toLowerCase() : undefined;
	return (Array.isArray(list) ? list : []).flatMap((entry: unknown) => {
		const id = filledTemplate(lookup.item.id, entry);
		const label = filledTemplate(lookup.item.label, entry) || id;
		const url = lookup.item.url === undefined ? '' : filledTemplate(lookup.item.url, entry);
		if (id === '' || (text && !label.toLowerCase().includes(text))) return [];
		// The URL can come from the service, and the editor shows it as a link.
		return [{ id, label, ...(/^https?:\/\//i.test(url) ? { url } : {}) }];
	});
}

/** What a lookup needs of the action whose field refers to the resource. */
export type LookupOwner = Pick<Action, 'id' | 'node' | 'version' | 'credentialTypes' | 'egress'>;

/**
 * The action that runs one lookup. It has the node, the credential types and the egress of the
 * action whose field refers to the resource, so the host sends the lookup as it sends a step:
 * with the credential, the egress check, the retries and the limits.
 */
export function lookupActionOf(
	owner: LookupOwner,
	resourceId: string,
	lookup: LookupDocument,
): Action {
	const { pages: style, request } = lookup;
	const { url, path: at, ...options } = request;
	const binding = {
		...options,
		...(url === undefined ? { path: at ?? '/' } : { url }),
		response: new Schema<unknown>(lookup.response, false),
		items: (page: unknown, input: { readonly search?: string }) =>
			lookupEntriesOf(lookup, page, input.search),
		...(style === undefined
			? {}
			: {
					pages:
						style.style === 'cursor'
							? {
									...style,
									next: (page: unknown) => {
										const cursor = valueAtPath(page, style.next);
										return typeof cursor === 'string' || typeof cursor === 'number'
											? cursor
											: undefined;
									},
								}
							: style,
				}),
	};
	const input: Shape = {
		search: t.str().optional(),
		...Object.fromEntries((lookup.input ?? []).map((name) => [name, t.str()])),
		...(style === undefined ? {} : { paging }),
	};
	const { id, node, version, credentialTypes, egress } = owner;
	return {
		node,
		version,
		credentialTypes,
		...(egress ? { egress } : {}),
		id: `${id}:${resourceId}`,
		operation: resourceId,
		action: `List ${resourceId}`,
		summary: `Lists the ${resourceId} resources.`,
		flow: { effect: 'read', cardinality: '1:N', idempotent: true },
		input,
		inputSchema: t.obj(input).json,
		output: lookupEntry,
		scopes: [],
		// `response` lists only the fields the lookup reads, so other fields are no drift.
		run: ({ http, input: values }) => listItems(http, binding, values, () => undefined),
	};
}

/** Runs one lookup and gives its entries as n8n list search results. */
export async function runLookup(
	action: Action,
	host: ExecutorHost,
): Promise<INodeListSearchResult> {
	const [entries = []] = await executorOf(action)(host);
	return {
		results: entries.flatMap(({ json }) =>
			matches(lookupEntry, json)
				? [{ name: json.label, value: json.id, ...(json.url ? { url: json.url } : {}) }]
				: [],
		),
	};
}

/** The host of a lookup in the n8n form: the parameters of the node, without items. */
function lookupHostOf(
	context: ILoadOptionsFunctions,
	input: Readonly<Record<string, unknown>>,
): ExecutorHost {
	return {
		node: context.getNode(),
		...hostLimitsOf(),
		items: [{ json: {} }],
		parameter: (name) =>
			name === AUTHENTICATION ? context.getCurrentNodeParameter(AUTHENTICATION) : input[name],
		request: async (options, credentialType) => {
			const response: unknown = credentialType
				? await context.helpers.httpRequestWithAuthentication.call(context, credentialType, options)
				: await context.helpers.httpRequest(options);
			return response;
		},
		credentialData: async (type) => await context.getCredentials(type),
		continueOnFail: () => false,
		log: (level, message) => context.logger[level](message, { node: context.getNode().name }),
		// A lookup page with other fields still lists what it can.
		warn: (message) => context.logger.debug(message, { node: context.getNode().name }),
	};
}

/**
 * The value of an input field that a dependent lookup reads, e.g. the spreadsheet of a sheet:
 * the ID of a resource locator, the first match of the field pattern, e.g. in a URL.
 */
function lookupInputValueOf(
	context: ILoadOptionsFunctions,
	parameter: string,
	schema: JsonSchema | undefined,
): unknown {
	const value = locatorValueOf(context.getCurrentNodeParameter(parameter));
	if (typeof value !== 'string' || schema?.pattern === undefined) return value;
	return firstMatchOf(schema.pattern, value) ?? value;
}

/**
 * The n8n `listSearch` method of each resource that an input field refers to, by resource id.
 * `ownerOf` gives the action that the lookups run as. Absent when the input has no lookup.
 */
export function listSearchMethodsOf(
	contract: Pick<ContractDocument, 'input'>,
	ui: ActionUiDocument | undefined,
	ownerOf: () => Promise<LookupOwner>,
): INodeType['methods'] | undefined {
	const lookups = lookupsOf(contract.input);
	if (lookups.size === 0) return undefined;
	const pathOf = parameterPathOf(contract.input, ui);
	const methods = [...lookups].map(([resourceId, lookup]) => {
		async function listSearch(this: ILoadOptionsFunctions, filter?: string) {
			const parents = (lookup.input ?? []).map((name) => [
				name,
				lookupInputValueOf(this, pathOf(name), contract.input.properties?.[name]),
			]);
			// The list stays empty until the user sets each parent field.
			if (parents.some(([, value]) => value === undefined || value === '')) return { results: [] };
			const input = {
				...Object.fromEntries(parents),
				...(filter ? { search: filter } : {}),
				...(lookup.pages ? { paging: { mode: 'limit', max: MAX_LOOKUP_ENTRIES } } : {}),
			};
			return await runLookup(
				lookupActionOf(await ownerOf(), resourceId, lookup),
				lookupHostOf(this, input),
			);
		}
		return [resourceId, listSearch] as const;
	});
	return { listSearch: Object.fromEntries(methods) };
}

/**
 * The lookup owner of a frozen version, without its bundle: the credential types from the
 * credential manifests of the host, else as n8n defines them, and the egress of the manifest.
 */
export async function manifestLookupOwnerOf({ contract }: VersionManifest): Promise<LookupOwner> {
	const types = await Promise.all(
		contract.credentials.map(async (name) => {
			const stored = await credentialManifestOf(name);
			return stored ? compatTypeOfManifest(stored) : compat(name);
		}),
	);
	return {
		id: contract.id,
		version: contract.version,
		credentialTypes: contract.credentials,
		egress: contract.egress ?? { hosts: [] },
		node: {
			id: contract.node,
			displayName: contract.nodeDisplayName,
			...(contract.baseUrl === undefined ? {} : { baseUrl: contract.baseUrl }),
			...(types.length > 0
				? {
						credential: {
							types,
							scopes: {},
							optional: contract.credentialOptional === true,
						},
					}
				: {}),
		},
	};
}

/**
 * The n8n node description of one version of an action, trigger or provider. The host projects it
 * from the contract and the `ui` block, so the editor shows only what the contract types. Every Node Contract version
 * up to this host's has the same projection. A later version that changes the description adds a
 * branch on `nodeContract`.
 *
 * @throws an `UnexpectedError` for a trigger that a legacy node runs.
 */
export function nodeDescriptionOf({
	contract,
	ui,
}: Pick<VersionManifest, 'contract' | 'nodeContract' | 'ui'>): INodeTypeDescription {
	const input = shapeOf(contract.input);
	const { selector, credentials } = credentialDescriptionOf(contract);
	const formInput: JsonSchema = {
		...contract.input,
		properties: Object.fromEntries(
			Object.entries(contract.input.properties ?? {}).filter(
				([, schema]) => providerInputOf(schema) === undefined,
			),
		),
	};
	const base = {
		displayName: `${contract.nodeDisplayName}: ${contract.action}`,
		name: nodeNameOf(contract.id),
		version: contract.version,
		description: contract.summary,
		// The canvas shows the action under a node that the user renamed.
		subtitle: contract.action,
		defaults: { name: contract.action },
		credentials,
		properties: [...selector, ...formPropertiesOf(formInput, ui)],
	};
	const { trigger } = contract;
	if (trigger === undefined) {
		return { ...base, group: [GROUPS[contract.flow.effect]], ...connectionsOf(contract, input) };
	}
	const triggerBase: INodeTypeDescription = {
		...base,
		group: ['trigger'],
		inputs: [],
		outputs: ['main'],
	};
	// n8n adds Poll Times to a polling node and schedules its polls.
	if (trigger === 'poll') return { ...triggerBase, polling: true };
	if (trigger === 'webhook') return { ...triggerBase, webhooks: [webhookOf(contract.endpoint)] };
	throw new UnexpectedError(`${contract.id} starts on ${trigger}: a legacy node runs it`);
}

/** An n8n node type for one action; the platform part is `executorOf`. */
export function toNodeType<S extends Shape, O extends AnySchema>(
	action: Action<S, O>,
): new () => INodeType {
	if (action.native) throw nativeRunError(action);
	const ui = matches(actionUiSchema, action.ui) ? action.ui : undefined;
	const description = nodeDescriptionOf({
		contract: toContract(action),
		nodeContract: NODE_CONTRACT_VERSION,
		ui,
	});

	const run = executorOf(action);
	const fieldOf = storedFieldOf(action.inputSchema, ui);
	const kind = providedKindOf(action.output.json);
	const methods = listSearchMethodsOf({ input: action.inputSchema }, ui, async () => action);
	if (kind) {
		return class implements INodeType {
			description = description;

			methods = methods;

			async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
				const outputs = await run(supplyHostOf(this, itemIndex, fieldOf));
				return supplyDataOf(action.id, kind, outputs, this);
			}
		};
	}
	return class implements INodeType {
		description = description;

		methods = methods;

		async execute(this: IExecuteFunctions) {
			return await run(hostOf(this, fieldOf));
		}
	};
}

/**
 * Who vouches for a version. The host records it when the version enters its store. It
 * decides only where the bundle runs, not what the bundle may do:
 * - `first-party`: n8n ships it in the release, or signs it with the first-party key.
 * - `community`: n8n reviewed it and signs it with the vetting key.
 * - `private`: no trusted key signs it, e.g. a version that the lock alone anchors.
 */
export type ContractOrigin = 'first-party' | 'community' | 'private';

/** A frozen action version: its manifest, its origin and a reader for its bundle. */
export interface FrozenVersion {
	/** The version manifest. */
	readonly manifest: VersionManifest;
	/** Who vouches for the version. The host runs only `first-party` bundles out of the sandbox. */
	readonly origin: ContractOrigin;
	/** Reads the bundle code. The host checks it against `manifest.bundleHash`. */
	readBundle(): Promise<string>;
}

/**
 * The host module of the SDK validator, since Node Contract 2.9.0. Freeze keeps the SDK
 * `validator` module out of each bundle, so no bundle carries ajv.
 */
export const VALIDATOR_MODULE = '@n8n/node-sdk/validator';

/**
 * Host modules a frozen bundle may import. `n8n-workflow` is part of every Node Contract
 * version. A bundle tests patterns with `safeRegex.test`, so `test` is `testPattern`: the same
 * result, without a `vm` call for a pattern that it allows.
 */
const HOST_MODULES: Readonly<Record<string, unknown>> = {
	// The host classes, so the host classifies the errors that a frozen bundle throws.
	'n8n-workflow': { safeRegex: { ...safeRegex, test: testPattern }, OperationalError, UserError },
	[VALIDATOR_MODULE]: { validate },
};

/** The host gives a frozen bundle the module of this name. */
export const isHostModule = (name: string) => Object.hasOwn(HOST_MODULES, name);

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

/** Runs a CommonJS bundle from `freezeAction` and returns the action or trigger it exports. */
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
	if (!isContract(exported)) throw new UnexpectedError('The bundle does not export a contract');
	return exported;
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

/** Executors by bundle hash. A bundle loads on its first execution only. */
const executors = new Map<string, Promise<Executor>>();

/** The credential manifest that the host has for an n8n credential type name, if any. */
export type CredentialManifestOf = (name: string) => Promise<CredentialManifest | undefined>;

// One slot: the host sets its credential manifests once at start.
const credentialManifests = new Map<'lookup', CredentialManifestOf>();

/**
 * Sets where the host finds the credential manifest of a name, e.g. its store. The host calls it
 * once at start. Without it, each bundle keeps the hosts of its own credential types.
 */
export const setCredentialManifests = (lookup: CredentialManifestOf) => {
	credentialManifests.set('lookup', lookup);
	// An executor with the old hosts must not run on.
	executors.clear();
};

/** The credential manifest of a name from the lookup of the host. */
export const credentialManifestOf: CredentialManifestOf = async (name) =>
	await credentialManifests.get('lookup')?.(name);

/**
 * n8n has one credential type for each name and signs with it, so the hosts and the base URL of
 * a credential type come from its credential manifest in the store, never from a bundle. A type
 * without a manifest, e.g. a compat type, keeps the ones of `contract`.
 */
export async function withCredentialHostsOf<C extends Pick<Action, 'node'>>(
	contract: C,
	manifestOf: CredentialManifestOf = credentialManifestOf,
): Promise<C> {
	const credential = contract.node.credential;
	if (!credential) return contract;
	const types = await Promise.all(
		credential.types.map(async (type) => {
			const manifest = await manifestOf(type.name);
			return manifest ? { ...type, hosts: manifest.hosts, baseUrl: manifest.baseUrl } : type;
		}),
	);
	return { ...contract, node: { ...contract.node, credential: { ...credential, types } } };
}

/**
 * Refuses a bundle whose export grants other permissions than its manifest. The signed manifest
 * is what a reviewer reads, so the bundle may not add to it or take from it.
 */
export function assertManifestPermissions(
	{ id, semver, contract }: VersionManifest,
	exported: Action | Trigger,
) {
	const signed = new Map(Object.entries(permissionsOf(contract)));
	const granted = new Map(Object.entries(permissionsOf(toContract(exported))));
	const keys = [...new Set([...granted.keys(), ...signed.keys()])];
	const differences = keys.flatMap((key) => {
		const [bundle, manifest] = [granted.get(key), signed.get(key)].map((value) =>
			JSON.stringify(value),
		);
		return bundle === manifest
			? []
			: [`${key}: the bundle grants ${bundle}, the manifest ${manifest}`];
	});
	if (differences.length > 0) {
		const message = `The bundle of ${id}@${semver} grants other permissions than its manifest. ${differences.join('; ')}`;
		reportRefusal({ action: id, version: semver, permission: 'manifest', message });
		throw new UserError(message);
	}
}

/**
 * The executor of a frozen action or provider version with its bundle in this process. The
 * egress comes from the manifest, as in the sandbox. The credential hosts come from the
 * credential manifests. `loadTriggerExecutor` loads a trigger version.
 */
export async function loadExecutor(frozen: FrozenVersion): Promise<Executor> {
	const exported = await verifiedBundleOf(frozen);
	if ('kind' in exported) throw new UnexpectedError(`${exported.id} is a trigger, not an action`);
	assertManifestPermissions(frozen.manifest, exported);
	const action: Action = { ...exported, egress: frozen.manifest.contract.egress ?? { hosts: [] } };
	const executor = executorOf(await withCredentialHostsOf(action));
	return async (host) => {
		host.recorder?.path('in_process');
		return await executor(host);
	};
}

/**
 * Makes the executor of a frozen action, provider or trigger version, e.g. in a sandbox. The
 * default is `loadExecutor`, and `loadTriggerExecutor` for a trigger.
 */
export type ExecutorLoader = (frozen: FrozenVersion) => Promise<Executor>;

// One slot: the host sets it once at start, as the version loader.
const executorLoader = new Map<'loader', ExecutorLoader>();

/** Sets the executor loader, e.g. the sandbox. The host calls it once at start. */
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

/** Sets the loader that picks the version a node runs. The host calls it once at start. */
export const setContractVersionLoader = (loader: ContractVersionLoader) => {
	versionLoader.set('loader', loader);
};

/**
 * The executor of a frozen version from the executor loader that the host set, else from
 * `load`. A bundle loads once: the executor stays by bundle hash.
 */
export async function cachedExecutorOf(frozen: FrozenVersion, load: ExecutorLoader) {
	const { bundleHash } = frozen.manifest;
	// A failed read, for example a registry outage, must not stay in the cache.
	const cached = executors.has(bundleHash);
	const executor =
		executors.get(bundleHash) ??
		(executorLoader.get('loader') ?? load)(frozen).catch((error: unknown) => {
			executors.delete(bundleHash);
			throw error;
		});
	executors.set(bundleHash, executor);
	return { executor: await executor, cached };
}

/** The executor of the version a node runs, and its manifest. */
async function versionExecutorOf(context: NodeContext, head: FrozenVersion) {
	const loader = versionLoader.get('loader');
	const frozen = loader ? await loader(context, head) : head;
	const { id, semver, contract } = frozen.manifest;
	if (contract.version !== head.manifest.contract.version || id !== head.manifest.id) {
		throw new UnexpectedError(
			`${id}@${semver} cannot run as ${head.manifest.id}@${head.manifest.semver}`,
		);
	}
	assertNodeContract(frozen.manifest);
	const { executor, cached } = await cachedExecutorOf(frozen, loadExecutor);
	return { executor, manifest: frozen.manifest, cached };
}

/** The stored fields follow the form of `head`, which the editor shows and stores. */
const headFieldOf = ({ manifest }: FrozenVersion) =>
	storedFieldOf(manifest.contract.input, manifest.ui);

async function executeVersion(context: IExecuteFunctions, head: FrozenVersion) {
	const slot = runProfileListener();
	if (!slot) {
		const { executor, manifest } = await versionExecutorOf(context, head);
		const outputs = await executor(hostOf(context, headFieldOf(head)));
		recordVersion(context, manifest);
		return outputs;
	}
	const { listener, payloads } = slot;
	const host = hostOf(context, headFieldOf(head));
	const { recorder, profile } = runRecorder(host.items.length, payloads);
	const loadStart = recorder.now();
	const { executor, manifest, cached } = await versionExecutorOf(context, head);
	recorder.phase({ name: 'load', startMs: loadStart, endMs: recorder.now(), cached });
	const { id, semver, bundleHash, nodeContract } = manifest;
	const identity = { action: id, version: semver, bundleHash, nodeContract };
	// A listener failure is logged: tracing must not fail the run.
	const emit = (result: RunProfile) => {
		try {
			listener({ executionId: context.getExecutionId(), nodeName: context.getNode().name }, result);
		} catch (error) {
			context.logger.warn(`The run profile of ${id} was not recorded: ${errorMessage(error)}`);
		}
	};
	try {
		const outputs = await executor({ ...host, recorder });
		recordVersion(context, manifest);
		const outputItems = outputs.reduce((sum, output) => sum + output.length, 0);
		emit(profile(identity, { outputItems }));
		return outputs;
	} catch (error) {
		// The executor wraps a plain error in a NodeOperationError; its cause names what failed.
		const failed =
			error instanceof NodeOperationError && error.cause instanceof Error ? error.cause : error;
		emit(profile(identity, { errorType: failed instanceof Error ? failed.name : typeof failed }));
		throw error;
	}
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
	kind: ProviderKind,
	itemIndex: number,
) {
	const { executor, manifest } = await versionExecutorOf(context, head);
	const outputs = await executor(supplyHostOf(context, itemIndex, headFieldOf(head)));
	return supplyDataOf(manifest.id, kind, outputs, context);
}

/**
 * An n8n node type with one version per major. `typeOf` makes the node type of one version; its
 * description comes from the contract, see `nodeDescriptionOf`.
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
	const { displayName, name, group, description } = nodeVersions[majorOf(latest)].description;
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
		const { contract, ui } = frozen.manifest;
		const description = nodeDescriptionOf(frozen.manifest);
		const kind = providedKindOf(contract.output);
		const methods = listSearchMethodsOf(
			contract,
			ui,
			async () => await manifestLookupOwnerOf(frozen.manifest),
		);
		if (kind) {
			return {
				description,
				...(methods ? { methods } : {}),
				async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
					return await supplyVersion(this, frozen, kind, itemIndex);
				},
			};
		}
		return {
			// The host generates the tool node types from this flag, as for a legacy node.
			description: isToolContract(contract) ? { ...description, usableAsTool: true } : description,
			...(methods ? { methods } : {}),
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
 * credential, egress, limits and data tables as a step. The bundle loads on the first call.
 */
function toolOf(context: NodeContext, frozen: FrozenVersion, itemIndex: number) {
	const node = context.getNode();
	const { contract } = frozen.manifest;
	const descriptions = new Map(
		Object.entries(contract.input.properties ?? {}).flatMap(([name, schema]) => {
			const raw = context.getNodeParameter(name, itemIndex, undefined, { rawExpressions: true });
			const field = modelFieldOf(node, name, locatorValueOf(raw));
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
				dataTables: dataTablesOf(dataTableHostOf(context)),
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
		versions,
		(frozen): INodeType => ({
			description: describe(
				nodeDescriptionOf({
					...frozen.manifest,
					ui: toolUiOf(frozen.manifest.contract.input, frozen.manifest.ui),
				}),
			),
			async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
				const tool = toolOf(this, frozen, itemIndex);
				return { response: recordedSupply(tool, 'tool', this, toolTriesOf(this.getNode())) };
			},
			// An agent that has the engine run its tool calls runs this node: each item is one call.
			// The engine retries the node as its settings say, so `execute()` tries each call once.
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
