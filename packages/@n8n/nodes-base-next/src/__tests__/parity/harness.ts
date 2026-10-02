/**
 * Parity harness: runs a legacy node and a contract action in a one-node workflow through the
 * real n8n execution engine, against the same mocked HTTP, and compares what they send and emit.
 *
 * Normalisation, applied to both runs the same way:
 * - Requests: method; URL as origin plus the decoded path; query as decoded parameters (a
 *   repeated name becomes an array); body as nock decodes it (JSON object or text), and a form
 *   body as its decoded fields; the headers
 *   in `ParityCase.headers` (default: authorization and content-type; content-type only on a
 *   request with a body). Requests are keyed by
 *   method and URL plus their order among requests to that key, so one extra request is one
 *   difference.
 * - Items: `json`, `binary` without the `id` of each file, and `pairedItem`; a numeric
 *   `pairedItem` becomes `{ item }`. In the default storage mode, `data` holds the bytes.
 *   The items of the first output are `items`; the items of each other output are in
 *   `otherOutputs`.
 * - Everywhere, a key with an undefined value equals a missing key.
 * - The run error message, when a run fails.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import type * as Core from '../../../../../core/dist/index.js';
import type Nock from '../../../../../core/node_modules/nock';
import { toNodeType, type Action } from '@n8n/node-sdk';
import type * as N8nWorkflow from 'n8n-workflow';
import type {
	IBinaryData,
	IBinaryKeyData,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IDataObject,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeProperties,
	INodeType,
	INodeTypes,
	IVersionedNodeType,
	NodeConnectionType,
	IWorkflowExecuteAdditionalData,
	DataTableProxyProvider,
	NodeParameterValue,
	Workflow,
} from 'n8n-workflow';

import { nodeTypeOf } from '../../index';

// Core sits outside this package's dependencies; load it, its n8n-workflow, and its nock from
// core's location so the engine, the nodes, and the HTTP mock share one copy of each.
const CORE_DIST = path.resolve(__dirname, '../../../../../core/dist/index.js');
const requireFromCore = createRequire(CORE_DIST);

// Core reads its settings from the user folder on load; keep the tests out of ~/.n8n.
const userFolder = process.env.N8N_USER_FOLDER
	? undefined
	: mkdtempSync(path.join(tmpdir(), 'n8n-parity-'));
if (userFolder) {
	process.env.N8N_USER_FOLDER = userFolder;
	afterAll(() => rmSync(userFolder, { recursive: true, force: true }));
}

const core: typeof Core = requireFromCore(CORE_DIST);
const workflowLib: typeof N8nWorkflow = requireFromCore('n8n-workflow');
const nock: typeof Nock = requireFromCore('nock');

/** Loads a built CommonJS module of a workspace package that this package does not depend on. */
export const requireBuilt = (relativeToPackages: string): unknown =>
	requireFromCore(path.resolve(__dirname, '../../../../..', relativeToPackages));

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export interface Route {
	readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	/** Without the query; matched against the decoded request path. */
	readonly url: string;
	/** Every listed parameter must match; others may be present. */
	readonly query?: Readonly<Record<string, string>>;
	/** The route answers this many calls, then the next matching route answers. Default: any. */
	readonly times?: number;
	readonly status?: number;
	readonly json?: unknown;
	/** A non-JSON reply, e.g. a file. */
	readonly raw?: { readonly body: Buffer; readonly headers: Readonly<Record<string, string>> };
}

export interface SentRequest {
	readonly method: string;
	readonly url: string;
	readonly query: Record<string, string | string[]>;
	readonly body: unknown;
	readonly headers: Record<string, string>;
}

export interface NormalItem {
	readonly json: unknown;
	readonly binary?: Record<string, Omit<IBinaryData, 'id'>>;
	readonly pairedItem: unknown;
}

export interface ParityRun {
	readonly requests: Record<string, SentRequest>;
	/** Requests no route answered, as `METHOD url`. */
	readonly unmatched: string[];
	readonly items: NormalItem[];
	/** The items of the second and later outputs, for a node with more than one output. */
	readonly otherOutputs: NormalItem[][];
	/** The items of the first output as the node gave them. */
	readonly output: INodeExecutionData[];
	readonly error?: string;
	/** When the node put the execution to wait: the time it resumes, in ms. Not compared. */
	readonly waitTill?: number;
}

