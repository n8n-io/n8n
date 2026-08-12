
import { CredentialTypes } from '@nodes-testing/credential-types';
import { CredentialsHelper } from '@nodes-testing/credentials-helper';
import { LoadNodesAndCredentials } from '@nodes-testing/load-nodes-and-credentials';
import { NodeTypes } from '@nodes-testing/node-types';
import { ExecutionLifecycleHooks, WorkflowExecute } from 'n8n-core';
import type {
	IConnections,
	IDataObject,
	INode,
	IRun,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	IWorkflowSettings,
} from 'n8n-workflow';
import { createRunExecutionData, UnexpectedError, Workflow } from 'n8n-workflow';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

/**
 * The shape a workflow export (`workflow.json`) is consumed as. Deliberately looser than
 * `IWorkflowBase` (e.g. `position` is `number[]`) so a plain JSON import needs no casting
 * in the test file — the test file is the artifact on screen.
 */
export interface WorkflowJson {
	id?: string;
	name?: string;
	nodes: Array<Omit<INode, 'position'> & { position: number[] }>;
	// Same shape as `IConnections` / `IWorkflowSettings` with JSON's widened literals
	// (`type: string`, `executionOrder: string`).
	connections: Record<
		string,
		Record<string, Array<Array<{ node: string; type: string; index: number }> | null>>
	>;
	settings?: Record<string, unknown>;
}

/**
 * Real node implementations, loaded from the built `n8n-nodes-base` once per process and
 * shared by every {@link runWorkflow} call — loading is the slow part (seconds).
 */
let engineComponentsPromise:
	| Promise<{ nodeTypes: NodeTypes; credentialsHelper: CredentialsHelper }>
	| undefined;

async function loadEngineComponents() {
	engineComponentsPromise ??= (async () => {
		const nodesBaseDir = path.dirname(require.resolve('n8n-nodes-base'));
		const loader = new LoadNodesAndCredentials([nodesBaseDir]);
		await loader.init();
		const credentialsHelper = new CredentialsHelper(new CredentialTypes(loader));
		credentialsHelper.setCredentials({});
		return { nodeTypes: new NodeTypes(loader), credentialsHelper };
	})();
	return await engineComponentsPromise;
}

/**
 * Executes a workflow through the real n8n engine.
 *
 * - `input` becomes the trigger node's item; omitted → an empty item, like a manual run.
 * - Resolves to the last executed node's first item's `json`.
 * - A node error rejects with that error (`throw` mode — the n8n default `onError`).
 */
export async function runWorkflow(
	workflowJson: WorkflowJson,
	input: IDataObject = {},
): Promise<IDataObject> {
	const { nodeTypes, credentialsHelper } = await loadEngineComponents();

	const workflow = new Workflow({
		id: workflowJson.id ?? 'n8n-test',
		name: workflowJson.name,
		nodes: workflowJson.nodes.map(
			(node): INode => ({ ...node, position: [node.position[0], node.position[1]] }),
		),
		// Runtime-identical; only the JSON-widened literal types differ (see WorkflowJson).
		connections: workflowJson.connections as IConnections,
		nodeTypes,
		settings: workflowJson.settings as IWorkflowSettings | undefined,
		active: false,
	});

	const startNode = workflow.getStartNode();
	if (!startNode) throw new UnexpectedError('The workflow has no start node to run from');

	// PoC shortcut: the hooks only need the workflow's identity, not a persisted entity.
	const hooks = new ExecutionLifecycleHooks('trigger', 'n8n-test', mock<IWorkflowBase>());

	let resolveRun!: (run: IRun) => void;
	const runPromise = new Promise<IRun>((resolve) => {
		resolveRun = resolve;
	});
	hooks.addHandler('workflowExecuteAfter', (fullRunData) => resolveRun(fullRunData));

	// A mock proxy, as the in-repo NodeTestHarness does: the engine reads far more of
	// `additionalData` than a test cares about, and the proxy absorbs those reads.
	const additionalData = mock<IWorkflowExecuteAdditionalData>() as IWorkflowExecuteAdditionalData;
	additionalData.executionId = 'n8n-test';
	additionalData.credentialsHelper = credentialsHelper;
	additionalData.hooks = hooks;
	// Expression additional-keys build `$execution.resumeUrl` and friends from these.
	additionalData.webhookWaitingBaseUrl = 'http://localhost/waiting-webhook';
	additionalData.formWaitingBaseUrl = 'http://localhost/waiting-form';
	// These are read with truthiness checks: a truthy auto-mock diverts the engine into
	// code paths a test must not take (eval-mock helpers, encrypted runner credentials,
	// SSRF bridging, parent callbacks, resumed-execution handling) — null them all.
	for (const key of [
		'evalLlmMockHandler',
		'ssrfBridge',
		'encryptedRunnerIdentity',
		'currentNodeParameters',
		'parentCallbackManager',
		'restartExecutionId',
		'executionTimeoutTimestamp',
	]) {
		(additionalData as unknown as Record<string, unknown>)[key] = undefined;
	}

	const runExecutionData = createRunExecutionData({
		executionData: {
			waitingExecutionSource: null,
			nodeExecutionStack: [{ node: startNode, data: { main: [[{ json: input }]] }, source: null }],
		},
	});

	// `trigger`, not `manual`: in manual mode the engine *runs* the trigger node (a
	// ManualTrigger emits a fresh empty item), while any other mode passes the seeded
	// input through — and it mirrors how a published workflow actually executes.
	const workflowExecute = new WorkflowExecute(additionalData, 'trigger', runExecutionData);
	await workflowExecute.processRunExecutionData(workflow);
	const run = await runPromise;

	const { resultData } = run.data;
	if (resultData.error) throw resultData.error;

	const lastNodeExecuted = resultData.lastNodeExecuted;
	if (!lastNodeExecuted) throw new UnexpectedError('The workflow executed no nodes');

	const items = resultData.runData[lastNodeExecuted]?.at(-1)?.data?.main?.[0];
	return items?.[0]?.json ?? {};
}
