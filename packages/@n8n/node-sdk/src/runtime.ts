import { errorChain } from '@n8n/utils/errors/error-chain';
import { sleep } from '@n8n/utils/sleep';
import { compileFunction } from 'node:vm';
import {
	NodeOperationError,
	safeRegex,
	UnexpectedError,
	VersionedNodeType,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestOptions,
	type INode,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	isHttpError,
	type Action,
	type Http,
	type HttpMethod,
	type HttpRequest,
	type RunInput,
} from './define';
import type { AnySchema, JsonSchema, Shape } from './schema';
import { applyDefaults, validate } from './validate';
import { NODE_CONTRACT_ABI, sha256, type VersionManifest } from './version';

const isRecord = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
	typeof value === 'object' && value !== null && Symbol.asyncIterator in value;

/** `notion.databasePage.getAll` → `notionDatabasePageGetAll`. */
export const nodeNameOf = (actionId: string) =>
	actionId
		.split('.')
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('');

/**
 * n8n fills every property default into the parameters it runs with. An optional field
 * without a default gets '', which the runtime drops, so an unset field stays unset.
 */
function toProperty(name: string, schema: AnySchema): INodeProperties {
	const { json } = schema;
	const unset = schema.isOptional && json.default === undefined;
	const base = {
		displayName: name,
		name,
		required: !schema.isOptional,
		...(json['x-n8n-hint'] ? { description: json['x-n8n-hint'] } : {}),
	};
	if (json.enum) {
		const options = json.enum.flatMap((value) =>
			typeof value === 'string' || typeof value === 'number'
				? [{ name: String(value), value }]
				: [],
		);
		return { ...base, type: 'options', options, default: unset ? '' : (options[0]?.value ?? '') };
	}
	switch (json.type) {
		case 'string':
			return {
				...base,
				type: 'string',
				default: typeof json.default === 'string' ? json.default : '',
			};
		case 'number':
		case 'integer':
			return {
				...base,
				type: 'number',
				default: typeof json.default === 'number' ? json.default : unset ? '' : 0,
			};
		case 'boolean':
			return { ...base, type: 'boolean', default: json.default === true };
		default:
			// Complex fields keep their JSON value; n8n resolves expressions inside it per item.
			return {
				...base,
				type: 'json',
				default: json.default !== undefined ? JSON.stringify(json.default) : unset ? '' : '{}',
			};
	}
}

/** The default of the legacy HTTP Request node. */
const DEFAULT_TIMEOUT_MS = 300_000;

// n8n sends `id[0]=a` for an array by default. Only a request with an array sets this.
const REPEAT_KEYS: Pick<IHttpRequestOptions, 'arrayFormat'> = { arrayFormat: 'repeat' };

