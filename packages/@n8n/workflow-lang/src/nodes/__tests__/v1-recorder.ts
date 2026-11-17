/**
 * Runs v1 nodes through n8n's real code (the engine v2 shim, n8n-core and the
 * node packages) and records the HTTP requests they make. A fake
 * `OutboundHttp` in the DI container takes the place of the network.
 *
 * The packages load from their built `dist` folders through the dependencies
 * of `@n8n/workflow-fallback-host`, so this package needs no new dependencies.
 * The credentials helper applies `authenticate` as n8n's CLI does, so the
 * recorded requests carry the credential like real ones.
 */
import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { EquivalenceCase, RawRequest, Recording, ServiceCallRecord } from './equivalence.ts';
import { normalizeRequest } from './equivalence.ts';
import { fixtureBytes } from '../../reference/binary-response.ts';
import { networkErrorText } from './equivalence.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packagesDir = join(here, '../../../../..');
export const FALLBACK_HOST_DIR = join(packagesDir, '@n8n/workflow-fallback-host');
const NODE_PACKAGES: Record<string, string> = {
	'n8n-nodes-base': join(packagesDir, 'nodes-base'),
	'@n8n/n8n-nodes-langchain': join(packagesDir, '@n8n/nodes-langchain'),
};

/** True when the packages the recorder needs are built. */
export function recorderAvailable(): boolean {
	return (
		existsSync(join(NODE_PACKAGES['n8n-nodes-base'], 'dist/known/nodes.json')) &&
		existsSync(join(packagesDir, 'core/dist')) &&
		existsSync(join(packagesDir, '@n8n/node-engine-compatibility/dist'))
	);
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
// The recorder drives untyped CommonJS builds; it is test code.
type AnyRecord = Record<string, any>;

interface Modules {
	workflow: AnyRecord;
	core: AnyRecord;
	engine: AnyRecord;
	compat: AnyRecord;
	di: AnyRecord;
	network: AnyRecord;
	forms: AnyRecord;
}

let modules: Modules | undefined;

function load(): Modules {
	if (modules) return modules;
	const hostRequire = createRequire(join(FALLBACK_HOST_DIR, 'package.json'));
	const coreRequire = createRequire(hostRequire.resolve('n8n-core'));
	modules = {
		workflow: hostRequire('n8n-workflow'),
		core: hostRequire('n8n-core'),
		engine: hostRequire('@n8n/engine'),
		compat: hostRequire('@n8n/node-engine-compatibility'),
		di: coreRequire('@n8n/di'),
		network: coreRequire('@n8n/backend-network'),
		// `createFormDataObject` is not an export of the package: the build file has it.
		forms: coreRequire(
			join(dirname(coreRequire.resolve('@n8n/backend-network')), 'http/axios/utils.js'),
		),
	};
	return modules;
}

interface KnownEntry {
	className: string;
	sourcePath: string;
}

function knownIndex(packageDir: string, kind: 'nodes' | 'credentials'): Record<string, KnownEntry> {
	return JSON.parse(readFileSync(join(packageDir, `dist/known/${kind}.json`), 'utf8'));
}

function loadClass(packageDir: string, entry: KnownEntry): any {
	const required = createRequire(join(packageDir, 'package.json'))(
		join(packageDir, entry.sourcePath),
	);
	return new required[entry.className]();
}

class NodeTypes {
	private readonly cache = new Map<string, any>();

	/** `extra`: node types that are not in a node package (a test node), by type name. */
	constructor(extra: Record<string, unknown> = {}) {
		for (const [type, instance] of Object.entries(extra)) this.cache.set(type, instance);
	}

	getByName(type: string): any {
		const found = this.cache.get(type);
		if (found) return found;
		const dot = type.lastIndexOf('.');
		const packageDir = NODE_PACKAGES[type.slice(0, dot)];
		const entry = packageDir ? knownIndex(packageDir, 'nodes')[type.slice(dot + 1)] : undefined;
		if (!packageDir || !entry) throw new Error(`unknown node type ${type}`);
		const instance = loadClass(packageDir, entry);
		this.cache.set(type, instance);
		return instance;
	}

	getByNameAndVersion(type: string, version?: number): any {
		const { workflow, core } = load();
		const nodeType = workflow.NodeHelpers.getVersionedNodeType(this.getByName(type), version);
		// As n8n's CLI does (`shouldAssignExecuteMethod`): a declarative node runs through RoutingNode.
		const declarative = nodeType.description?.requestDefaults !== undefined;
		if (
			!nodeType.execute &&
			!nodeType.supplyData &&
			!nodeType.poll &&
			!nodeType.trigger &&
			(!nodeType.webhook || declarative) &&
			(!nodeType.methods || declarative)
		) {
			nodeType.execute = async function (this: unknown) {
				return (await new core.RoutingNode(this, nodeType).runNode()) ?? [];
			};
		}
		return nodeType;
	}

	getKnownTypes() {
		return {};
	}
}

class CredentialTypes {
	private readonly cache = new Map<string, any>();

	get(name: string): any {
		const found = this.cache.get(name);
		if (found) return found;
		for (const dir of Object.values(NODE_PACKAGES)) {
			const file = join(dir, 'dist/known/credentials.json');
			if (!existsSync(file)) continue;
			const entry = knownIndex(dir, 'credentials')[name];
			if (!entry) continue;
			const instance = loadClass(dir, entry);
			this.cache.set(name, instance);
			return instance;
		}
		throw new Error(`unknown credential type ${name}`);
	}

	parents(name: string): string[] {
		const out: string[] = [];
		const queue: string[] = [...(this.get(name).extends ?? [])];
		while (queue.length > 0) {
			const next = queue.shift();
			if (next === undefined || out.includes(next)) continue;
			out.push(next);
			queue.push(...(this.get(next).extends ?? []));
		}
		return out;
	}
}

/**
 * `preAuthentication` of one recording. v1 runs it before a request when the session token of
 * the credential (the hidden `expirable` field) is empty, and again after a 401 answer.
 * Its requests are apart from the requests of the node: n8n sends them, a compiled node does not.
 */
const preAuthentication = {
	active: false,
	field: '',
	requests: 0,
	data: {} as Record<string, unknown>,
};

/** The answer to a request of `preAuthentication`: each field of the body is the new token. */
function sessionAnswer(): unknown {
	const token = `fake-${preAuthentication.field}`;
	return new Proxy(
		{},
		{ get: (_target, key) => (typeof key === 'string' && key !== 'then' ? token : undefined) },
	);
}

/** The credentials helper of n8n's CLI, reduced to what a single run needs. */
function credentialsHelper(credentialTypes: CredentialTypes, data: Record<string, unknown>) {
	return {
		getParentTypes: (name: string) => credentialTypes.parents(name),
		isCredentialUsableByNode: () => true,
		async authenticate(
			credentials: Record<string, unknown>,
			typeName: string,
			requestOptions: AnyRecord,
			workflow: AnyRecord,
			node: AnyRecord,
		) {
			const type = credentialTypes.get(typeName);
			const auth = type.authenticate;
			if (typeof auth === 'function') return await auth.call(type, credentials, requestOptions);
			if (auth?.type === 'generic') {
				const resolve = (value: unknown): string => {
					if (typeof value !== 'string' || !value.startsWith('=')) return String(value);
					const out = workflow.expression.getSimpleParameterValue(
						node,
						value,
						'internal',
						{ $credentials: credentials },
						undefined,
						'',
					);
					return out ? String(out) : '';
				};
				requestOptions.headers ??= {};
				for (const [outer, values] of Object.entries(auth.properties as AnyRecord)) {
					requestOptions[outer] ??= {};
					for (const [key, value] of Object.entries(values as AnyRecord)) {
						requestOptions[outer][resolve(key)] = resolve(value);
					}
				}
			}
			return requestOptions;
		},
		// As `CredentialsHelper.preAuthentication` of n8n's CLI.
		async preAuthentication(
			helpers: unknown,
			credentials: Record<string, unknown>,
			typeName: string,
			_node: unknown,
			expired: boolean,
		) {
			const type = credentialTypes.get(typeName);
			const expirable = (type.properties ?? []).find(
				(p: AnyRecord) => p.type === 'hidden' && p.typeOptions?.expirable === true,
			);
			if (!expirable || typeof type.preAuthentication !== 'function') return undefined;
			if (credentials[expirable.name] !== '' && !expired) return undefined;
			preAuthentication.active = true;
			preAuthentication.field = expirable.name;
			let output: AnyRecord | undefined;
			try {
				output = await type.preAuthentication.call(helpers, credentials);
			} finally {
				preAuthentication.active = false;
			}
			if (output?.[expirable.name] === undefined) return undefined;
			Object.assign(preAuthentication.data, output);
			// v1 saves the new token in the credential: the next request of the node reads it.
			Object.assign(data, output);
			return Object.assign(credentials, output);
		},
		runPreAuthentication: async () => undefined,
		getCredentials: async () => {
			throw new Error('not supported');
		},
		getDecrypted: async () => structuredClone(data),
		updateCredentials: async () => {},
		updateCredentialsOauthTokenData: async () => {},
		getCredentialsProperties: () => [],
	};
}

const MAX_FAKE_REQUESTS = 64;

let expressionEngine: Promise<void> | undefined;

/** A JSON copy, so later changes by the node do not change the record. */
function snapshot(value: unknown): unknown {
	if (value === undefined) return undefined;
	try {
		// The CommonJS build, through `load`: Node.js cannot import the ESM build of
		// n8n-workflow (its imports have no file extensions), so this file must not.
		return load().workflow.deepCopy(value);
	} catch {
		return '[not JSON]';
	}
}

/** The parts of a form-data body: a file part has a file name or a content type, and base64 `data`. */
function partsOf(body: Buffer, boundary: string): unknown[] {
	const utf8 = (text: string) => Buffer.from(text, 'latin1').toString('utf8');
	const sections = body.toString('latin1').split(`--${boundary}`).slice(1, -1);
	return sections.map((section) => {
		const cut = section.indexOf('\r\n\r\n');
		const head = section.slice(2, cut);
		const content = Buffer.from(section.slice(cut + 4, -2), 'latin1');
		const disposition = /name="([^"]*)"(?:; filename="([^"]*)")?/.exec(head);
		const fileName = disposition?.[2];
		const contentType = /^content-type: (.*)$/im.exec(head)?.[1];
		const isFile = fileName !== undefined || contentType !== undefined;
		return {
			name: utf8(disposition?.[1] ?? ''),
			...(fileName !== undefined ? { fileName: utf8(fileName) } : {}),
			...(contentType !== undefined ? { contentType: utf8(contentType) } : {}),
			...(isFile ? { data: content.toString('base64') } : { value: content.toString('utf8') }),
		};
	});
}

