import { EngineConfig } from '@n8n/config';
import { UUID_V7_PATTERN } from '@n8n/constants';
import type {
	INode,
	IPinData,
	IRunData,
	ITaskData,
	ITaskDataConnections,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	StartNodeData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { NodeConnectionTypes, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import type { ResumableExecution } from '@/interfaces';
import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import type { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

const node = (id: string, name: string, type: string): INode => ({
	id,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const MANUAL_TRIGGER = node('trigger-id', 'When clicking Execute', 'n8n-nodes-base.manualTrigger');
const SET_NODE = node('set-id', 'Edit Fields', 'n8n-nodes-base.set');

function workflow(overrides: Partial<IWorkflowBase> = {}): IWorkflowBase {
	return {
		id: 'wf-1',
		name: 'My workflow',
		active: false,
		isArchived: false,
		activeVersionId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		nodes: [MANUAL_TRIGGER, SET_NODE],
		connections: {
			[MANUAL_TRIGGER.name]: {
				main: [[{ node: SET_NODE.name, type: NodeConnectionTypes.Main, index: 0 }]],
			},
		},
		settings: { engineType: 'v2' },
		...overrides,
	};
}

const taskData = (main: ITaskDataConnections['main']): ITaskData => ({
	startTime: 0,
	executionIndex: 0,
	executionTime: 0,
	source: [],
	data: { main },
});

function runData(
	overrides: Partial<IWorkflowExecutionDataProcess> = {},
): IWorkflowExecutionDataProcess {
	return {
		executionMode: 'manual',
		workflowData: workflow(),
		triggerToStartFrom: { name: MANUAL_TRIGGER.name },
		...overrides,
	};
}

describe('EngineV2Dispatcher', () => {
	const proxy = mock<EngineDataPlaneProxyService>();
	const credentialsPermissionChecker = mock<CredentialsPermissionChecker>();
	const pushRegistry = mock<EngineV2PushRegistry>();
	let engineConfig: EngineConfig;

	let dispatcher: EngineV2Dispatcher;

	beforeEach(() => {
		vi.clearAllMocks();
		proxy.isAvailable.mockReturnValue(true);
		proxy.startExecution.mockResolvedValue({ executionId: 'dp-uuid' });
		engineConfig = new EngineConfig();
		dispatcher = new EngineV2Dispatcher(
			proxy,
			credentialsPermissionChecker,
			pushRegistry,
			engineConfig,
		);
	});

	describe('routesToEngineV2', () => {
		it('routes a manual run of a workflow that opted into engine 2.0', () => {
			expect(dispatcher.routesToEngineV2(runData())).toBe(true);
		});

		it.each([
			{ name: 'no engineType', settings: {} },
			{ name: 'engineType v1', settings: { engineType: 'v1' as const } },
		])('does not route a workflow with $name', ({ settings }) => {
			const data = runData({ workflowData: workflow({ settings }) });

			expect(dispatcher.routesToEngineV2(data)).toBe(false);
		});

		it('routes a workflow with no engineType when the instance defaults to v2', () => {
			engineConfig.defaultEngineType = 'v2';
			const data = runData({ workflowData: workflow({ settings: {} }) });

			expect(dispatcher.routesToEngineV2(data)).toBe(true);
		});

		it('does not route a workflow pinned to v1 when the instance defaults to v2', () => {
			engineConfig.defaultEngineType = 'v2';
			const data = runData({ workflowData: workflow({ settings: { engineType: 'v1' } }) });

			expect(dispatcher.routesToEngineV2(data)).toBe(false);
		});

		it.each<WorkflowExecuteMode>(['webhook', 'trigger', 'retry', 'chat', 'evaluation'])(
			'does not route a %s run',
			(executionMode) => {
				expect(dispatcher.routesToEngineV2(runData({ executionMode }))).toBe(false);
			},
		);

		it('does not route a resumed execution', () => {
			const existingExecution = mock<ResumableExecution>({ executionId: '42' });

			expect(dispatcher.routesToEngineV2(runData(), existingExecution)).toBe(false);
		});
	});

	describe('start', () => {
		it('mints the execution id and sends it to the data plane', async () => {
			const executionId = await dispatcher.start(runData());

			expect(executionId).toMatch(UUID_V7_PATTERN);
			expect(proxy.startExecution).toHaveBeenCalledWith(
				expect.objectContaining({ executionId, workflowId: 'wf-1', mode: 'manual' }),
			);
		});

		it('converts the workflow to a graph', async () => {
			await dispatcher.start(runData());

			const { graph } = proxy.startExecution.mock.calls[0][0];
			expect(graph.nodes).toEqual([
				expect.objectContaining({
					id: MANUAL_TRIGGER.id,
					name: MANUAL_TRIGGER.name,
					type: 'trigger',
				}),
				expect.objectContaining({ id: SET_NODE.id, type: 'v1-node' }),
			]);
			expect(graph.edges).toEqual([
				{ from: MANUAL_TRIGGER.id, to: SET_NODE.id, outputIndex: 0, inputIndex: 0 },
			]);
		});

		it('converts only the branch of the selected manual trigger', async () => {
			const otherTrigger = node(
				'other-trigger-id',
				'When clicking Other Execute',
				'n8n-nodes-base.manualTrigger',
			);
			const otherSetNode = node('other-set-id', 'Other Edit Fields', 'n8n-nodes-base.set');
			const data = runData({
				workflowData: workflow({
					nodes: [MANUAL_TRIGGER, SET_NODE, otherTrigger, otherSetNode],
					connections: {
						[MANUAL_TRIGGER.name]: {
							main: [[{ node: SET_NODE.name, type: NodeConnectionTypes.Main, index: 0 }]],
						},
						[otherTrigger.name]: {
							main: [
								[
									{ node: SET_NODE.name, type: NodeConnectionTypes.Main, index: 0 },
									{ node: otherSetNode.name, type: NodeConnectionTypes.Main, index: 0 },
								],
							],
						},
					},
				}),
			});

			await dispatcher.start(data);

			const { graph } = proxy.startExecution.mock.calls[0][0];
			expect(graph.nodes).toEqual([
				expect.objectContaining({
					id: MANUAL_TRIGGER.id,
					name: MANUAL_TRIGGER.name,
					type: 'trigger',
				}),
				expect.objectContaining({ id: SET_NODE.id, type: 'v1-node' }),
			]);
			expect(graph.edges).toEqual([
				{ from: MANUAL_TRIGGER.id, to: SET_NODE.id, outputIndex: 0, inputIndex: 0 },
			]);
		});

		it('checks credential permissions before converting', async () => {
			const failure = new UserError('Node "X" uses invalid credential');
			credentialsPermissionChecker.check.mockRejectedValueOnce(failure);

			await expect(dispatcher.start(runData())).rejects.toThrow(failure);

			expect(credentialsPermissionChecker.check).toHaveBeenCalledWith('wf-1', [
				MANUAL_TRIGGER,
				SET_NODE,
			]);
			expect(proxy.startExecution).not.toHaveBeenCalled();
		});

		it.each([
			{ name: 'the selected trigger', triggerToStartFrom: { name: 'Schedule' } },
			{ name: 'the only trigger', triggerToStartFrom: undefined },
		])('rejects a production trigger, when it is $name', async ({ triggerToStartFrom }) => {
			const scheduleTrigger = node('sched-id', 'Schedule', 'n8n-nodes-base.scheduleTrigger');
			const data = runData({
				triggerToStartFrom,
				workflowData: workflow({ nodes: [scheduleTrigger, SET_NODE], connections: {} }),
			});

			await expect(dispatcher.start(data)).rejects.toThrow(
				'Engine 2.0 cannot run the "Schedule" trigger yet. Only the Manual Trigger is supported.',
			);
			expect(proxy.startExecution).not.toHaveBeenCalled();
		});

		it('lets the converter find the trigger when none was selected', async () => {
			await dispatcher.start(runData({ triggerToStartFrom: undefined }));

			const { graph } = proxy.startExecution.mock.calls[0][0];
			expect(graph.nodes).toEqual([
				expect.objectContaining({
					id: MANUAL_TRIGGER.id,
					name: MANUAL_TRIGGER.name,
					type: 'trigger',
				}),
				expect.objectContaining({ id: SET_NODE.id, type: 'v1-node' }),
			]);
		});

		describe('rejections', () => {
			it('reports the module being off first', async () => {
				proxy.isAvailable.mockReturnValue(false);
				// also unsupported, to prove the module check wins
				const data = runData({
					destinationNode: { nodeName: SET_NODE.name, mode: 'inclusive' as const },
				});

				await expect(dispatcher.start(data)).rejects.toThrow(
					'Engine 2.0 is not available. Enable the `engine-v2` module with N8N_ENABLED_MODULES.',
				);
			});

			it.each([
				{
					name: 'a partial execution',
					data: { runData: {} as IRunData },
					message:
						'Engine 2.0 cannot run a workflow from existing data yet. Run the whole workflow instead.',
				},
				{
					name: 'a destination node',
					data: { destinationNode: { nodeName: SET_NODE.name, mode: 'inclusive' as const } },
					message:
						'Engine 2.0 cannot run a workflow up to a single node yet. Run the whole workflow instead.',
				},
				{
					name: 'selected start nodes',
					data: { startNodes: [mock<StartNodeData>()] },
					message:
						'Engine 2.0 cannot start from selected nodes yet. Run the whole workflow instead.',
				},
				{
					name: 'an AI tool run',
					data: { agentRequest: { query: { [SET_NODE.name]: 'do it' }, tool: { name: 'tool' } } },
					message: 'Engine 2.0 cannot run a workflow as an AI tool yet.',
				},
				{
					name: 'pinned data on a non-trigger node',
					data: { pinData: { [SET_NODE.name]: [{ json: { pinned: true } }] } as IPinData },
					message:
						'Engine 2.0 does not support pinned data on "Edit Fields" yet. Unpin it to run this workflow.',
				},
			])('rejects $name', async ({ data, message }) => {
				const attempt = dispatcher.start(runData(data));

				await expect(attempt).rejects.toThrow(UserError);
				await expect(attempt).rejects.toThrow(message);
				expect(proxy.startExecution).not.toHaveBeenCalled();
			});
		});

		describe('triggerOutputs', () => {
			const startedWith = () => proxy.startExecution.mock.calls[0][0].triggerOutputs;

			it('defaults to one slot with one empty item', async () => {
				await dispatcher.start(runData());

				expect(startedWith()).toEqual([[{ json: {} }]]);
			});

			it('passes the trigger payload through', async () => {
				const data = runData({
					triggerToStartFrom: {
						name: MANUAL_TRIGGER.name,
						data: taskData([[{ json: { from: 'trigger' } }]]),
					},
				});

				await dispatcher.start(data);

				expect(startedWith()).toEqual([[{ json: { from: 'trigger' } }]]);
			});

			it('uses pinned data on the start trigger', async () => {
				const data = runData({
					pinData: { [MANUAL_TRIGGER.name]: [{ json: { from: 'pin' } }] } as IPinData,
				});

				await dispatcher.start(data);

				expect(startedWith()).toEqual([[{ json: { from: 'pin' } }]]);
			});

			it('prefers the trigger payload over pinned data for the same trigger', async () => {
				const data = runData({
					triggerToStartFrom: {
						name: MANUAL_TRIGGER.name,
						data: taskData([[{ json: { from: 'trigger' } }]]),
					},
					pinData: { [MANUAL_TRIGGER.name]: [{ json: { from: 'pin' } }] } as IPinData,
				});

				await dispatcher.start(data);

				expect(startedWith()).toEqual([[{ json: { from: 'trigger' } }]]);
			});

			it('collapses an empty slot to a dead edge', async () => {
				const data = runData({
					triggerToStartFrom: {
						name: MANUAL_TRIGGER.name,
						data: taskData([[]]),
					},
				});

				await dispatcher.start(data);

				expect(startedWith()).toEqual([null]);
			});

			it('sends null rather than an empty array when there are no slots', async () => {
				const data = runData({
					triggerToStartFrom: {
						name: MANUAL_TRIGGER.name,
						data: taskData([]),
					},
				});

				await dispatcher.start(data);

				expect(startedWith()).toBeNull();
			});
		});

		describe('the push session', () => {
			it('records the run against the minted execution id', async () => {
				const executionId = await dispatcher.start(runData({ pushRef: 'push-1' }));

				expect(pushRegistry.register).toHaveBeenCalledExactlyOnceWith(executionId, {
					pushRef: 'push-1',
					workflowId: 'wf-1',
					trigger: { nodeName: MANUAL_TRIGGER.name, outputs: [[{ json: {} }]] },
				});
			});

			it('records the run before it dispatches, so no event can arrive first', async () => {
				let registeredBeforeDispatch = false;
				proxy.startExecution.mockImplementationOnce(async ({ executionId }) => {
					registeredBeforeDispatch = pushRegistry.register.mock.calls.some(
						([id]) => id === executionId,
					);
					return { executionId };
				});

				await dispatcher.start(runData({ pushRef: 'push-1' }));

				expect(registeredBeforeDispatch).toBe(true);
			});

			it('records the trigger payload the engine was given', async () => {
				const data = runData({
					pushRef: 'push-1',
					triggerToStartFrom: {
						name: MANUAL_TRIGGER.name,
						data: taskData([[{ json: { from: 'trigger' } }]]),
					},
				});

				await dispatcher.start(data);

				expect(pushRegistry.register.mock.calls[0][1].trigger).toEqual({
					nodeName: MANUAL_TRIGGER.name,
					outputs: [[{ json: { from: 'trigger' } }]],
				});
			});

			it('records nothing when nothing is watching the run', async () => {
				await dispatcher.start(runData());

				expect(pushRegistry.register).not.toHaveBeenCalled();
			});

			it('releases the session when the data plane refused the run', async () => {
				proxy.startExecution.mockRejectedValueOnce(new Error('down'));

				await expect(dispatcher.start(runData({ pushRef: 'push-1' }))).rejects.toThrow('down');

				const [executionId] = pushRegistry.register.mock.calls[0];
				expect(pushRegistry.release).toHaveBeenCalledExactlyOnceWith(executionId);
			});
		});
	});
});
