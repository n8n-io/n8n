import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	ExecutionRepository,
	WorkflowRepository,
	ProjectRelationRepository,
	type IWorkflowDb,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import { InstanceSettings } from 'n8n-core';
import type { IExecuteData, INodeType, INodeTypes, IRunExecutionData } from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { EventMessageTypes as EventMessage } from '@/eventbus/event-message-classes';
import { EventMessageNode } from '@/eventbus/event-message-classes/event-message-node';
import { EventMessageWorkflow } from '@/eventbus/event-message-classes/event-message-workflow';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { createExecution } from '@test-integration/db/executions';

/**
 * N8N-292: a workflow whose last node crashes mid-run, where every node upstream
 * of it produced exactly one item. `NotifyLMS` reads `$('SetCourseData').item`.
 */
const CRASHING_SUBWORKFLOW_WORKFLOW: Partial<IWorkflowDb> = {
	nodes: [
		{
			parameters: { httpMethod: 'POST', path: 'notify-team', options: {} },
			id: '11111111-1111-4111-8111-111111111111',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			webhookId: '22222222-2222-4222-8222-222222222222',
		},
		{
			parameters: {},
			id: '33333333-3333-4333-8333-333333333333',
			name: 'SetCourseData',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [220, 0],
		},
		{
			parameters: { mode: 'once' },
			id: '44444444-4444-4444-8444-444444444444',
			name: 'SaveProgress',
			type: 'n8n-nodes-base.executeWorkflow',
			typeVersion: 1.2,
			position: [440, 0],
		},
		{
			parameters: {
				workflowInputs: {
					value: {
						assessment_id: "={{ $('SetCourseData').item.json.assessment_id }}",
						usage_key: "={{ $('SetCourseData').item.json.usage_key }}",
					},
				},
				mode: 'once',
			},
			id: '55555555-5555-4555-8555-555555555555',
			name: 'NotifyLMS',
			type: 'n8n-nodes-base.executeWorkflow',
			typeVersion: 1.2,
			position: [660, 0],
		},
	],
	connections: {
		Webhook: { main: [[{ node: 'SetCourseData', type: NodeConnectionTypes.Main, index: 0 }]] },
		SetCourseData: { main: [[{ node: 'SaveProgress', type: NodeConnectionTypes.Main, index: 0 }]] },
		SaveProgress: { main: [[{ node: 'NotifyLMS', type: NodeConnectionTypes.Main, index: 0 }]] },
	},
	pinData: {},
};

/** Execution snapshot at the moment the instance dies inside `NotifyLMS`. */
const IN_PROGRESS_EXECUTION_DATA = {
	startData: {},
	resultData: {
		runData: {
			Webhook: [
				{
					hints: [],
					startTime: 1716138610000,
					executionTime: 1,
					executionIndex: 0,
					source: [],
					executionStatus: 'success',
					data: { main: [[{ json: { body: { x: 1 } }, pairedItem: { item: 0 } }]] },
				},
			],
			SetCourseData: [
				{
					hints: [],
					startTime: 1716138610100,
					executionTime: 1,
					executionIndex: 1,
					source: [{ previousNode: 'Webhook', previousNodeOutput: 0, previousNodeRun: 0 }],
					executionStatus: 'success',
					data: {
						main: [
							[
								{
									json: { assessment_id: 'ASSESS-1', usage_key: 'USAGE-1' },
									pairedItem: { item: 0 },
								},
							],
						],
					},
				},
			],
			SaveProgress: [
				{
					hints: [],
					startTime: 1716138610200,
					executionTime: 1,
					executionIndex: 2,
					source: [{ previousNode: 'SetCourseData', previousNodeOutput: 0, previousNodeRun: 0 }],
					executionStatus: 'success',
					data: { main: [[{ json: { success: true }, pairedItem: { item: 0 } }]] },
				},
			],
		},
		lastNodeExecuted: 'SaveProgress',
	},
	executionData: {
		contextData: {},
		nodeExecutionStack: [],
		metadata: {},
		waitingExecution: {},
		waitingExecutionSource: {},
	},
};

const setupMessages = (executionId: string, workflowName: string): EventMessage[] => {
	const finished = ['Webhook', 'SetCourseData', 'SaveProgress'].flatMap((nodeName) => [
		new EventMessageNode({
			eventName: 'n8n.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName,
				nodeType: 'n8n-nodes-base.noOp',
				nodeId: '1',
			},
		}),
		new EventMessageNode({
			eventName: 'n8n.node.finished',
			payload: {
				executionId,
				workflowName,
				nodeName,
				nodeType: 'n8n-nodes-base.noOp',
				nodeId: '1',
			},
		}),
	]);

	return [
		new EventMessageWorkflow({ eventName: 'n8n.workflow.started', payload: { executionId } }),
		...finished,
		// `NotifyLMS` starts but never finishes - the instance dies here.
		new EventMessageNode({
			eventName: 'n8n.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName: 'NotifyLMS',
				nodeType: 'n8n-nodes-base.executeWorkflow',
				nodeId: '5',
			},
		}),
	];
};