/**
 * The multipart body that n8n's request conversion (`parseRequestObject`) sends for `formData`:
 * with a multipart content type the members of `body` are fields too, and without one a `form`
 * alone comes first. n8n's own function builds the form-data, so the parts are the bytes of v1.
 */
function multipartOf(options: AnyRecord): unknown {
	const { forms } = load();
	const headers: AnyRecord = options.headers ?? {};
	const typeName = Object.keys(headers).find((name) => name.toLowerCase() === 'content-type');
	const type: unknown = typeName === undefined ? undefined : headers[typeName];
	const mixed = typeof type === 'string' && type.includes('multipart/form-data');
	if (!mixed && options.form !== undefined && options.body === undefined) return undefined;
	try {
		const form = forms.isFormDataInstance(options.formData)
			? options.formData
			: forms.createFormDataObject(
					mixed ? { ...options.body, ...options.formData } : options.formData,
				);
		return { $multipart: partsOf(form.getBuffer(), form.getBoundary()) };
	} catch (error) {
		return {
			$multipart: `[not readable: ${error instanceof Error ? error.message : String(error)}]`,
		};
	}
}

/** An item of a case as an n8n item: the key `$binary` of the JSON is the item's binary data. */
function inputItem(json: Record<string, unknown>): AnyRecord {
	const { $binary: binary, ...rest } = json;
	return typeof binary === 'object' && binary !== null ? { json: rest, binary } : { json };
}

