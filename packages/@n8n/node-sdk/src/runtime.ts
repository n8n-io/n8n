import { compileFunction } from 'node:vm';
import {
	NodeOperationError,
	safeRegex,
	UnexpectedError,
	VersionedNodeType,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { Action, Http, HttpRequest } from './define';
import type { AnySchema, JsonSchema, ObjectOf, Shape } from './schema';
import { validate } from './validate';
import { NODE_CONTRACT_ABI, sha256, type VersionManifest } from './version';

const isRecord = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

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

function readParameter(context: IExecuteFunctions, name: string, itemIndex: number): unknown {
	const value: unknown = context.getNodeParameter(name, itemIndex, undefined);
	if (typeof value !== 'string' || !/^\s*[[{]/.test(value)) return value;
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed;
	} catch {
		return value;
	}
}

function toRequestOptions(request: HttpRequest, baseUrl: string | undefined): IHttpRequestOptions {
	const query = Object.fromEntries(
		Object.entries(request.query ?? {}).filter(([, value]) => value !== undefined),
	);
	return {
		method: request.method ?? 'GET',
		url: request.url ?? `${baseUrl ?? ''}${request.path ?? ''}`,
		qs: query,
		headers: { ...request.headers },
		json: true,
		...(request.body !== undefined ? { body: request.body } : {}),
		...(request.fullResponse ? { returnFullResponse: true } : {}),
	};
}

const AUTHENTICATION = 'authentication';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const hasSelector = (action: Action) =>
	action.credentialTypes.length > 1 || action.node.authOptional === true;

type Execute = (this: IExecuteFunctions) => Promise<INodeExecutionData[][]>;

/**
 * The ABI 1 executor. Parameters are resolved per item and validated against `input`, output
 * items are validated against `output` and paired with their input item, and continue-on-fail
 * routes failed items to the error output.
 */
function executorOf<S extends Shape, O extends AnySchema>(action: Action<S, O>): Execute {
	const inputKeys = Object.keys(action.input);
	const outputSchema: JsonSchema = action.output.json;
	const isInput = (value: unknown): value is ObjectOf<S> =>
		validate(value, action.inputSchema).length === 0;
	const { credentialTypes } = action;

	return async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = this.getNode().credentials ?? {};
		const selected: unknown = hasSelector(action)
			? this.getNodeParameter(AUTHENTICATION, 0, undefined)
			: undefined;
		const credentialType =
			credentialTypes.find((type) => type === selected) ??
			(selected === 'none'
				? undefined
				: credentialTypes.find((type) => credentials[type] !== undefined));
		const http: Http = {
			request: async (request) => {
				const options = toRequestOptions(request, action.node.baseUrl);
				const response: unknown = credentialType
					? await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options)
					: await this.helpers.httpRequest(options);
				return response;
			},
		};

		const runItem = async (itemIndex: number): Promise<INodeExecutionData[]> => {
			const input = Object.fromEntries(
				inputKeys
					.map((key) => [key, readParameter(this, key, itemIndex)] as const)
					.filter(([, value]) => value !== undefined && value !== ''),
			);
			if (!isInput(input)) {
				const issues = validate(input, action.inputSchema);
				throw new NodeOperationError(this.getNode(), issues.join('; '), { itemIndex });
			}
			const emitted: unknown[] = [];
			await action.run({ input, http, emit: (item) => emitted.push(item) });
			return emitted.map((item) => {
				const issues = validate(item, outputSchema, { path: 'output' });
				if (issues.length > 0 || !isRecord(item)) {
					throw new NodeOperationError(
						this.getNode(),
						`Output does not match the contract: ${issues.join('; ') || 'not an object'}`,
						{ itemIndex },
					);
				}
				return { json: item, pairedItem: { item: itemIndex } };
			});
		};

		const results = await this.getInputData().reduce<Promise<INodeExecutionData[]>>(
			async (previous, _item, itemIndex) => {
				const done = await previous;
				try {
					return [...done, ...(await runItem(itemIndex))];
				} catch (error) {
					if (!this.continueOnFail()) throw error;
					return [
						...done,
						{ json: { error: errorMessage(error) }, pairedItem: { item: itemIndex } },
					];
				}
			},
			Promise.resolve([]),
		);
		return [results];
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

	const execute = executorOf(action);
	return class implements INodeType {
		description = description;

		execute = execute;
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
const executors = new Map<string, Promise<Execute>>();

async function loadExecutor({ manifest, readBundle }: FrozenVersion): Promise<Execute> {
	const code = await readBundle();
	if (sha256(code) !== manifest.bundleHash) {
		throw new UnexpectedError(
			`The bundle of ${manifest.id}@${manifest.version} does not match ${manifest.bundleHash}`,
		);
	}
	return executorOf(evaluateBundle(code));
}

/**
 * An n8n node type with one version per frozen action version. The description comes from
 * the manifest; the bundle loads on the first execution of its version.
 */
export function toVersionedNodeType(
	versions: readonly FrozenVersion[],
): new () => VersionedNodeType {
	const unsupported = versions.find(({ manifest }) => manifest.abi !== NODE_CONTRACT_ABI);
	if (unsupported) {
		const { id, version, abi } = unsupported.manifest;
		throw new UnexpectedError(
			`${id}@${version} needs ABI ${abi}; this host runs ABI ${NODE_CONTRACT_ABI}`,
		);
	}
	const latest = versions.reduce<FrozenVersion | undefined>(
		(best, frozen) => (best && best.manifest.version > frozen.manifest.version ? best : frozen),
		undefined,
	);
	if (!latest) throw new UnexpectedError('A versioned node type needs at least one version');
	const nodeVersions = Object.fromEntries(
		versions.map((frozen): [number, INodeType] => [
			frozen.manifest.version,
			{
				description: frozen.manifest.description,
				async execute(this: IExecuteFunctions) {
					const { bundleHash } = frozen.manifest;
					const executor = executors.get(bundleHash) ?? loadExecutor(frozen);
					executors.set(bundleHash, executor);
					return await (await executor).call(this);
				},
			},
		]),
	);
	const { displayName, name, group, description } = latest.manifest.description;
	const base = { displayName, name, group, description, defaultVersion: latest.manifest.version };
	return class extends VersionedNodeType {
		constructor() {
			super(nodeVersions, base);
		}
	};
}
