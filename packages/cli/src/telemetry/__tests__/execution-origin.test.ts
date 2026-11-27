import type { INode, INodeTypes, IRunData, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import { getExecutionOrigin } from '../execution-origin';

const node = (name: string, type: string): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const scheduleTrigger = node('Schedule Trigger', 'n8n-nodes-base.scheduleTrigger');
const webhook = node('Webhook', 'n8n-nodes-base.webhook');
const wait = node('Wait', 'n8n-nodes-base.wait');
const editFields = node('Edit Fields', 'n8n-nodes-base.set');

const workflowData = {
	id: 'workflow-id',
	name: 'Workflow',
	active: true,
	activeVersionId: null,
	isArchived: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	nodes: [scheduleTrigger, webhook, wait, editFields],
	connections: {},
};

const runFrom = (
	startNode: INode,
	{ runData = {}, ...extra }: { runData?: IRunData } & Record<string, unknown> = {},
): IWorkflowExecutionDataProcess => ({
	executionMode: 'webhook',
	workflowData,
	executionData: createRunExecutionData({
		resultData: { runData },
		executionData: {
			nodeExecutionStack: [{ node: startNode, data: { main: [[{ json: {} }]] }, source: null }],
		},
		...extra,
	}),
});

const taskStartedAt = (startTime: number) => [
	{ startTime, executionTime: 1, executionIndex: 0, source: [] },
];

describe('getExecutionOrigin', () => {
	it('uses the trigger node that the run starts from', () => {
		expect(getExecutionOrigin(runFrom(webhook))).toEqual({
			triggerNodeType: 'n8n-nodes-base.webhook',
		});
	});

	it('returns nothing when the run starts from a node that is not a trigger node', () => {
		expect(getExecutionOrigin(runFrom(editFields))).toBeUndefined();
	});

	it('uses the trigger node in the saved run data when a run resumes or is retried', () => {
		const resumed = runFrom(wait, {
			runData: {
				Webhook: taskStartedAt(1000),
				'Schedule Trigger': taskStartedAt(2000),
				'Edit Fields': taskStartedAt(500),
			},
		});

		expect(getExecutionOrigin(resumed)).toEqual({ triggerNodeType: 'n8n-nodes-base.webhook' });
	});

	it('uses the trigger node that the user picked for a manual run', () => {
		const manualRun: IWorkflowExecutionDataProcess = {
			executionMode: 'manual',
			workflowData,
			triggerToStartFrom: { name: 'Schedule Trigger' },
		};

		expect(getExecutionOrigin(manualRun)).toEqual({
			triggerNodeType: 'n8n-nodes-base.scheduleTrigger',
		});
	});

	describe('manual run up to a node that names no trigger node', () => {
		// Both trigger nodes feed "Edit Fields", so the engine has to pick one.
		const connectedWorkflowData = {
			...workflowData,
			connections: {
				'Schedule Trigger': { main: [[{ node: 'Edit Fields', type: 'main' as const, index: 0 }]] },
				Webhook: { main: [[{ node: 'Edit Fields', type: 'main' as const, index: 0 }]] },
			},
		};
		const nodeTypes = {
			getByNameAndVersion: (type: string) => ({
				description: {
					name: type,
					group: type === editFields.type ? ['transform'] : ['trigger'],
					// A parameter with a default value, which a Workflow fills in on the nodes it gets.
					properties: [{ displayName: 'Mode', name: 'mode', type: 'string', default: 'manual' }],
				},
				...(type === scheduleTrigger.type ? { trigger: async () => undefined } : {}),
			}),
		} as unknown as INodeTypes;
		const runUpTo = (runData?: IRunData): IWorkflowExecutionDataProcess => ({
			executionMode: 'manual',
			workflowData: connectedWorkflowData,
			runData,
			destinationNode: { nodeName: 'Edit Fields', mode: 'inclusive' },
		});

		it('uses the trigger node whose output a partial run reuses', () => {
			const partialRun = runUpTo({ 'Schedule Trigger': taskStartedAt(1000) });

			expect(getExecutionOrigin(partialRun, nodeTypes)).toEqual({
				triggerNodeType: 'n8n-nodes-base.scheduleTrigger',
			});
		});

		it('uses the trigger node that the engine prefers when no run data is reused', () => {
			expect(getExecutionOrigin(runUpTo({}), nodeTypes)).toEqual({
				triggerNodeType: 'n8n-nodes-base.webhook',
			});
		});

		it('uses the start node that the engine picks for a run without run data', () => {
			expect(getExecutionOrigin(runUpTo(undefined), nodeTypes)).toEqual({
				triggerNodeType: 'n8n-nodes-base.scheduleTrigger',
			});
		});

		it('does not change the nodes of the run', () => {
			const run = runUpTo({});
			const nodesBefore = structuredClone(run.workflowData.nodes);

			getExecutionOrigin(run, nodeTypes);

			expect(run.workflowData.nodes).toEqual(nodesBefore);
		});

		it('returns nothing without node types', () => {
			expect(getExecutionOrigin(runUpTo({}))).toBeUndefined();
		});
	});

	it('sets the caller to agent when an agent started the run', () => {
		const run = runFrom(webhook, {
			parentAgentRun: {
				agentId: 'agent1',
				projectId: 'project1',
				threadId: 'thread1',
				runId: 'run1',
				toolCallId: 'toolCall1',
			},
		});

		expect(getExecutionOrigin(run)?.caller).toBe('agent');
	});

	it('sets the caller to workflow when a parent workflow started the run', () => {
		const run = runFrom(webhook, {
			parentExecution: { executionId: 'parent1', workflowId: 'parentWorkflow1' },
		});

		expect(getExecutionOrigin(run)?.caller).toBe('workflow');
	});

	it('keeps the caller that a public API endpoint set', () => {
		const manualRun: IWorkflowExecutionDataProcess = {
			executionMode: 'manual',
			workflowData,
			telemetryMetadata: { origin: { caller: 'public_api' } },
		};

		expect(getExecutionOrigin(manualRun)).toEqual({ caller: 'public_api' });
	});
});
