import { AGENT_QUEUE_DISPATCH_CAPABILITY, AGENT_TURNS_CAPABILITY } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { InstanceRegistryProxyService } from '@n8n/backend-services';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentAppTurnService } from '../agent-app-turn.service';
import type { AgentChatResumeService } from '../agent-chat-resume.service';
import type { AgentClusterService } from '../agent-cluster.service';
import type { AgentMessageQueueConsumer } from '../agent-message-queue-consumer.service';
import type { AgentWorkflowToolResumeService } from '../agent-workflow-tool-resume.service';
import type { WebhookChannelService } from '../integrations/platforms/webhook/webhook-channel.service';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { AgentQueueLifecycle } from '../queue/agent-queue-lifecycle.service';
import { AgentQueueMetrics } from '../queue/agent-queue-metrics';
import { AgentWorkerCapacity } from '../queue/agent-worker-capacity.service';
import type { AgentRemoteTurnService } from '../queue/agent-remote-turn.service';
import type { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue, AgentTurnJobHandlers } from '../queue/agent-turn-queue.service';

describe('AgentQueueLifecycle', () => {
	const turnQueue = mock<AgentTurnQueue>();
	const consumer = mock<AgentMessageQueueConsumer>();
	const remoteTurns = mock<AgentRemoteTurnService>();
	let backgroundJobs: AgentBackgroundJobService;
	let capacity: AgentWorkerCapacity;
	let registry: InstanceRegistryProxyService;
	const refreshRegistration = vi.fn(async () => {});

	function setup(placement: Partial<AgentTurnPlacement>, isLeader = true) {
		return new AgentQueueLifecycle(
			mock<AgentTurnPlacement>(placement),
			mock<AgentClusterService>({ isLeader }),
			turnQueue,
			consumer,
			remoteTurns,
			registry,
			{ workerConcurrency: 3 } as AgentsConfig,
			mockLogger(),
			mock<AgentChatResumeService>(),
			mock<WebhookChannelService>(),
			mock<AgentAppTurnService>(),
			mock<AgentWorkflowToolResumeService>(),
			mock(),
			mock(),
			capacity,
			backgroundJobs,
			new AgentQueueMetrics(),
		);
	}

	beforeEach(() => {
		vi.resetAllMocks();
		backgroundJobs = mock<AgentBackgroundJobService>({ localRunCount: 0 });
		capacity = new AgentWorkerCapacity({ workerConcurrency: 3 } as AgentsConfig);
		registry = new InstanceRegistryProxyService();
		registry.registerProvider({
			getAllInstances: async () => [],
			getLocalInstance: () => null,
			refreshRegistration,
		});
	});

	it('does nothing on a main without the flag', async () => {
		await setup({ dispatchEnabled: false }).startOnMain();
		expect(turnQueue.init).not.toHaveBeenCalled();
		expect(registry.localCapabilities()).toEqual([]);
	});

	it('opens the queue and advertises dispatch on a main with the flag', async () => {
		await setup({ dispatchEnabled: true }).startOnMain();
		expect(turnQueue.init).toHaveBeenCalledOnce();
		expect(registry.localCapabilities()).toEqual([AGENT_QUEUE_DISPATCH_CAPABILITY]);
		expect(refreshRegistration).toHaveBeenCalledOnce();
	});

	it('removes stale turn requests only on the leader', async () => {
		const leader = setup({ dispatchEnabled: true }, true);
		await leader.startOnMain();
		expect(remoteTurns.removeStaleRequests).toHaveBeenCalledOnce();
		await leader.stop();

		remoteTurns.removeStaleRequests.mockClear();
		const follower = setup({ dispatchEnabled: true }, false);
		await follower.startOnMain();
		expect(remoteTurns.removeStaleRequests).not.toHaveBeenCalled();
		await follower.stop();
	});

	it('does nothing on a worker without the worker flag', async () => {
		await setup({ runsTurnsOnWorker: false }).startOnWorker();
		expect(turnQueue.process).not.toHaveBeenCalled();
		expect(consumer.startOnWorker).not.toHaveBeenCalled();
	});

	it('pulls agent jobs and advertises agent turns on a worker', async () => {
		await setup({ runsTurnsOnWorker: true }).startOnWorker();
		expect(consumer.startOnWorker).toHaveBeenCalledOnce();
		expect(turnQueue.process).toHaveBeenCalledWith(3, expect.any(Object));
		expect(registry.localCapabilities()).toEqual([AGENT_TURNS_CAPABILITY]);

		const handlers = turnQueue.process.mock.calls[0][1] as AgentTurnJobHandlers;
		await handlers.drain({ threadId: 'thread' });
		expect(consumer.drainForJob).toHaveBeenCalledWith('thread');
		await handlers.request({ requestId: 'request' });
		expect(remoteTurns.runRequest).toHaveBeenCalledWith('request');
	});

	it('stops pulling jobs while background sub-agents fill the worker', async () => {
		await setup({ runsTurnsOnWorker: true }).startOnWorker();
		const listener = vi.mocked(backgroundJobs.onLocalRunsChange).mock.calls[0][0];
		const handlers = turnQueue.process.mock.calls[0][1] as AgentTurnJobHandlers;

		let finishJob = () => {};
		consumer.drainForJob.mockImplementation(
			async () => await new Promise<void>((resolve) => (finishJob = resolve)),
		);
		const job = handlers.drain({ threadId: 'thread' });

		listener(2);
		expect(turnQueue.hold).toHaveBeenLastCalledWith(true);

		finishJob();
		await job;
		expect(turnQueue.hold).toHaveBeenLastCalledWith(false);
	});

	it('withdraws the capability on shutdown', async () => {
		const lifecycle = setup({ runsTurnsOnWorker: true });
		await lifecycle.startOnWorker();
		await lifecycle.stop();
		expect(registry.localCapabilities()).toEqual([]);
		expect(refreshRegistration).toHaveBeenCalledTimes(2);
	});

	it('keeps the capability when the first registry write fails', async () => {
		refreshRegistration.mockRejectedValueOnce(new Error('Redis unavailable'));
		await setup({ runsTurnsOnWorker: true }).startOnWorker();
		expect(registry.localCapabilities()).toEqual([AGENT_TURNS_CAPABILITY]);
	});
});