/** Minimal node types - the expression engine only needs the graph shape here. */
const describeNode = (type: string): INodeType => ({
	description: {
		displayName: type,
		name: type,
		group: type === 'n8n-nodes-base.webhook' ? ['trigger'] : ['transform'],
		version: 1,
		description: '',
		defaults: {},
		inputs: type === 'n8n-nodes-base.webhook' ? [] : [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
});

const nodeTypes: INodeTypes = {
	getByName: describeNode,
	getByNameAndVersion: describeNode,
	getKnownTypes: () => ({}),
};

/**
 * Resolve an expression the way the editor NDV does for a node that has run data.
 * Mirrors `executeDataImpl()` in
 * packages/frontend/editor-ui/src/app/composables/useWorkflowHelpers.ts
 */
function resolveAsEditorWould(
	workflowData: Partial<IWorkflowDb>,
	runExecutionData: IRunExecutionData,
	activeNodeName: string,
	parentNodeName: string,
	expression: string,
) {
	const workflow = new Workflow({
		id: 'test',
		nodes: workflowData.nodes!,
		connections: workflowData.connections!,
		active: false,
		nodeTypes,
	});

	const runData = runExecutionData.resultData.runData;
	const parentTaskData = runData[parentNodeName][0];
	const activeTaskData = runData[activeNodeName][0];

	const executeData: IExecuteData = {
		node: workflow.getNode(activeNodeName)!,
		data: parentTaskData.data!,
		source: { main: activeTaskData.source },
	};

	return workflow.expression.getParameterValue(
		expression,
		runExecutionData,
		0,
		0,
		activeNodeName,
		parentTaskData.data!.main[0]!,
		'manual',
		{},
		executeData,
		false,
		{},
		activeNodeName,
	);
}

describe('ExecutionRecoveryService - paired item resolution after a crash (N8N-292)', () => {
	const push = mockInstance(Push);
	const instanceSettings = Container.get(InstanceSettings);
	const ownershipService = mockInstance(OwnershipService);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);
	mockInstance(ExternalHooks);
	mockInstance(ActiveWorkflowManager);
	mockInstance(WorkflowPublicationNotifier);

	let executionRecoveryService: ExecutionRecoveryService;

	beforeAll(async () => {
		await testDb.init();
		const globalConfig = Container.get(GlobalConfig);
		executionRecoveryService = new ExecutionRecoveryService(
			mock(),
			instanceSettings,
			push,
			Container.get(ExecutionRepository),
			Container.get(ExecutionPersistence),
			globalConfig.executions,
			Container.get(WorkflowRepository),
			mock(),
			ownershipService,
			projectRelationRepository,
		);
	});

	beforeEach(() => {
		instanceSettings.markAsLeader();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await testDb.truncate(['ExecutionEntity', 'ExecutionData', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('control: the same expression resolves while the execution is intact', () => {
		const value = resolveAsEditorWould(
			CRASHING_SUBWORKFLOW_WORKFLOW,
			{
				...IN_PROGRESS_EXECUTION_DATA,
				resultData: {
					...IN_PROGRESS_EXECUTION_DATA.resultData,
					runData: {
						...IN_PROGRESS_EXECUTION_DATA.resultData.runData,
						NotifyLMS: [
							{
								hints: [],
								startTime: 1716138610300,
								executionTime: 1,
								executionIndex: 3,
								source: [
									{ previousNode: 'SaveProgress', previousNodeOutput: 0, previousNodeRun: 0 },
								],
								executionStatus: 'success',
								data: { main: [[{ json: { ok: true }, pairedItem: { item: 0 } }]] },
							},
						],
					},
				},
			} as unknown as IRunExecutionData,
			'NotifyLMS',
			'SaveProgress',
			"={{ $('SetCourseData').item.json.assessment_id }}",
		);

		expect(value).toBe('ASSESS-1');
	});

	test('a crashed node must still resolve $(node).item when every node produced one item', async () => {
		const workflow = await createWorkflow(CRASHING_SUBWORKFLOW_WORKFLOW);
		const execution = await createExecution(
			{ status: 'running', data: stringify(IN_PROGRESS_EXECUTION_DATA) },
			workflow,
		);

		const amended = await executionRecoveryService.recoverFromLogs(
			execution.id,
			setupMessages(execution.id, workflow.name),
		);

		const runExecutionData = amended!.data;
		// Precondition: recovery marked `NotifyLMS` as crashed and gave it run data.
		expect(runExecutionData.resultData.runData.NotifyLMS[0].executionStatus).toBe('crashed');

		// Every node upstream of `NotifyLMS` emitted exactly one item, so the item
		// lineage back to `SetCourseData` is unambiguous and must resolve.
		const value = resolveAsEditorWould(
			CRASHING_SUBWORKFLOW_WORKFLOW,
			runExecutionData,
			'NotifyLMS',
			'SaveProgress',
			"={{ $('SetCourseData').item.json.assessment_id }}",
		);

		expect(value).toBe('ASSESS-1');
	});
});