/** An output item as the JSON of the language: the binary data of the item is the key `$binary`. */
function outputItem(item: AnyRecord): unknown {
	return item.binary === undefined ? item.json : { ...item.json, $binary: item.binary };
}

/** Installs a fake `OutboundHttp` that records requests and answers from a list. */
function installFakeHttp(
	responses: EquivalenceCase['responses'],
	recorded: RawRequest[],
	responseBytes: boolean,
) {
	const { di, network } = load();
	let index = 0;
	// A node that pages until an empty answer never stops on a repeated last answer.
	const next = () => {
		if (index >= MAX_FAKE_REQUESTS)
			throw new Error(`the node sent more than ${MAX_FAKE_REQUESTS} requests`);
		return responses[Math.min(index++, responses.length - 1)] ?? { body: {} };
	};
	// A request that asks for bytes gets the body of the case as a Buffer, as the HTTP client gives it.
	const answer = (
		status: number,
		given: unknown,
		headers: Record<string, string>,
		full: boolean,
		bytes: boolean,
	) => {
		const body = bytes ? fixtureBytes(given) : given;
		if (status >= 400) {
			throw Object.assign(new Error(`Request failed with status code ${status}`), {
				response: { status, data: body, headers },
				statusCode: status,
			});
		}
		return full ? { statusCode: status, statusMessage: 'OK', headers, body } : body;
	};
	const client = {
		async request(options: AnyRecord) {
			if (preAuthentication.active) {
				preAuthentication.requests++;
				return answer(200, sessionAnswer(), {}, options.returnFullResponse === true, false);
			}
			recorded.push({
				method: options.method,
				url: options.url,
				baseURL: options.baseURL,
				qs: snapshot(options.qs),
				headers: snapshot(options.headers),
				body: snapshot(options.body),
				auth: snapshot(options.auth),
				acceptDefault: options.json ? 'application/json' : 'application/json, text/plain, */*',
			});
			const r = next();
			if (r.networkError) throw networkFailure(r.networkError);
			if ((r.status ?? 200) >= 400 && options.ignoreHttpStatusErrors) {
				return options.returnFullResponse
					? { statusCode: r.status, headers: r.headers ?? {}, body: r.body }
					: r.body;
			}
			return answer(
				r.status ?? 200,
				r.body,
				r.headers ?? {},
				options.returnFullResponse === true,
				responseBytes && options.encoding === 'arraybuffer',
			);
		},
		async requestLegacy(options: AnyRecord) {
			if (preAuthentication.active) {
				preAuthentication.requests++;
				return answer(200, sessionAnswer(), {}, options.resolveWithFullResponse === true, false);
			}
			let body = options.body;
			if (options.form !== undefined) body = { $form: options.form };
			if (options.formData !== undefined) body = multipartOf(options) ?? body;
			// How the request library writes `qs` (spec 7.1 `qsFormat`): `querystring` with
			// `useQuerystring` or `arrayFormat: 'repeat'`, else qs's `stringify` (brackets).
			const qsOptions: unknown = options.qsStringifyOptions;
			const repeat =
				options.useQuerystring === true ||
				(typeof qsOptions === 'object' &&
					qsOptions !== null &&
					Reflect.get(qsOptions, 'arrayFormat') === 'repeat');
			recorded.push({
				method: options.method,
				url: options.uri ?? options.url,
				baseURL: options.baseURL,
				qs: snapshot(options.qs),
				headers: snapshot(options.headers),
				body: snapshot(body),
				auth: snapshot(options.auth),
				qsFormat: repeat ? 'repeat' : 'brackets',
				acceptDefault: options.json === true ? 'application/json' : '*/*',
			});
			const r = next();
			if (r.networkError) throw networkFailure(r.networkError);
			// `simple: false`: the request library gives the answer of a failed request.
			if ((r.status ?? 200) >= 400 && options.simple === false) {
				return options.resolveWithFullResponse
					? { statusCode: r.status, headers: r.headers ?? {}, body: r.body }
					: r.body;
			}
			return answer(
				r.status ?? 200,
				r.body,
				r.headers ?? {},
				options.resolveWithFullResponse === true,
				responseBytes && options.encoding === null,
			);
		},
		close() {},
	};
	di.Container.set(network.OutboundHttp, {
		requests: () => client,
		// The model sub-nodes ask for the egress filter of the execution; the fake `fetch` answers.
		egressFilter: () => network.passthroughEgressFilter,
	});
}

