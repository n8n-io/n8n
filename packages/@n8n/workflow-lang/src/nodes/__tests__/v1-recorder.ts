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
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { EquivalenceCase, RawRequest, Recording, ServiceCallRecord } from './equivalence.ts';
import { normalizeRequest } from './equivalence.ts';

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
		preAuthentication: async () => undefined,
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

/** Installs a fake `OutboundHttp` that records requests and answers from a list. */
function installFakeHttp(responses: EquivalenceCase['responses'], recorded: RawRequest[]) {
	const { di, network } = load();
	let index = 0;
	const next = () => responses[Math.min(index++, responses.length - 1)] ?? { body: {} };
	const answer = (
		status: number,
		body: unknown,
		headers: Record<string, string>,
		full: boolean,
	) => {
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
			recorded.push({
				method: options.method,
				url: options.url,
				baseURL: options.baseURL,
				qs: snapshot(options.qs),
				headers: snapshot(options.headers),
				body: snapshot(options.body),
				auth: snapshot(options.auth),
			});
			const r = next();
			if ((r.status ?? 200) >= 400 && options.ignoreHttpStatusErrors) {
				return options.returnFullResponse
					? { statusCode: r.status, headers: r.headers ?? {}, body: r.body }
					: r.body;
			}
			return answer(r.status ?? 200, r.body, r.headers ?? {}, options.returnFullResponse === true);
		},
		async requestLegacy(options: AnyRecord) {
			let body = options.body;
			if (options.form !== undefined) body = { $form: options.form };
			if (options.formData !== undefined) body = { $multipart: Object.keys(options.formData) };
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
			});
			const r = next();
			return answer(
				r.status ?? 200,
				r.body,
				r.headers ?? {},
				options.resolveWithFullResponse === true,
			);
		},
		close() {},
	};
	di.Container.set(network.OutboundHttp, { requests: () => client });
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

/** Runs one case through the v1 node and records its requests and output. */
export async function recordV1(testCase: EquivalenceCase): Promise<Recording> {
	const { workflow, core, engine, compat } = load();
	expressionEngine ??= workflow.Expression.initExpressionEngine({
		engine: 'vm',
		poolSize: 1,
		maxCodeCacheSize: 1024,
		bridgeTimeout: 5000,
		bridgeMemoryLimit: 128,
	});
	await expressionEngine;

	const nodeTypes = new NodeTypes();
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
	const services: ServiceCallRecord[] = [];
	const unsupported = async () => {
		throw new Error('not supported');
	};
	const base = 'http://localhost:5678';
	const executor = new compat.V1StepExecutor({
		nodeTypes,
		additionalDataFactory: async ({ executionId }: { executionId: string }) => ({
			executionId,
			credentialsHelper: helper,
			externalSecretsProxy: new core.ExternalSecretsProxy(),
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
		}),
		loadStepData: async () => ({ graph: { nodes: [graphNode], edges: [] }, outputsByNode: {} }),
		resolveSubWorkflow: unsupported,
	});

	const recorded: RawRequest[] = [];
	installFakeHttp(testCase.responses, recorded);
	try {
		const result = await executor.execute({
			node: graphNode,
			inputs: [(testCase.items ?? [{}]).map((json) => ({ json }))],
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
			...(testCase.serviceResults ? { services } : {}),
			output: load().workflow.deepCopy(items.map((item) => item.json)),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			requests: recorded.map(normalizeRequest),
			...(testCase.serviceResults ? { services } : {}),
			error: message,
		};
	}
}

export async function disposeRecorder(): Promise<void> {
	if (expressionEngine === undefined) return;
	expressionEngine = undefined;
	await load().workflow.Expression.disposeExpressionEngine();
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
