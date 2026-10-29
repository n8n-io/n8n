/**
 * Live progress of an engine v2 manual run (CET-553).
 *
 * The data plane publishes lifecycle events on the execution channel. The
 * control plane subscribes for the runs that an editor watches and relays the
 * events as push messages. This test uses the in-memory channel of in-process
 * mode and a fake data plane that publishes events when a run starts.
 */

import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { LifecycleEvent, StartExecutionRequest } from '@n8n/engine';
import type { INode, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { MANUAL_TRIGGER_NODE_TYPE, NodeConnectionTypes } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { Logger } from '@n8n/backend-common';

import { EngineV2LifecycleSubscriptions } from '@/modules/engine-v2/engine-lifecycle-event-subscriptions';
import { createInMemoryExecutionChannel } from '@/modules/engine-v2/execution-channel/in-memory-execution-channel';
import { ExecutionChannelReceiver } from '@/modules/engine-v2/execution-channel/execution-channel-receiver';
import { createLifecycleEventCodec } from '@/modules/engine-v2/execution-channel/lifecycle-event-frame';
import { LifecycleEventChannelSender } from '@/modules/engine-v2/execution-channel/lifecycle-event-sender';
import { Push } from '@/push';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from './shared/db/users';
import { initNodeTypes, setupTestServer } from './shared/utils';

mockInstance(Telemetry);

setupTestServer({ endpointGroups: ['workflows'] });

const TRIGGER_NAME = 'When clicking Execute';
const SET_NAME = 'Edit Fields';
const at = '2026-10-29T10:00:00.000Z';

const startExecution = vi.fn();
let lifecycleEventSender: LifecycleEventChannelSender;
let owner: User;

const manualTrigger = (): INode => ({
	id: randomUUID(),
	name: TRIGGER_NAME,
	type: MANUAL_TRIGGER_NODE_TYPE,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const setNode = (): INode => ({
	id: randomUUID(),
	name: SET_NAME,
	type: 'n8n-nodes-base.set',
	typeVersion: 3.4,
	position: [220, 0],
	parameters: { options: {} },
});

/** The events the data plane publishes for a run of the trigger and one Set node. */
const runEvents = (
	executionId: string,
	workflowId: string,
	setNodeId: string,
): LifecycleEvent[] => [
	{ type: 'execution:started', executionId, workflowId, at, mode: 'manual', hostMode: 'manual' },
	{
		type: 'step:started',
		executionId,
		stepId: 'step-1',
		nodeId: setNodeId,
		nodeName: SET_NAME,
		iteration: 0,
		at,
	},
	{
		type: 'step:completed',
		executionId,
		stepId: 'step-1',
		nodeId: setNodeId,
		nodeName: SET_NAME,
		iteration: 0,
		at,
		outputs: [[{ json: { done: true } }]],
	},
	{ type: 'execution:completed', executionId, workflowId, at },
];

const manualRun = async (pushRef?: string) => {
	const workflow = await createWorkflow(
		{
			active: false,
			nodes: [manualTrigger(), setNode()],
			connections: {
				[TRIGGER_NAME]: { main: [[{ node: SET_NAME, type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			settings: { engineType: 'v2' },
		},
		owner,
	);
	const data: IWorkflowExecutionDataProcess = {
		executionMode: 'manual',
		workflowData: workflow,
		userId: owner.id,
		pushRef,
		triggerToStartFrom: { name: TRIGGER_NAME },
	};

	return { workflow, executionId: await Container.get(WorkflowRunner).run(data) };
};

/** The test server replaces `Push` with a mock. */
const pushSend = () => vi.mocked(Container.get(Push).send);

const sentMessages = () =>
	pushSend().mock.calls.map(([message, pushRef]) => ({ message, pushRef }));

beforeAll(async () => {
	await initNodeTypes();

	// `EngineV2Module.init` wires both endpoints at boot. This test does not load
	// the module, so it wires the same in-memory channel by hand.
	const logger = Container.get(Logger);
	const { publisher, subscriber } = createInMemoryExecutionChannel();
	Container.get(EngineV2LifecycleSubscriptions).useReceiver(
		new ExecutionChannelReceiver(subscriber, createLifecycleEventCodec(logger), logger),
	);
	lifecycleEventSender = new LifecycleEventChannelSender(publisher, logger);

	Container.get(EngineDataPlaneProxyService).registerProvider({
		startExecution,
		getExecution: vi.fn(),
		searchExecutions: vi.fn(),
		findLatestExecution: vi.fn(),
		cancelExecution: vi.fn(),
		locateResumeTarget: vi.fn(),
		resolveStep: vi.fn(),
	});
});

beforeEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'SharedWorkflow', 'WorkflowEntity']);
	vi.clearAllMocks();

	// The fake data plane runs the whole workflow while it accepts the start.
	startExecution.mockImplementation(async (request: StartExecutionRequest) => {
		const setNodeId = request.graph.nodes.find((n) => n.name === SET_NAME)!.id;
		await lifecycleEventSender.send(
			runEvents(request.executionId, request.workflowId, setNodeId),
			new AbortController().signal,
		);
		return { executionId: request.executionId };
	});

	owner = await createOwner();
});

describe('lifecycle events of engine v2 runs', () => {
	test('relays the progress of a watched manual run to its editor', async () => {
		const { workflow, executionId } = await manualRun('push-1');

		expect(sentMessages()).toEqual([
			{
				message: expect.objectContaining({
					type: 'nodeExecuteBefore',
					data: expect.objectContaining({ executionId, nodeName: TRIGGER_NAME }),
				}),
				pushRef: 'push-1',
			},
			{
				message: expect.objectContaining({
					type: 'nodeExecuteAfter',
					data: expect.objectContaining({ executionId, nodeName: TRIGGER_NAME }),
				}),
				pushRef: 'push-1',
			},
			expect.objectContaining({
				message: expect.objectContaining({ type: 'nodeExecuteAfterData' }),
			}),
			{
				message: expect.objectContaining({
					type: 'nodeExecuteBefore',
					data: expect.objectContaining({ executionId, nodeName: SET_NAME }),
				}),
				pushRef: 'push-1',
			},
			{
				message: expect.objectContaining({
					type: 'nodeExecuteAfter',
					data: expect.objectContaining({ executionId, nodeName: SET_NAME }),
				}),
				pushRef: 'push-1',
			},
			expect.objectContaining({
				message: expect.objectContaining({ type: 'nodeExecuteAfterData' }),
			}),
			{
				message: {
					type: 'executionFinished',
					data: { executionId, workflowId: workflow.id, status: 'success' },
				},
				pushRef: 'push-1',
			},
		]);
		// The terminal event ends the session, and the subscription with it.
		expect(Container.get(EngineV2PushRegistry).get(executionId)).toBeUndefined();
	});

	test('stops relaying once the run has finished', async () => {
		const { workflow, executionId } = await manualRun('push-1');
		pushSend().mockClear();

		await lifecycleEventSender.send(
			[{ type: 'execution:completed', executionId, workflowId: workflow.id, at }],
			new AbortController().signal,
		);

		expect(pushSend()).not.toHaveBeenCalled();
	});

	test('sends nothing for a run that no editor watches', async () => {
		await manualRun();

		expect(pushSend()).not.toHaveBeenCalled();
	});
});