/** The error of Node.js for a request that fails without an answer. */
function networkFailure(code: string): Error {
	return Object.assign(new Error(networkErrorText(code)), { code, errno: -1, syscall: 'connect' });
}

/** Headers that name the client library or the transport. A compiled node does not send them. */
const CLIENT_HEADERS =
	/^(user-agent|accept|accept-encoding|content-length|x-stainless-.*|x-goog-api-client|anthropic-dangerous-.*)$/;

/**
 * Replaces the global `fetch` for one run: the clients of the LangChain models (the OpenAI,
 * Anthropic and Google SDKs) send their requests with it. It records each request and answers
 * from the list of the case. Returns the function that restores the real `fetch`.
 */
function installFakeFetch(responses: EquivalenceCase['responses'], recorded: RawRequest[]) {
	const real = globalThis.fetch;
	let index = 0;
	globalThis.fetch = async (input: any, init?: any): Promise<Response> => {
		if (index >= MAX_FAKE_REQUESTS)
			throw new Error(`the node sent more than ${MAX_FAKE_REQUESTS} requests`);
		const request = new Request(input, init);
		const headers: Record<string, string> = {};
		request.headers.forEach((value, name) => {
			if (!CLIENT_HEADERS.test(name)) headers[name] = value;
		});
		const text = await request.text();
		let body: unknown = text;
		try {
			body = JSON.parse(text);
		} catch {}
		recorded.push({ method: request.method, url: request.url, headers, body });
		const r = responses[Math.min(index++, responses.length - 1)] ?? { body: {} };
		// The fetch of Node.js fails with a TypeError whose cause has the code.
		if (r.networkError)
			throw new TypeError('fetch failed', { cause: networkFailure(r.networkError) });
		return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), {
			status: r.status ?? 200,
			headers: { 'content-type': 'application/json', ...(r.headers ?? {}) },
		});
	};
	return () => {
		globalThis.fetch = real;
	};
}