function toRequestOptions(request: HttpRequest, baseUrl: string | undefined): IHttpRequestOptions {
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
function withResponse(error: unknown): unknown {
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

const hasSelector = (action: Action) =>
	action.credentialTypes.length > 1 || action.node.authOptional === true;

/** Safety limits for one `run()` call. The defaults are far above normal use. */
export interface ExecutorLimits {
	/** A page is one request. */
	readonly maxRequests: number;
	readonly maxItems: number;
}

const DEFAULT_LIMITS: ExecutorLimits = { maxRequests: 10_000, maxItems: 1_000_000 };

/** The n8n services the executor uses. Fixture replay and `runAction` provide them without n8n. */
export interface ExecutorHost {
	readonly itemCount: number;
	readonly node: INode;
	/** The raw parameter value, as `getNodeParameter` returns it. */
	parameter(name: string, itemIndex: number): unknown;
	request(options: IHttpRequestOptions, credentialType: string | undefined): Promise<unknown>;
	continueOnFail(): boolean;
	/** Waits before a retry. */
	wait?(ms: number): Promise<void>;
	readonly limits?: Partial<ExecutorLimits>;
}

const hostOf = (context: IExecuteFunctions): ExecutorHost => ({
	itemCount: context.getInputData().length,
	node: context.getNode(),
	parameter: (name, itemIndex) => context.getNodeParameter(name, itemIndex, undefined),
	request: async (options, credentialType) => {
		const response: unknown = credentialType
			? await context.helpers.httpRequestWithAuthentication.call(context, credentialType, options)
			: await context.helpers.httpRequest(options);
		return response;
	},
	continueOnFail: () => context.continueOnFail(),
	wait: async (ms) => await sleep(ms, context.getExecutionCancelSignal()),
});

/** n8n keeps a `json` property as text. Other fields keep the text the user typed. */
function readParameter(
	host: ExecutorHost,
	name: string,
	itemIndex: number,
	isJson: boolean,
): unknown {
	const value = host.parameter(name, itemIndex);
	if (!isJson || typeof value !== 'string' || !/^\s*[[{]/.test(value)) return value;
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed;
	} catch {
		return value;
	}
}

/**
 * The ABI 2 executor. Parameters are resolved per item, defaults filled in, and validated
 * against `input`. Transient failures of idempotent requests retry. Each output item is
 * validated against `output` and paired with its input item. Continue-on-fail gives an error
 * item, which n8n routes to the error output when the node has one.
 */
export function executorOf<S extends Shape, O extends AnySchema>(
	action: Action<S, O>,
): (host: ExecutorHost) => Promise<INodeExecutionData[]> {
	const inputKeys = Object.keys(action.input);
	const jsonKeys = new Set(
		Object.entries(action.input)
			.filter(([name, schema]) => toProperty(name, schema).type === 'json')
			.map(([name]) => name),
	);
	const outputSchema: JsonSchema = action.output.json;
	const isInput = (value: unknown): value is RunInput<S> =>
		validate(value, action.inputSchema).length === 0;
	const { credentialTypes } = action;

	return async (host) => {
		const limits = { ...DEFAULT_LIMITS, ...host.limits };
		const wait = host.wait ?? (async (ms: number) => await sleep(ms));
		const credentials = host.node.credentials ?? {};
		const selected = hasSelector(action) ? host.parameter(AUTHENTICATION, 0) : undefined;
		const credentialType =
			credentialTypes.find((type) => type === selected) ??
			(selected === 'none'
				? undefined
				: credentialTypes.find((type) => credentials[type] !== undefined));
		const send = async (
			options: IHttpRequestOptions,
			retryable: boolean,
			retry: number,
		): Promise<unknown> => {
			try {
				return await host.request(options, credentialType);
			} catch (caught) {
				const error = withResponse(caught);
				const delay = retryable ? retryDelay(error, retry) : undefined;
				if (delay === undefined) throw error;
				await wait(delay);
				return await send(options, retryable, retry + 1);
			}
		};

		const httpFor = (itemIndex: number): Http => {
			const sent = { requests: 0 };
			return {
				request: async (request) => {
					if (sent.requests >= limits.maxRequests) {
						throw new NodeOperationError(
							host.node,
							`${action.id} sent ${limits.maxRequests} requests for one input item, the most one run may send`,
							{ itemIndex },
						);
					}
					sent.requests += 1;
					const retryable =
						request.retry ??
						(IDEMPOTENT_METHODS.has(request.method ?? 'GET') || action.flow.idempotent === true);
					return await send(toRequestOptions(request, action.node.baseUrl), retryable, 0);
				},
			};
		};

		const runItem = async (itemIndex: number): Promise<INodeExecutionData[]> => {
			const parameters = Object.fromEntries(
				inputKeys
					.map((key) => [key, readParameter(host, key, itemIndex, jsonKeys.has(key))] as const)
					.filter(([, value]) => value !== undefined && value !== ''),
			);
			const input = applyDefaults(parameters, action.inputSchema);
			if (!isInput(input)) {
				const issues = validate(input, action.inputSchema);
				throw new NodeOperationError(host.node, issues.join('; '), { itemIndex });
			}
			const toItem = (item: unknown, index: number): INodeExecutionData => {
				if (index >= limits.maxItems) {
					throw new NodeOperationError(
						host.node,
						`${action.id} yielded ${limits.maxItems} items for one input item, the most one run may yield`,
						{ itemIndex },
					);
				}
				const issues = validate(item, outputSchema, { path: `output[${index}]` });
				if (issues.length > 0 || !isRecord(item)) {
					throw new NodeOperationError(
						host.node,
						`Output does not match the contract: ${issues.join('; ') || 'not an object'}`,
						{ itemIndex },
					);
				}
				return { json: item, pairedItem: { item: itemIndex } };
			};
			const result = action.run({ input, http: httpFor(itemIndex) });
			if (action.flow.cardinality === 'per-item') return [toItem(await result, 0)];
			if (!isAsyncIterable(result)) {
				throw new NodeOperationError(host.node, `${action.id} is 1:N, so run() must yield`, {
					itemIndex,
				});
			}
			const items: INodeExecutionData[] = [];
			// Validate each item when it is yielded, so a bad item fails before the next page downloads.
			for await (const item of result) items.push(toItem(item, items.length));
			return items;
		};

		return await Array.from({ length: host.itemCount }).reduce<Promise<INodeExecutionData[]>>(
			async (previous, _item, itemIndex) => {
				const done = await previous;
				try {
					return [...done, ...(await runItem(itemIndex))];
				} catch (error) {
					if (!host.continueOnFail()) throw error;
					return [
						...done,
						{ json: { error: errorMessage(error) }, pairedItem: { item: itemIndex } },
					];
				}
			},
			Promise.resolve([]),
		);
	};
}

/** An n8n node type for one action; the platform part is `executorOf`. */
export function toNodeType<S extends Shape, O extends AnySchema>(
	action: Action<S, O>,
): new () => INodeType {
	// A selector lets setup see one credential slot; each credential shows for its own value.
	const { credentialTypes } = action;
	const optional = action.node.authOptional === true;
	const selector: INodeProperties[] = hasSelector(action)
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

	const description: INodeTypeDescription = {
		displayName: `${action.node.displayName}: ${action.action}`,
		name: nodeNameOf(action.id),
		group: [action.flow.effect === 'write' ? 'output' : 'input'],
		version: action.version,
		description: action.summary,
		defaults: { name: action.action },
		inputs: ['main'],
		outputs: ['main'],
		credentials: credentialTypes.map((name) => ({
			name,
			required: !optional,
			...(selector.length > 0 ? { displayOptions: { show: { [AUTHENTICATION]: [name] } } } : {}),
		})),
		properties: [
			...selector,
			...Object.entries(action.input).map(([name, schema]) => toProperty(name, schema)),
		],
	};

	const run = executorOf(action);
	return class implements INodeType {
		description = description;

		async execute(this: IExecuteFunctions) {
			return [await run(hostOf(this))];
		}
	};
}

/** A frozen action version: its manifest and a reader for its bundle. */
export interface FrozenVersion {
	readonly manifest: VersionManifest;
	readBundle(): Promise<string>;
}

/** Host modules a frozen bundle may import. They are part of ABI 1. */
const HOST_MODULES: Readonly<Record<string, unknown>> = { 'n8n-workflow': { safeRegex } };

const isAction = (value: unknown): value is Action =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	typeof value.version === 'number' &&
	typeof value.run === 'function';

/** Runs a CommonJS bundle from `freezeAction` and returns the action it exports. */
export function evaluateBundle(code: string): Action {
	const module: { exports: unknown } = { exports: {} };
	const hostRequire = (id: string) => {
		if (!(id in HOST_MODULES)) throw new UnexpectedError(`A frozen action cannot import ${id}`);
		return HOST_MODULES[id];
	};
	Reflect.apply(compileFunction(code, ['module', 'require']), undefined, [module, hostRequire]);
	const action = isRecord(module.exports) ? module.exports.default : undefined;
	if (!isAction(action)) throw new UnexpectedError('The bundle does not export an action');
	return action;
}

/** Executors by bundle hash. A bundle loads on its first execution only. */
const executors = new Map<string, Promise<(host: ExecutorHost) => Promise<INodeExecutionData[]>>>();

async function loadExecutor({ manifest, readBundle }: FrozenVersion) {
	const { id, semver, abi, bundleHash } = manifest;
	if (abi !== NODE_CONTRACT_ABI) {
		throw new UnexpectedError(
			`${id}@${semver} needs ABI ${abi}; this host runs ABI ${NODE_CONTRACT_ABI}`,
		);
	}
	const code = await readBundle();
	if (sha256(code) !== bundleHash) {
		throw new UnexpectedError(`The bundle of ${id}@${semver} does not match ${bundleHash}`);
	}
	return executorOf(evaluateBundle(code));
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
	const { id, semver, abi, bundleHash, contract } = frozen.manifest;
	if (contract.version !== head.manifest.contract.version || id !== head.manifest.id) {
		throw new UnexpectedError(
			`${id}@${semver} cannot run as ${head.manifest.id}@${head.manifest.semver}`,
		);
	}
	const executor = executors.get(bundleHash) ?? loadExecutor(frozen);
	executors.set(bundleHash, executor);
	const items = await (await executor)(hostOf(context));
	context.setMetadata({ nodeContract: { action: id, version: semver, bundleHash, abi } });
	return [items];
}

/**
 * An n8n node type with one version per major. The description comes from the manifest; the
 * bundle loads on the first execution of its version.
 */
export function toVersionedNodeType(
	versions: readonly FrozenVersion[],
): new () => VersionedNodeType {
	const unsupported = versions.find(({ manifest }) => manifest.abi !== NODE_CONTRACT_ABI);
	if (unsupported) {
		const { id, semver, abi } = unsupported.manifest;
		throw new UnexpectedError(
			`${id}@${semver} needs ABI ${abi}; this host runs ABI ${NODE_CONTRACT_ABI}`,
		);
	}
	const majorOf = ({ manifest }: FrozenVersion) => manifest.contract.version;
	const latest = versions.reduce<FrozenVersion | undefined>(
		(best, frozen) => (best && majorOf(best) > majorOf(frozen) ? best : frozen),
		undefined,
	);
	if (!latest) throw new UnexpectedError('A versioned node type needs at least one version');
	const nodeVersions = Object.fromEntries(
		versions.map((frozen): [number, INodeType] => [
			majorOf(frozen),
			{
				description: frozen.manifest.description,
				async execute(this: IExecuteFunctions) {
					return await executeVersion(this, frozen);
				},
			},
		]),
	);
	const { displayName, name, group, description } = latest.manifest.description;
	const base = { displayName, name, group, description, defaultVersion: majorOf(latest) };
	return class extends VersionedNodeType {
		constructor() {
			super(nodeVersions, base);
		}
	};
}
