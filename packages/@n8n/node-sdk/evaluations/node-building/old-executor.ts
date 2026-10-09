import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type * as Core from '../../../../core/dist/index.js';
import type * as N8nWorkflow from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IDataObject,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypes,
	IVersionedNodeType,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

import { isRecord } from './util';

// Load core and n8n-workflow with Node's require from core's location, so the eval shares
// one n8n-workflow copy with the execution engine (the package ships ESM and CJS builds).
const CORE_DIST = path.resolve(__dirname, '../../../../core/dist/index.js');
// Core reads its settings from the user folder on load; keep the eval out of ~/.n8n.
process.env.N8N_USER_FOLDER ??= path.join(tmpdir(), 'n8n-6071-nodeeval-user');
const requireFromCore = createRequire(CORE_DIST);
const core: typeof Core = requireFromCore(CORE_DIST);
const workflowLib: typeof N8nWorkflow = requireFromCore('n8n-workflow');

export type Outcome =
	| {
			readonly ok: true;
			readonly items: readonly unknown[];
			/** The input item index of each output item, when the engine tracks it. */
			readonly pairedItems?: readonly unknown[];
	  }
	/** `error` is the text for the report; `message` is the error message alone. */
	| { readonly ok: false; readonly error: string; readonly message?: string };

export interface OldPackage {
	readonly nodeTypes: Record<string, INodeType | IVersionedNodeType>;
	readonly credentialTypes: Record<string, ICredentialType>;
}

/** Loads the built package the way n8n loads a community package: from `package.json` `n8n`. */
export async function loadOldPackage(directory: string): Promise<OldPackage> {
	const loader = new core.PackageDirectoryLoader(directory);
	await loader.loadAll();
	return {
		nodeTypes: Object.fromEntries(
			Object.entries(loader.nodeTypes).map(([name, loaded]) => [name, loaded.type]),
		),
		credentialTypes: Object.fromEntries(
			Object.entries(loader.credentialTypes).map(([name, loaded]) => [name, loaded.type]),
		),
	};
}

/** Mirrors the generic `authenticate` of the CLI credentials helper: resolve `={{$credentials.x}}` values. */
class EvalCredentialsHelper extends workflowLib.ICredentialsHelper {
	constructor(
		private readonly types: Record<string, ICredentialType>,
		private readonly data: Record<string, ICredentialDataDecryptedObject>,
	) {
		super();
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions,
		workflow?: Workflow,
		node?: INode,
	): Promise<IHttpRequestOptions> {
		const authenticate = this.types[typeName]?.authenticate;
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
		const { headers, qs, body, auth } = authenticate.properties;
		return {
			...requestOptions,
			headers: { ...requestOptions.headers, ...resolveAll(headers) },
			qs: { ...requestOptions.qs, ...resolveAll(qs) },
			...(body
				? {
						body: {
							...(isRecord(requestOptions.body) ? requestOptions.body : {}),
							...resolveAll(body),
						},
					}
				: {}),
			...(auth
				? {
						auth: {
							username: resolveText(auth.username),
							password: resolveText(auth.password),
						},
					}
				: {}),
		};
	}