/**
 * A data-table provider (`additionalData['data-table']`) that records each
 * service call in the form of a `ctx.service` effect (the engine v2 call: `op`
 * is its `kind`) and answers from the case's `serviceResults`, in order.
 */
function recordingDataTables(results: unknown[], recorded: ServiceCallRecord[]) {
	// n8n's data-table service gives the system dates of rows and tables as Date objects.
	const withDates = (value: unknown): unknown => {
		if (Array.isArray(value)) return value.map(withDates);
		if (value === null || typeof value !== 'object') return value;
		const out: AnyRecord = {};
		for (const [k, v] of Object.entries(value as AnyRecord)) {
			out[k] =
				(k === 'createdAt' || k === 'updatedAt') && typeof v === 'string'
					? new Date(v)
					: withDates(v);
		}
		return out;
	};
	let index = 0;
	const answer = (op: string, args: AnyRecord) => {
		recorded.push({ service: 'dataTable', op, args: snapshot(args) });
		const result = structuredClone(results[Math.min(index++, results.length - 1)]);
		if (result !== null && typeof result === 'object' && '$error' in result) {
			throw new Error(String((result as AnyRecord).$error));
		}
		return withDates(result);
	};
	return {
		getDataTableAggregateProxy: async () => ({
			getProjectId: () => 'equivalence',
			getManyAndCount: async (options: AnyRecord) => answer('getManyAndCount', { options }),
		}),
		getDataTableProxy: async (_workflow: unknown, _node: unknown, dataTableId: string) => ({
			getColumns: async () => answer('getColumns', { dataTableId }),
			getManyRowsAndCount: async (options: AnyRecord) =>
				answer('getManyRowsAndCount', { dataTableId, options }),
			insertRows: async (rows: AnyRecord[], returnType: string) =>
				answer('insertRows', { dataTableId, rows, returnType }),
			updateRows: async (options: AnyRecord) => answer('updateRows', { dataTableId, options }),
			upsertRow: async (options: AnyRecord) => answer('upsertRow', { dataTableId, options }),
			deleteRows: async (options: AnyRecord) => answer('deleteRows', { dataTableId, options }),
		}),
	};
}

/** The members of n8n's `additionalData` that a node run needs. */
function additionalDataOf(
	testCase: EquivalenceCase,
	helper: unknown,
	services: ServiceCallRecord[],
	executionId: string,
): AnyRecord {
	const unsupported = async () => {
		throw new Error('not supported');
	};
	const base = 'http://localhost:5678';
	return {
		executionId,
		credentialsHelper: helper,
		externalSecretsProxy: new (load().core.ExternalSecretsProxy)(),
		currentNodeExecutionIndex: 0,
		restApiUrl: `${base}/rest`,
		instanceBaseUrl: base,
		formBaseUrl: `${base}/form`,
		formWaitingBaseUrl: `${base}/form-waiting`,
		formTestBaseUrl: `${base}/form-test`,
		webhookBaseUrl: `${base}/webhook`,
		webhookWaitingBaseUrl: `${base}/webhook-waiting`,
		webhookTestBaseUrl: `${base}/webhook-test`,
		mcpBaseUrl: `${base}/mcp`,
		mcpTestBaseUrl: `${base}/mcp-test`,
		variables: {},
		executeWorkflow: unsupported,
		getRunExecutionData: async () => undefined,
		getRuntimeCredential: async () => undefined,
		logAiEvent: () => {},
		startRunnerTask: unsupported,
		...(testCase.serviceResults
			? {
					'data-table': {
						dataTableProxyProvider: recordingDataTables(testCase.serviceResults, services),
					},
				}
			: {}),
	};
}

const START_NODE = 'Start';
const ENGINE_NODE = 'Node';

/**
 * Runs a case with node settings in n8n's engine: `WorkflowExecute` runs a workflow of a
 * manual trigger with the input items as its pinned output, and the node after it. The
 * engine makes the error items, the error output, the pass of the input after a failure,
 * the retries, "always output data" and "execute once". The outputs come from its run data.
 */