export interface NodeUnderTest {
	readonly nodeType: INodeType | IVersionedNodeType;
	/** The workflow node type, e.g. `n8n-nodes-base.notion`. */
	readonly type: string;
	readonly typeVersion: number;
	readonly parameters: INodeParameters;
	readonly credential?: string;
	/** Sub-nodes on the `ai_*` inputs of the node, e.g. a chat model. */
	readonly subnodes?: readonly SubnodeUnderTest[];
}

/** A sub-node and the connection type it supplies through, e.g. `ai_languageModel`. */
export interface SubnodeUnderTest extends Omit<NodeUnderTest, 'subnodes'> {
	readonly name: string;
	readonly connection: NodeConnectionType;
}

const parameterOf = (value: unknown): NodeParameterValue =>
	typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
		? value
		: JSON.stringify(value);

/**
 * A contract action as a workflow node. Complex fields hold JSON text, as the editor stores a
 * `json` parameter.
 */
export const actionNode = (
	action: Action,
	parameters: Readonly<Record<string, unknown>>,
	credential?: string,
): NodeUnderTest => {
	const NodeType = toNodeType(action);
	return {
		nodeType: new NodeType(),
		type: nodeTypeOf(action),
		typeVersion: action.version,
		parameters: Object.fromEntries(
			Object.entries(parameters).map(([name, value]) => [name, parameterOf(value)]),
		),
		...(credential ? { credential } : {}),
	};
};

export interface ParityCase {
	readonly credential?: {
		readonly data: ICredentialDataDecryptedObject;
		/** The credential type and every type it extends, so OAuth2 parents resolve. */
		readonly types: readonly ICredentialType[];
	};
	/** The input items of the node. */
	readonly input: readonly IDataObject[];
	/** The binaries of every input item. */
	readonly binary?: IBinaryKeyData;
	readonly routes: readonly Route[];
	/** Lower-case request header names to compare. */
	readonly headers?: readonly string[];
	/** The workflow time zone. The n8n default when omitted. */
	readonly timezone?: string;
	/** The items of each main input, for a node with more than one input. They replace `input`. */
	readonly inputs?: ReadonlyArray<readonly IDataObject[]>;
	/** The data tables of the execution. */
	readonly dataTables?: DataTableProxyProvider;
	/** The task runner: the answer to each task the node starts. */
	readonly runner?: IWorkflowExecuteAdditionalData['startRunnerTask'];
}

/** Resolves `={{$credentials.x}}` in generic credentials, as the CLI credentials helper does. */
class ParityCredentialsHelper extends workflowLib.ICredentialsHelper {
	constructor(
		private readonly types: readonly ICredentialType[],
		private readonly data: ICredentialDataDecryptedObject,
	) {
		super();
	}

	private typeOf(name: string) {
		return this.types.find((type) => type.name === name);
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions,
		workflow?: Workflow,
		node?: INode,
	): Promise<IHttpRequestOptions> {
		const authenticate = this.typeOf(typeName)?.authenticate;
		if (typeof authenticate === 'function') return await authenticate(credentials, requestOptions);
		if (authenticate?.type !== 'generic' || !workflow || !node) return requestOptions;
		const resolveText = (value: string) => {
			const resolved = workflow.expression.getSimpleParameterValue(
				node,
				value,
				'internal',
				{ $credentials: credentials },
				undefined,
				'',
			);
			return typeof resolved === 'string' ? resolved : JSON.stringify(resolved ?? '');
		};
		const resolveAll = (values: IDataObject | undefined) =>
			Object.fromEntries(
				Object.entries(values ?? {}).map(([key, value]) => [
					resolveText(key),
					typeof value === 'string' ? resolveText(value) : value,
				]),
			);
		// As `CredentialsHelper.authenticate`: each value goes into the request part of the same name.
		const { headers, qs, auth } = authenticate.properties;
		return {
			...requestOptions,
			headers: { ...requestOptions.headers, ...resolveAll(headers) },
			...(qs ? { qs: { ...requestOptions.qs, ...resolveAll(qs) } } : {}),
			...(auth
				? {
						auth: {
							...requestOptions.auth,
							username: resolveText(auth.username),
							password: resolveText(auth.password),
						},
					}
				: {}),
		};
	}

	getParentTypes(name: string): string[] {
		const parents = this.typeOf(name)?.extends ?? [];
		return [...parents, ...parents.flatMap((parent) => this.getParentTypes(parent))];
	}

	isCredentialUsableByNode() {
		return true;
	}

	async preAuthentication() {
		return undefined;
	}

	async runPreAuthentication() {
		return undefined;
	}

	async getCredentials() {
		return new core.Credentials({ id: null, name: '' }, '', '');
	}

