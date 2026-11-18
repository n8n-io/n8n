
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

import { createMockNodeType, getNodeMocks, MOCK_NODE_TYPE, withMockNodeType } from './mock-node';

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

	// Nodes mocked via mockNode() get their type swapped for the in-process stand-in;
	// everything else resolves to the real implementation.
	const mocks = getNodeMocks(workflowJson);
	const effectiveNodeTypes = mocks?.size
		? withMockNodeType(nodeTypes, createMockNodeType(mocks))
		: nodeTypes;

	const workflow = new Workflow({
		id: workflowJson.id ?? 'n8n-test',
		name: workflowJson.name,
		nodes: workflowJson.nodes.map(
			(node): INode => ({
				...node,
				position: [node.position[0], node.position[1]],
				...(mocks?.has(node.name) ? { type: MOCK_NODE_TYPE, typeVersion: 1 } : {}),
			}),
		),
		// Runtime-identical; only the JSON-widened literal types differ (see WorkflowJson).
		connections: workflowJson.connections as IConnections,
		nodeTypes: effectiveNodeTypes,
		settings: workflowJson.settings as IWorkflowSettings | undefined,
		active: false,
	});

	const startNode = workflow.getStartNode();
	if (!startNode) throw new UnexpectedError('The workflow has no start node to run from');

	// PoC shortcut: the hooks only need the workflow's identity, not a persisted entity.
	const hooks = new ExecutionLifecycleHooks(
		'trigger',
		'n8n-test',
		{ id: workflowJson.id ?? 'n8n-test', name: workflowJson.name ?? 'n8n-test' } as IWorkflowBase,
	);

	let resolveRun!: (run: IRun) => void;
	const runPromise = new Promise<IRun>((resolve) => {
		resolveRun = resolve;
	});
	hooks.addHandler('workflowExecuteAfter', (fullRunData) => resolveRun(fullRunData));

	// A plain object, deliberately NOT a mock proxy: the engine reads many fields with
	// truthiness checks (eval-mock helpers, encrypted runner credentials, SSRF bridging,
	// resumed executions), and a truthy auto-mock diverts it into code paths a test must
	// not take. Everything not listed reads as undefined, which is what those guards expect.
	const additionalData = {
		executionId: 'n8n-test',
		credentialsHelper,
		hooks,
		// Expression additional-keys build `$execution.resumeUrl` and friends from these.
		webhookWaitingBaseUrl: 'http://localhost/waiting-webhook',
		formWaitingBaseUrl: 'http://localhost/waiting-form',
		webhookBaseUrl: 'http://localhost/webhook',
		webhookTestBaseUrl: 'http://localhost/webhook-test',
		restApiUrl: 'http://localhost/rest',
		instanceBaseUrl: 'http://localhost',
		variables: {},
		currentNodeExecutionIndex: 0,
		// Friendly refusals for engine capabilities a test harness cannot provide — without
		// these, nodes fail with raw TypeErrors ("... is not a function").
		executeWorkflow: () => {
			throw new UnexpectedError(
				'Sub-workflow execution is not supported by n8n-test — mock the node with mockNode() instead',
			);
		},
		startRunnerTask: () => {
			throw new UnexpectedError(
				'Task-runner nodes (e.g. the Code node) are not supported by n8n-test — mock them with mockNode() instead',
			);
		},
	} as unknown as IWorkflowExecuteAdditionalData;

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