async function recordInEngine(
	testCase: EquivalenceCase,
	nodeTypes: NodeTypes,
	credentials: AnyRecord,
	helper: unknown,
): Promise<Recording> {
	const { workflow, core } = load();
	const subNodes = testCase.subNodes ?? [];
	// Every credential type of a sub-node points at the case's credential.
	const subCredentials = (sub: { type: string; typeVersion: number }) => {
		const out: AnyRecord = {};
		const description = nodeTypes.getByNameAndVersion(sub.type, sub.typeVersion).description;
		for (const { name } of description.credentials ?? []) out[name] = { id: 'case', name: 'case' };
		return out;
	};
	let nodePaired: boolean[] | undefined;
	const observed = {
		getByName: (type: string) => nodeTypes.getByName(type),
		getByNameAndVersion: (type: string, version?: number) => {
			const nodeType = nodeTypes.getByNameAndVersion(type, version);
			if (type !== testCase.type || typeof nodeType.execute !== 'function') return nodeType;
			const watched = Object.create(nodeType);
			watched.execute = async function (this: unknown, ...args: unknown[]) {
				const result = await nodeType.execute.apply(this, args);
				if (Array.isArray(result)) {
					nodePaired = result
						.flat()
						.map((item: AnyRecord | null) => item?.pairedItem !== undefined);
				}
				return result;
			};
			return watched;
		},
		getKnownTypes: () => ({}),
	};
	const graph = new workflow.Workflow({
		id: 'equivalence',
		name: 'Equivalence',
		nodes: [
			{
				id: 'start',
				name: START_NODE,
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'step',
				name: ENGINE_NODE,
				type: testCase.type,
				typeVersion: testCase.typeVersion,
				position: [200, 0],
				parameters: structuredClone(testCase.parameters),
				...(testCase.credential ? { credentials } : {}),
				...testCase.settings,
			},
			...subNodes.map((sub, k) => ({
				id: `sub-${k}`,
				name: sub.name,
				type: sub.type,
				typeVersion: sub.typeVersion,
				position: [200, 200 + 100 * k],
				parameters: structuredClone(sub.parameters),
				...(testCase.credential ? { credentials: subCredentials(sub) } : {}),
			})),
		],
		connections: {
			[START_NODE]: { main: [[{ node: ENGINE_NODE, type: 'main', index: 0 }]] },
			...Object.fromEntries(
				subNodes.map((sub) => [
					sub.name,
					{ [sub.connection]: [[{ node: ENGINE_NODE, type: sub.connection, index: 0 }]] },
				]),
			),
		},
		nodeTypes: observed,
		active: false,
		settings: { executionOrder: 'v1' },
	});
	const services: ServiceCallRecord[] = [];
	const hooks = new core.ExecutionLifecycleHooks('trigger', 'equivalence', {
		id: 'equivalence',
		nodes: [],
		connections: {},
	});
	const additionalData = {
		...additionalDataOf(testCase, helper, services, 'equivalence'),
		hooks,
		executionTimeoutTimestamp: Date.now() + 8000,
	};
	const runExecutionData = workflow.createRunExecutionData({
		resultData: { pinData: { [START_NODE]: (testCase.items ?? [{}]).map(inputItem) } },
		executionData: {
			nodeExecutionStack: [
				{ node: graph.getNode(START_NODE), data: { main: [[{ json: {} }]] }, source: null },
			],
		},
	});
	const recorded: RawRequest[] = [];
	installFakeHttp(testCase.responses, recorded, testCase.responseBytes === true);
	const engine = new core.WorkflowExecute(additionalData, 'trigger', runExecutionData);
	// The check before the start refuses parameter values that are not real ids. The cases
	// use made-up values, as the cases without settings do. The run itself is the engine's.
	engine.checkReadyForExecution = () => null;
	const restoreFetch = subNodes.length > 0 ? installFakeFetch(testCase.responses, recorded) : null;
	let run: AnyRecord;
	try {
		run = await engine.processRunExecutionData(graph);
	} finally {
		restoreFetch?.();
	}
	const result = run.data.resultData;
	const outputs: unknown[][] = [];
	const paired: unknown[][] = [];
	const tasks: AnyRecord[] = result.runData[ENGINE_NODE] ?? [];
	// After a node that throws under a "continue" setting, the engine passes the input on and
	// keeps the error on the task and on the run. The run stopped only when the task has no data.
	const stopped = tasks.every((task) => task.data === undefined);
	const nodeError = tasks.find((task) => task.error !== undefined)?.error;
	for (const task of tasks) {
		(task.data?.main ?? []).forEach((list: AnyRecord[] | null, k: number) => {
			outputs[k] = [...(outputs[k] ?? []), ...(list ?? []).map(outputItem)];
			paired[k] = [...(paired[k] ?? []), ...(list ?? []).map((item) => item.pairedItem ?? null)];
		});
	}
	const subRuns: Record<string, Array<{ error: string | null }>> = {};
	for (const sub of subNodes) {
		const runs: AnyRecord[] = result.runData[sub.name] ?? [];
		if (runs.length === 0) continue;
		subRuns[sub.name] = runs.map((r) => ({
			error: r.error
				? String(r.error.message ?? 'error')
				: r.executionStatus === 'error'
					? 'error'
					: null,
		}));
	}
	return {
		requests: recorded.map(normalizeRequest),
		accepts: recorded.map((request) => request.acceptDefault ?? null),
		...(testCase.serviceResults ? { services } : {}),
		...(subNodes.length > 0 && !result.error
			? { output: workflow.deepCopy(outputs[0] ?? []) }
			: {}),
		...(subNodes.length > 0 ? { subRuns } : {}),
		outputs: workflow.deepCopy(Array.from(outputs, (list) => list ?? [])),
		paired: workflow.deepCopy(Array.from(paired, (list) => list ?? [])),
		...(nodePaired ? { nodePaired } : {}),
		...(nodeError && !stopped ? { nodeError: String(nodeError.message) } : {}),
		...(result.error && stopped ? { error: String(result.error.message) } : {}),
	};
}

