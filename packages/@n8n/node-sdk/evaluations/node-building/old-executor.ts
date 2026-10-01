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
	| { readonly ok: true; readonly items: readonly unknown[] }
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
	node: INode,
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
			nodes: [node],
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

/** Runs one node in a one-node workflow through WorkflowExecute and returns its output items. */
export async function runOldNode(
	loaded: OldPackage,
	nodeName: string,
	parameters: INodeParameters,
	credential?: { readonly type: string; readonly data: ICredentialDataDecryptedObject },
	continueOnFail = false,
): Promise<Outcome> {
	const nodeType = loaded.nodeTypes[nodeName];
	if (!nodeType) return { ok: false, error: `The package has no node named ${nodeName}` };
	const nodeTypes: INodeTypes = {
		getByName: () => nodeType,
		getByNameAndVersion: (_type, version) =>
			workflowLib.NodeHelpers.getVersionedNodeType(nodeType, version),
		getKnownTypes: () => ({}),
	};
	const latest = workflowLib.NodeHelpers.getVersionedNodeType(nodeType).description.version;
	const node: INode = {
		id: 'node',
		name: 'Node',
		type: nodeName,
		typeVersion: Array.isArray(latest) ? Math.max(...latest) : latest,
		position: [0, 0],
		parameters,
		onError: continueOnFail ? 'continueRegularOutput' : 'stopWorkflow',
		...(credential ? { credentials: { [credential.type]: { id: '1', name: 'eval' } } } : {}),
	};
	const workflow = new workflowLib.Workflow({
		id: 'eval',
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes,
	});
	const helper = new EvalCredentialsHelper(
		loaded.credentialTypes,
		credential ? { [credential.type]: credential.data } : {},
	);
	const execution = new core.WorkflowExecute(additionalDataOf(helper, node), 'manual');
	const run = await execution.run({ workflow, startNode: node });
	const { error, runData } = run.data.resultData;
	const task = runData[node.name]?.[0];
	const failure: unknown = error ?? task?.error;
	if (failure) {
		const message = isRecord(failure) ? failure.message : undefined;
		return {
			ok: false,
			error: errorText(failure),
			...(typeof message === 'string' ? { message } : {}),
		};
	}
	return { ok: true, items: (task?.data?.main[0] ?? []).map((item) => item.json) };
}
