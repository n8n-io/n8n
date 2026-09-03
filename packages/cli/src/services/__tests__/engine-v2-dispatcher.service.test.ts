import { UUID_V7_PATTERN } from '@n8n/constants';
import type {
	INode,
	INodeExecutionData,
	IPinData,
	IRunData,
	ITaskData,
	ITaskDataConnections,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	StartNodeData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { createRunExecutionData, NodeConnectionTypes, UserError } from 'n8n-workflow';
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
const WEBHOOK_TRIGGER = node('webhook-id', 'Webhook', 'n8n-nodes-base.webhook');
const SCHEDULE_TRIGGER = node('schedule-id', 'Schedule Trigger', 'n8n-nodes-base.scheduleTrigger');
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

/** What `prepareExecutionData` hands the dispatcher: the fired trigger's output. */
function webhookRunData(
	main: Array<INodeExecutionData[] | null> = [[{ json: { body: 'hi' } }]],
	overrides: Partial<IWorkflowExecutionDataProcess> = {},
): IWorkflowExecutionDataProcess {
	return {
		executionMode: 'webhook',
		workflowData: workflow({
			nodes: [WEBHOOK_TRIGGER, SET_NODE],
			connections: {
				[WEBHOOK_TRIGGER.name]: {
					main: [[{ node: SET_NODE.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		}),
		executionData: createRunExecutionData({
			executionData: {
				nodeExecutionStack: [{ node: WEBHOOK_TRIGGER, data: { main }, source: null }],
			},
		}),
		...overrides,
	};
}

/** What `WorkflowExecutionService.runWorkflow` hands the dispatcher for an active trigger. */
function triggerRunData(
	main: Array<INodeExecutionData[] | null> = [[{ json: { at: '2026-09-03T07:00:00.000Z' } }]],
	overrides: Partial<IWorkflowExecutionDataProcess> = {},
): IWorkflowExecutionDataProcess {
	return {
		executionMode: 'trigger',
		workflowData: workflow({
			nodes: [SCHEDULE_TRIGGER, SET_NODE],
			connections: {
				[SCHEDULE_TRIGGER.name]: {
					main: [[{ node: SET_NODE.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		}),
		executionData: createRunExecutionData({
			executionData: {
				nodeExecutionStack: [{ node: SCHEDULE_TRIGGER, data: { main }, source: null }],
			},
		}),
		...overrides,
	};
}

describe('EngineV2Dispatcher', () => {
	const proxy = mock<EngineDataPlaneProxyService>();
	const credentialsPermissionChecker = mock<CredentialsPermissionChecker>();
	const pushRegistry = mock<EngineV2PushRegistry>();

	let dispatcher: EngineV2Dispatcher;

	beforeEach(() => {
		vi.clearAllMocks();
		proxy.isAvailable.mockReturnValue(true);
		proxy.startExecution.mockResolvedValue({ executionId: 'dp-uuid' });
		dispatcher = new EngineV2Dispatcher(proxy, credentialsPermissionChecker, pushRegistry);
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

		it('routes a webhook run of a workflow that opted into engine 2.0', () => {
			expect(dispatcher.routesToEngineV2(webhookRunData())).toBe(true);
		});

		it('routes an active trigger run of a workflow that opted into engine 2.0', () => {
			expect(dispatcher.routesToEngineV2(triggerRunData())).toBe(true);
		});

		it.each<WorkflowExecuteMode>(['retry', 'chat', 'evaluation'])(
			'does not route a %s run',
			(executionMode) => {
				expect(dispatcher.routesToEngineV2(runData({ executionMode }))).toBe(false);
			},
		);

		it('answers the same question for a workflow and a mode alone', () => {
			expect(dispatcher.handlesWorkflow(workflow(), 'webhook')).toBe(true);
			expect(dispatcher.handlesWorkflow(workflow({ settings: {} }), 'webhook')).toBe(false);
			expect(dispatcher.handlesWorkflow(workflow(), 'trigger')).toBe(true);
			expect(dispatcher.handlesWorkflow(workflow({ settings: {} }), 'trigger')).toBe(false);
		});

		it('does not route a polled run, which hands `run` its own execution row', () => {
			const existingExecution = mock<ResumableExecution>({ executionId: '42' });

			expect(dispatcher.routesToEngineV2(triggerRunData(), existingExecution)).toBe(false);
		});

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

		describe('a webhook run', () => {
			it('starts a production run on the engine', async () => {
				const executionId = await dispatcher.start(webhookRunData());

				expect(proxy.startExecution).toHaveBeenCalledWith(
					expect.objectContaining({ executionId, workflowId: 'wf-1', mode: 'production' }),
				);
			});

			it('stays a manual run for a test webhook', async () => {
				await dispatcher.start(webhookRunData(undefined, { executionMode: 'manual' }));

				expect(proxy.startExecution.mock.calls[0][0].mode).toBe('manual');
			});

			it('roots the graph at the webhook node and makes it the trigger step', async () => {
				await dispatcher.start(webhookRunData());

				const { graph } = proxy.startExecution.mock.calls[0][0];
				expect(graph.nodes).toEqual([
					expect.objectContaining({
						id: WEBHOOK_TRIGGER.id,
						name: WEBHOOK_TRIGGER.name,
						type: 'trigger',
					}),
					expect.objectContaining({ id: SET_NODE.id, type: 'v1-node' }),
				]);
			});

			it('takes the payload from the webhook node output', async () => {
				await dispatcher.start(webhookRunData([[{ json: { body: 'hi' } }]]));

				expect(proxy.startExecution.mock.calls[0][0].triggerOutputs).toEqual([
					[{ json: { body: 'hi' } }],
				]);
			});

			it('keeps every output slot of a multi-method webhook', async () => {
				await dispatcher.start(webhookRunData([null, [{ json: { method: 'POST' } }]]));

				expect(proxy.startExecution.mock.calls[0][0].triggerOutputs).toEqual([
					null,
					[{ json: { method: 'POST' } }],
				]);
			});

			it('reports the webhook trigger to the editor', async () => {
				await dispatcher.start(webhookRunData(undefined, { pushRef: 'push-1' }));

				expect(pushRegistry.register.mock.calls[0][1].trigger).toEqual({
					nodeName: WEBHOOK_TRIGGER.name,
					outputs: [[{ json: { body: 'hi' } }]],
				});
			});

			it('prefers a named trigger over the seeded stack', async () => {
				const data = webhookRunData(undefined, {
					triggerToStartFrom: {
						name: MANUAL_TRIGGER.name,
						data: taskData([[{ json: { from: 'trigger' } }]]),
					},
					workflowData: workflow(),
				});

				await dispatcher.start(data);

				expect(proxy.startExecution.mock.calls[0][0].triggerOutputs).toEqual([
					[{ json: { from: 'trigger' } }],
				]);
			});

			it('ignores a seeded node that is not a trigger', async () => {
				const data = webhookRunData(undefined, {
					workflowData: workflow(),
					executionData: createRunExecutionData({
						executionData: {
							nodeExecutionStack: [
								{ node: SET_NODE, data: { main: [[{ json: { seeded: true } }]] }, source: null },
							],
						},
					}),
				});

				await dispatcher.start(data);

				expect(proxy.startExecution.mock.calls[0][0].triggerOutputs).toEqual([[{ json: {} }]]);
			});

			it('allows pinned data on the webhook trigger itself', async () => {
				const data = webhookRunData(undefined, {
					pinData: { [WEBHOOK_TRIGGER.name]: [{ json: { from: 'pin' } }] } as IPinData,
				});

				await expect(dispatcher.start(data)).resolves.toMatch(UUID_V7_PATTERN);
			});
		});

		describe('an active trigger run', () => {
			it('starts a production run on the engine', async () => {
				const executionId = await dispatcher.start(triggerRunData());

				expect(proxy.startExecution).toHaveBeenCalledWith(
					expect.objectContaining({ executionId, workflowId: 'wf-1', mode: 'production' }),
				);
			});

			it('roots the graph at the trigger node and makes it the trigger step', async () => {
				await dispatcher.start(triggerRunData());

				const { graph } = proxy.startExecution.mock.calls[0][0];
				expect(graph.nodes).toEqual([
					expect.objectContaining({
						id: SCHEDULE_TRIGGER.id,
						name: SCHEDULE_TRIGGER.name,
						type: 'trigger',
					}),
					expect.objectContaining({ id: SET_NODE.id, type: 'v1-node' }),
				]);
			});

			it('takes the payload from the trigger node output', async () => {
				await dispatcher.start(triggerRunData([[{ json: { at: 'now' } }]]));

				expect(proxy.startExecution.mock.calls[0][0].triggerOutputs).toEqual([
					[{ json: { at: 'now' } }],
				]);
			});

			it('registers no push session, because a production trigger run has no watcher', async () => {
				await dispatcher.start(triggerRunData());

				expect(pushRegistry.register).not.toHaveBeenCalled();
			});
		});

		describe('a trigger that establishes an identity', () => {
			const hookedTrigger = {
				...node('hooked-id', 'Stripe Trigger', 'n8n-nodes-base.stripeTrigger'),
				parameters: { contextEstablishmentHooks: { hooks: [{ hookName: 'HttpHeaderExtractor' }] } },
			};

			const hookedWorkflow = () =>
				workflow({
					nodes: [hookedTrigger, SET_NODE],
					connections: {
						[hookedTrigger.name]: {
							main: [[{ node: SET_NODE.name, type: NodeConnectionTypes.Main, index: 0 }]],
						},
					},
				});

			// The context hooks mask the secret in the trigger item. The v2 path returns
			// before they run, so the raw value would reach the data plane.
			it.each([
				{ name: 'named by the caller', triggerName: hookedTrigger.name },
				{ name: 'the only trigger', triggerName: undefined },
			])('is refused when it is $name', async ({ triggerName }) => {
				const data = runData({
					workflowData: hookedWorkflow(),
					triggerToStartFrom: triggerName ? { name: triggerName } : undefined,
				});

				await expect(dispatcher.start(data)).rejects.toThrow(
					'Engine 2.0 cannot run the "Stripe Trigger" trigger yet, because it takes credentials from the request.',
				);
				expect(proxy.startExecution).not.toHaveBeenCalled();
			});

			it('is refused on the webhook path too', async () => {
				const data = webhookRunData(undefined, {
					workflowData: workflow({
						nodes: [{ ...WEBHOOK_TRIGGER, parameters: { authentication: 'n8nOAuth2' } }, SET_NODE],
						connections: {},
					}),
				});

				await expect(dispatcher.start(data)).rejects.toThrow(
					'because it takes credentials from the request',
				);
			});

			it('allows a trigger that configures no hooks', async () => {
				await expect(dispatcher.start(webhookRunData())).resolves.toMatch(UUID_V7_PATTERN);
			});
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