/** Runs one case through the v1 node and records its requests and output. */
export async function recordV1(
	testCase: EquivalenceCase,
	extraNodes: Record<string, unknown> = {},
): Promise<Recording> {
	Object.assign(preAuthentication, { active: false, field: '', requests: 0, data: {} });
	const recording = await recordNode(testCase, extraNodes);
	if (preAuthentication.requests === 0) return recording;
	const { requests, data } = preAuthentication;
	return { ...recording, preAuthentication: { requests, data: { ...data } } };
}

async function recordNode(
	testCase: EquivalenceCase,
	extraNodes: Record<string, unknown>,
): Promise<Recording> {
	const { workflow, engine, compat } = load();
	expressionEngine ??= workflow.Expression.initExpressionEngine({
		engine: 'vm',
		poolSize: 1,
		maxCodeCacheSize: 1024,
		bridgeTimeout: 5000,
		bridgeMemoryLimit: 128,
	});
	await expressionEngine;

	const nodeTypes = new NodeTypes(extraNodes);
	const credentialTypes = new CredentialTypes();
	const description = nodeTypes.getByNameAndVersion(
		testCase.type,
		testCase.typeVersion,
	).description;
	const credentials: AnyRecord = {};
	if (testCase.credential) {
		// Every credential type of the node points at the case's credential, as in the fallback host.
		for (const { name } of description.credentials ?? []) {
			credentials[name] = { id: 'case', name: 'case' };
		}
	}
	const graphNode = {
		id: 'step',
		name: 'Node',
		type: 'v1-node',
		config: {
			nodeType: testCase.type,
			typeVersion: testCase.typeVersion,
			parameters: structuredClone(testCase.parameters),
			continueOnFail: false,
			...(testCase.credential ? { credentials } : {}),
		},
	};
	const helper = credentialsHelper(credentialTypes, testCase.credential?.data ?? {});
	if (testCase.settings || testCase.subNodes)
		return await recordInEngine(testCase, nodeTypes, credentials, helper);
	const services: ServiceCallRecord[] = [];
	const unsupported = async () => {
		throw new Error('not supported');
	};
	const executor = new compat.V1StepExecutor({
		nodeTypes,
		additionalDataFactory: async ({ executionId }: { executionId: string }) =>
			additionalDataOf(testCase, helper, services, executionId),
		loadStepData: async () => ({ graph: { nodes: [graphNode], edges: [] }, outputsByNode: {} }),
		resolveSubWorkflow: unsupported,
	});

	const recorded: RawRequest[] = [];
	installFakeHttp(testCase.responses, recorded, testCase.responseBytes === true);
	try {
		const result = await executor.execute({
			node: graphNode,
			inputs: [(testCase.items ?? [{}]).map(inputItem)],
			context: {
				executionId: 'equivalence',
				stepId: 'step',
				workflowId: 'equivalence',
				mode: 'production',
				iteration: 0,
				callerContext: { hostMode: 'integrated' },
				responseExpectation: { kind: 'none' },
			},
			respond: engine.noopResponseEmitter,
		});
		const items: AnyRecord[] = result.outputs?.[0] ?? [];
		return {
			requests: recorded.map(normalizeRequest),
			accepts: recorded.map((request) => request.acceptDefault ?? null),
			...(testCase.serviceResults ? { services } : {}),
			output: load().workflow.deepCopy(items.map(outputItem)),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			requests: recorded.map(normalizeRequest),
			accepts: recorded.map((request) => request.acceptDefault ?? null),
			...(testCase.serviceResults ? { services } : {}),
			error: message,
		};
	}
}