	async getDecrypted() {
		return this.data;
	}

	async updateCredentials() {}

	async updateCredentialsOauthTokenData() {}

	getCredentialsProperties(type: string) {
		return this.typeOf(type)?.properties ?? [];
	}
}

function credentialWorkflow() {
	const node: INode = {
		id: 'sign',
		name: 'Sign',
		type: 'sign',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	const workflow = new workflowLib.Workflow({
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes: {
			getByName: () => undefined,
			getByNameAndVersion: () => undefined,
			getKnownTypes: () => ({}),
		} as unknown as INodeTypes,
	});
	return { node, workflow };
}

/**
 * The data a node reads from a credential, as `CredentialsHelper.applyDefaultsAndOverwrites`
 * builds it: each property default filled in, then each expression resolved with `$self`.
 */
export function readCredential(
	properties: INodeProperties[],
	data: ICredentialDataDecryptedObject,
): unknown {
	const { node, workflow } = credentialWorkflow();
	const filled = workflowLib.NodeHelpers.getNodeParameters(
		properties,
		data as INodeParameters,
		true,
		false,
		null,
		null,
	);
	return workflow.expression.getComplexParameterValue(
		node,
		filled ?? {},
		'internal',
		{},
		undefined,
		undefined,
		filled ?? {},
	);
}

/**
 * Signs one request with a credential type as n8n core does: a function runs, a generic block
 * resolves through the expression engine.
 */
export async function signRequest(
	type: ICredentialType,
	data: ICredentialDataDecryptedObject,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const { node, workflow } = credentialWorkflow();
	const copy = { ...request, ...(request.headers ? { headers: { ...request.headers } } : {}) };
	return await new ParityCredentialsHelper([type], data).authenticate(
		data,
		type.name,
		copy,
		workflow,
		node,
	);
}

const unavailable = async () => await Promise.reject(new Error('Not available in parity tests'));

function additionalDataOf(
	credentialsHelper: ParityCredentialsHelper,
	node: INode,
	parityCase?: ParityCase,
): IWorkflowExecuteAdditionalData {
	const now = new Date();
	return {
		credentialsHelper,
		hooks: new core.ExecutionLifecycleHooks('manual', '1', {
			id: 'parity',
			name: 'parity',
			active: false,
			isArchived: false,
			createdAt: now,
			updatedAt: now,
			nodes: [node],
			connections: {},
			activeVersionId: null,
		}),
		executeWorkflow: unavailable,
		getRunExecutionData: async () => undefined,
		getRuntimeCredential: async () => undefined,
		startRunnerTask: parityCase?.runner ?? unavailable,
		...(parityCase?.dataTables
			? { 'data-table': { dataTableProxyProvider: parityCase.dataTables } }
			: {}),
		logAiEvent: () => {},
		currentNodeExecutionIndex: 0,
		executionId: '1',
		restApiUrl: 'http://localhost/rest',
		instanceBaseUrl: 'http://localhost',
		formBaseUrl: 'http://localhost/form',
		formWaitingBaseUrl: 'http://localhost/form-waiting',
		formTestBaseUrl: 'http://localhost/form-test',
		webhookBaseUrl: 'http://localhost/webhook',
		webhookWaitingBaseUrl: 'http://localhost/webhook-waiting',
		webhookTestBaseUrl: 'http://localhost/webhook-test',
		mcpBaseUrl: 'http://localhost/mcp',
		mcpTestBaseUrl: 'http://localhost/mcp-test',
		variables: {},
		externalSecretsProxy: new core.ExternalSecretsProxy(),
	};
}

const queryOf = (params: URLSearchParams): Record<string, string | string[]> =>
	[...new Set(params.keys())].reduce<Record<string, string | string[]>>((query, key) => {
		const values = params.getAll(key);
		return { ...query, [key]: values.length === 1 ? (values[0] ?? '') : values };
	}, {});

/** A form body becomes its decoded fields, so `+` and `%20` for a space compare equal. */
const bodyOf = (body: unknown, contentType: unknown) => {
	if (body === '') return undefined;
	const isForm =
		typeof contentType === 'string' && contentType.includes('application/x-www-form-urlencoded');
	return isForm && typeof body === 'string' ? queryOf(new URLSearchParams(body)) : body;
};

const textOf = (value: unknown) => (typeof value === 'string' ? value : '');

const describeUnmatched = (request: unknown) => {
	if (!isRecord(request)) return 'unknown request';
	const target = textOf(request.href) || `${textOf(request.hostname)}${textOf(request.path)}`;
	return `${textOf(request.method)} ${decodeURIComponent(target)}`;
};

/** Registers `routes` with nock. Answered and unmatched requests go to the returned lists. */
function mockRoutes(routes: readonly Route[], headerNames: readonly string[]) {
	const sent: SentRequest[] = [];
	const unmatched: string[] = [];
	nock.cleanAll();
	nock.disableNetConnect();
	nock.emitter.removeAllListeners('no match');
	nock.emitter.on('no match', (request: unknown) => unmatched.push(describeUnmatched(request)));
	routes.forEach((route) => {
		const target = new URL(route.url);
		const interceptor = nock(target.origin)
			.intercept(
				(requestPath) =>
					decodeURIComponent(requestPath.split('?')[0] ?? '') ===
					decodeURIComponent(target.pathname),
				route.method,
			)
			.query((actual) =>
				Object.entries(route.query ?? {}).every(([key, value]) => actual[key] === value),
			);
		const counted = route.times === undefined ? interceptor : interceptor.times(route.times);
		const scope = counted.reply(function (uri, body) {
			const url = new URL(uri, target.origin);
			sent.push({
				method: this.req.method,
				url: `${url.origin}${decodeURIComponent(url.pathname)}`,
				query: queryOf(url.searchParams),
				body: bodyOf(body, this.req.headers['content-type']),
				headers: Object.fromEntries(
					headerNames
						.filter((name) => name !== 'content-type' || body !== '')
						.flatMap((name) => {
							const value = this.req.headers[name];
							return value === undefined ? [] : [[name, String(value)]];
						}),
				),
			});
			return route.raw
				? [route.status ?? 200, route.raw.body, route.raw.headers]
				: [route.status ?? 200, JSON.stringify(route.json), { 'content-type': 'application/json' }];
		});
		if (route.times === undefined) scope.persist();
	});
	return { sent, unmatched };
}

/** Keys requests by method and URL plus their order among requests with that key. */
const keyed = (requests: readonly SentRequest[]): Record<string, SentRequest> =>
	requests.reduce<Record<string, SentRequest>>((all, request) => {
		const base = `${request.method} ${request.url}`;
		const index = Object.keys(all).filter((key) => key.startsWith(`${base} #`)).length;
		return { ...all, [`${base} #${index}`]: request };
	}, {});

/**
 * Turns the HTTP mock off until the returned function turns it on again, for a test with real
 * local servers. The mock socket of nock resets a large streamed response.
 */
export function useRealHttp() {
	nock.restore();
	return () => nock.activate();
}

/** The binary data store of core. It runs in the default mode until a test calls `init()`. */
export const binaryDataService = () =>
	requireFromCore('@n8n/di').Container.get(core.BinaryDataService) as Core.BinaryDataService;

const withoutId = ({ id: _id, ...entry }: IBinaryData) => entry;

const normalItem = ({ json, binary, pairedItem }: INodeExecutionData): NormalItem => ({
	json,
	...(binary
		? {
				binary: Object.fromEntries(
					Object.entries(binary).map(([key, entry]) => [key, withoutId(entry)]),
				),
			}
		: {}),
	pairedItem: typeof pairedItem === 'number' ? { item: pairedItem } : pairedItem,
});

const messageOf = (error: unknown) =>
	isRecord(error) && typeof error.message === 'string' ? error.message : String(error);

/** Runs `node` once over `parityCase.input` and returns its normalised requests and items. */
export async function runNode(node: NodeUnderTest, parityCase: ParityCase): Promise<ParityRun> {
	const { sent, unmatched } = mockRoutes(
		parityCase.routes,
		parityCase.headers ?? ['authorization', 'content-type'],
	);
	const workflowNodeOf = (under: Omit<NodeUnderTest, 'subnodes'>, name: string): INode => ({
		id: name,
		name,
		type: under.type,
		typeVersion: under.typeVersion,
		position: [0, 0],
		parameters: under.parameters,
		...(under.credential
			? { credentials: { [under.credential]: { id: '1', name: 'parity' } } }
			: {}),
	});
	const workflowNode = workflowNodeOf(node, 'Node');
	const subnodes = node.subnodes ?? [];
	const typeOf = (type: string) =>
		(type === node.type ? node : subnodes.find((subnode) => subnode.type === type))?.nodeType ??
		node.nodeType;
	const nodeTypes: INodeTypes = {
		getByName: (type) => typeOf(type),
		getByNameAndVersion: (type, version) =>
			workflowLib.NodeHelpers.getVersionedNodeType(typeOf(type), version),
		getKnownTypes: () => ({}),
	};
	const workflow = new workflowLib.Workflow({
		id: 'parity',
		nodes: [workflowNode, ...subnodes.map((subnode) => workflowNodeOf(subnode, subnode.name))],
		connections: Object.fromEntries(
			subnodes.map(({ name, connection }) => [
				name,
				{ [connection]: [[{ node: workflowNode.name, type: connection, index: 0 }]] },
			]),
		),
		active: false,
		nodeTypes,
		...(parityCase.timezone ? { settings: { timezone: parityCase.timezone } } : {}),
	});
	const startNode = workflow.getNode(workflowNode.name);
	if (!startNode) throw new Error('The parity workflow has no node');
	const helper = new ParityCredentialsHelper(
		parityCase.credential?.types ?? [],
		parityCase.credential?.data ?? {},
	);
	const execution = new core.WorkflowExecute(
		additionalDataOf(helper, workflowNode, parityCase),
		'manual',
		workflowLib.createRunExecutionData({
			executionData: {
				nodeExecutionStack: [
					{
						node: startNode,
						data: {
							main: (parityCase.inputs ?? [parityCase.input]).map((items) =>
								items.map((json) => ({
									json,
									...(parityCase.binary ? { binary: parityCase.binary } : {}),
								})),
							),
						},
						source: null,
					},
				],
			},
		}),
	);
	const run = await execution.processRunExecutionData(workflow);
	nock.cleanAll();
	const task = run.data.resultData.runData[workflowNode.name]?.[0];
	const failure: unknown = run.data.resultData.error ?? task?.error;
	const [first, ...others] = task?.data?.main ?? [];
	return {
		requests: keyed(sent),
		unmatched,
		items: (first ?? []).map(normalItem),
		otherOutputs: others.map((output) => (output ?? []).map(normalItem)),
		output: first ?? [],
		...(failure ? { error: messageOf(failure) } : {}),
		...(run.data.waitTill ? { waitTill: run.data.waitTill.getTime() } : {}),
	};
}

export interface Difference {
	readonly path: string;
	readonly legacy: unknown;
	readonly next: unknown;
}

/** Leaf differences between two JSON values, e.g. `items[0].json.name`. */
export function differences(legacy: unknown, next: unknown, at = ''): Difference[] {
	if (isRecord(legacy) && isRecord(next)) {
		return [...new Set([...Object.keys(legacy), ...Object.keys(next)])].flatMap((key) =>
			differences(legacy[key], next[key], at ? `${at}.${key}` : key),
		);
	}
	if (Array.isArray(legacy) && Array.isArray(next)) {
		return Array.from({ length: Math.max(legacy.length, next.length) }, (_, index) =>
			differences(legacy[index], next[index], `${at}[${index}]`),
		).flat();
	}
	return isDeepStrictEqual(legacy, next) ? [] : [{ path: at, legacy, next }];
}

export interface AllowedDifference {
	/** A difference path, or a prefix of it at a `.` or `[` boundary. */
	readonly path: string;
	/** `intended`: the action differs on purpose. `bug`: reported, waits for a fix. */
	readonly kind: 'intended' | 'bug';
	readonly reason: string;
}

const covers = (allowed: AllowedDifference, difference: Difference) =>
	difference.path === allowed.path ||
	difference.path.startsWith(`${allowed.path}.`) ||
	difference.path.startsWith(`${allowed.path}[`);

/**
 * The differences no allowlist entry covers, and the entries that cover nothing. Both must be
 * empty: a fixed bug or a removed difference must also leave the allowlist.
 */
export function compareRuns(
	legacy: ParityRun,
	next: ParityRun,
	allowlist: readonly AllowedDifference[],
) {
	const found = differences(
		{
			requests: legacy.requests,
			unmatched: legacy.unmatched,
			items: legacy.items,
			otherOutputs: legacy.otherOutputs,
			error: legacy.error,
		},
		{
			requests: next.requests,
			unmatched: next.unmatched,
			items: next.items,
			otherOutputs: next.otherOutputs,
			error: next.error,
		},
	);
	return explained(found, allowlist);
}

/** The differences no allowlist entry covers, and the entries that cover nothing. */
export const explained = (
	found: readonly Difference[],
	allowlist: readonly AllowedDifference[],
) => ({
	unexplained: found.filter((difference) => !allowlist.some((entry) => covers(entry, difference))),
	stale: allowlist.filter((entry) => !found.some((difference) => covers(entry, difference))),
});