	getParentTypes() {
		return [];
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

	async getDecrypted(_additionalData: unknown, _details: unknown, type: string) {
		return this.data[type] ?? {};
	}

	async updateCredentials() {}

	async updateCredentialsOauthTokenData() {}

	getCredentialsProperties(type: string) {
		return this.types[type]?.properties ?? [];
	}
}

const unused = async () => await Promise.reject(new Error('Not available in the node eval'));

function additionalDataOf(
	credentialsHelper: EvalCredentialsHelper,
	nodes: INode[],
): IWorkflowExecuteAdditionalData {
	const now = new Date();
	return {
		credentialsHelper,
		hooks: new core.ExecutionLifecycleHooks('manual', '1', {
			id: 'eval',
			name: 'eval',
			active: false,
			isArchived: false,
			createdAt: now,
			updatedAt: now,
			nodes,
			connections: {},
			activeVersionId: null,
		}),
		executeWorkflow: unused,
		getRunExecutionData: async () => undefined,
		getRuntimeCredential: async () => undefined,
		startRunnerTask: unused,
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

const errorText = (value: unknown) =>
	isRecord(value)
		? [value.message, value.description].filter((part) => typeof part === 'string').join(': ')
		: String(value);

/** The node type of the stub that feeds the case items to the node under test. */
const SOURCE_TYPE = 'eval.source';

const sourceOf = (items: readonly IDataObject[]): INodeType => ({
	description: {
		displayName: 'Source',
		name: SOURCE_TYPE,
		group: ['input'],
		version: 1,
		description: 'The input items of the case',
		defaults: { name: 'Source' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	},
	execute: async () => await Promise.resolve([items.map((json) => ({ json: { ...json } }))]),
});

type Credential = { readonly type: string; readonly data: ICredentialDataDecryptedObject };

interface NodeRun {
	readonly loaded: OldPackage;
	readonly nodeName: string;
	readonly parameters: INodeParameters;
	readonly credential?: Credential;
	readonly continueOnFail?: boolean;
	/** One empty item when omitted, as the start node of a workflow gets. */
	readonly items?: readonly IDataObject[];
}

/** The workflow `Source -> Node`, with the node under test and its credential. */
function workflowOf(run: NodeRun) {
	const nodeType = run.loaded.nodeTypes[run.nodeName];
	if (!nodeType) return undefined;
	const source = sourceOf(run.items ?? [{}]);
	const nodeTypes: INodeTypes = {
		getByName: (type) => (type === SOURCE_TYPE ? source : nodeType),
		getByNameAndVersion: (type, version) =>
			type === SOURCE_TYPE
				? source
				: workflowLib.NodeHelpers.getVersionedNodeType(nodeType, version),
		getKnownTypes: () => ({}),
	};
	const latest = workflowLib.NodeHelpers.getVersionedNodeType(nodeType).description.version;
	const sourceNode: INode = {
		id: 'source',
		name: 'Source',
		type: SOURCE_TYPE,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	const node: INode = {
		id: 'node',
		name: 'Node',
		type: run.nodeName,
		typeVersion: Array.isArray(latest) ? Math.max(...latest) : latest,
		position: [200, 0],
		parameters: run.parameters,
		onError: run.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow',
		...(run.credential
			? { credentials: { [run.credential.type]: { id: '1', name: 'eval' } } }
			: {}),
	};
	const workflow = new workflowLib.Workflow({
		id: 'eval',
		nodes: [sourceNode, node],
		connections: { Source: { main: [[{ node: node.name, type: 'main', index: 0 }]] } },
		active: false,
		nodeTypes,
	});
	const helper = new EvalCredentialsHelper(
		run.loaded.credentialTypes,
		run.credential ? { [run.credential.type]: run.credential.data } : {},
	);
	return {
		workflow,
		sourceNode,
		node: workflow.getNode(node.name) ?? node,
		nodeType: workflowLib.NodeHelpers.getVersionedNodeType(nodeType, node.typeVersion),
		additionalData: additionalDataOf(helper, [sourceNode, node]),
	};
}

const failureOf = (failure: unknown): Outcome => {
	const message = isRecord(failure) ? failure.message : undefined;
	return {
		ok: false,
		error: errorText(failure),
		...(typeof message === 'string' ? { message } : {}),
	};
};

/** The input item index of an output item; a list for an item of more input items. */
const pairedIndexOf = (paired: INodeExecutionData['pairedItem']) =>
	typeof paired === 'number'
		? paired
		: Array.isArray(paired)
			? paired.map(({ item }) => item)
			: paired?.item;

/** Runs the node after a stub source of the case items through WorkflowExecute. */
export async function runOldNode(run: NodeRun): Promise<Outcome> {
	const setup = workflowOf(run);
	if (!setup) return { ok: false, error: `The package has no node named ${run.nodeName}` };
	const { workflow, sourceNode, node, additionalData } = setup;
	const execution = new core.WorkflowExecute(additionalData, 'manual');
	const result = await execution.run({ workflow, startNode: sourceNode });
	const { error, runData } = result.data.resultData;
	const task = runData[node.name]?.[0];
	const failure: unknown = error ?? task?.error;
	if (failure) return failureOf(failure);
	const items = task?.data?.main[0] ?? [];
	return {
		ok: true,
		items: items.map((item) => item.json),
		pairedItems: items.map((item) => pairedIndexOf(item.pairedItem)),
	};
}

/** The most list search pages the grader asks for: more means the node does not stop. */
const MAX_LIST_PAGES = 50;

/**
 * Runs the list search of the resource locator `field` as the n8n form does, and follows
 * `paginationToken` to the last page. The items are `{ name, value }` of each result.
 */
export async function runListSearch(
	run: NodeRun & { readonly field: string; readonly filter?: string },
): Promise<Outcome> {
	const setup = workflowOf(run);
	if (!setup) return { ok: false, error: `The package has no node named ${run.nodeName}` };
	const { workflow, node, nodeType, additionalData } = setup;
	const method = nodeType.description.properties
		.filter(({ name, type }) => name === run.field && type === 'resourceLocator')
		.flatMap(({ modes }) => modes ?? [])
		.find(({ type }) => type === 'list')?.typeOptions?.searchListMethod;
	const search = method === undefined ? undefined : nodeType.methods?.listSearch?.[method];
	if (!search)
		return { ok: false, error: `${run.field} has no list mode with a list search method` };
	const context = new core.LoadOptionsContext(
		workflow,
		node,
		{ ...additionalData, currentNodeParameters: node.parameters },
		`parameters.${run.field}`,
	);
	const pages = async (token: string | undefined, page: number): Promise<unknown[]> => {
		if (page > MAX_LIST_PAGES) throw new Error(`more than ${MAX_LIST_PAGES} list search pages`);
		const { results, paginationToken } = await search.call(context, run.filter, token);
		const entries = results.map(({ name, value }) => ({ name, value }));
		return paginationToken === undefined || paginationToken === null || paginationToken === ''
			? entries
			: [...entries, ...(await pages(String(paginationToken), page + 1))];
	};
	return await pages(undefined, 1).then((items): Outcome => ({ ok: true, items }), failureOf);
}