const CACHE_DIR = join(here, '../../../node_modules/.cache/v1-recordings');
const CACHE_MAX_ENTRIES = 50_000;
function buildFiles(): string[] {
	const hostRequire = createRequire(join(FALLBACK_HOST_DIR, 'package.json'));
	const built = ['n8n-workflow', 'n8n-core', '@n8n/node-engine-compatibility'].map((name) => {
		try {
			return hostRequire.resolve(name);
		} catch {
			return name;
		}
	});
	return [
		join(NODE_PACKAGES['n8n-nodes-base'], 'dist/known/nodes.json'),
		join(NODE_PACKAGES['n8n-nodes-base'], 'dist/known/credentials.json'),
		...built,
	];
}
const RECORDER_FILES = [fileURLToPath(import.meta.url), join(here, 'equivalence.ts')];

function digest(text: string): string {
	return createHash('sha256').update(text).digest('hex');
}

let buildIdentity: string | undefined;

/**
 * A recording stays valid while the built packages and the recorder itself do
 * not change: the size and time of the build outputs, and the text of the recorder.
 */
/** The form of a recording. A new member of `Recording` needs a new value, so old files are not read. */
const RECORDING_FORM = 'accepts-1';

function identityOfBuild(): string {
	if (buildIdentity !== undefined) return buildIdentity;
	const parts = buildFiles().map((file) => {
		if (!existsSync(file)) return `${file}:none`;
		const { size, mtimeMs } = statSync(file);
		return `${file}:${size}:${mtimeMs}`;
	});
	for (const file of RECORDER_FILES) parts.push(digest(readFileSync(file, 'utf8')));
	parts.push(process.version, process.env.TZ ?? '');
	buildIdentity = digest(parts.join('\n'));
	return buildIdentity;
}

let cacheEntries: number | undefined;

/** Counts the entries once; when the cache is full it removes the older half. */
function entriesInCache(): number {
	if (cacheEntries !== undefined) return cacheEntries;
	mkdirSync(CACHE_DIR, { recursive: true });
	const names = readdirSync(CACHE_DIR).filter((name) => name.endsWith('.json'));
	cacheEntries = names.length;
	if (names.length >= CACHE_MAX_ENTRIES) {
		const byAge = names
			.map((name) => {
				try {
					return { name, time: statSync(join(CACHE_DIR, name)).mtimeMs };
				} catch {
					return { name, time: 0 };
				}
			})
			.sort((a, b) => a.time - b.time);
		const old = byAge.slice(0, Math.ceil(names.length / 2));
		for (const { name } of old) rmSync(join(CACHE_DIR, name), { force: true });
		cacheEntries = names.length - old.length;
	}
	return cacheEntries;
}

function isRecording(value: unknown): value is Recording {
	return (
		typeof value === 'object' &&
		value !== null &&
		'requests' in value &&
		Array.isArray(value.requests)
	);
}

function storedRecording(file: string): Recording | undefined {
	try {
		const stored: unknown = JSON.parse(readFileSync(file, 'utf8'));
		return isRecording(stored) ? stored : undefined;
	} catch {
		return undefined;
	}
}

function store(file: string, recording: Recording): boolean {
	const partial = `${file}.${process.pid}.tmp`;
	try {
		writeFileSync(partial, JSON.stringify(recording));
		renameSync(partial, file);
		return true;
	} catch {
		rmSync(partial, { force: true });
		return false;
	}
}

/**
 * `recordV1` with a bounded cache on disk. The key is the case and the identity
 * of the build, so a second run with the same node code does not run the v1 node.
 */
export async function recordV1Cached(testCase: EquivalenceCase): Promise<Recording> {
	const file = join(
		CACHE_DIR,
		`${digest(`${RECORDING_FORM}\n${identityOfBuild()}\n${JSON.stringify(testCase)}`)}.json`,
	);
	const count = entriesInCache();
	const stored = storedRecording(file);
	if (stored !== undefined) return stored;
	const recording = await recordV1(testCase);
	if (count < CACHE_MAX_ENTRIES && store(file, recording)) cacheEntries = count + 1;
	return recording;
}

export async function disposeRecorder(): Promise<void> {
	if (expressionEngine === undefined) return;
	expressionEngine = undefined;
	await load().workflow.Expression.disposeExpressionEngine();
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
