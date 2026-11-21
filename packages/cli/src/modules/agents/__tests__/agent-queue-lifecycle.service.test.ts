import { AGENT_QUEUE_DISPATCH_CAPABILITY, AGENT_TURNS_CAPABILITY } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { InstanceRegistryProxyService } from '@n8n/backend-services';
import type { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AgentAppTurnService } from '../agent-app-turn.service';
import { AgentChatResumeService } from '../agent-chat-resume.service';
import type { AgentClusterService } from '../agent-cluster.service';
import type { AgentMessageQueueConsumer } from '../agent-message-queue-consumer.service';
import { AgentTaskService } from '../agent-task.service';
import { AgentWorkflowToolResumeService } from '../agent-workflow-tool-resume.service';
import { WebhookChannelService } from '../integrations/platforms/webhook/webhook-channel.service';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { AgentWakeService } from '../background/agent-wake.service';
import { AgentQueueLifecycle } from '../queue/agent-queue-lifecycle.service';
import { AgentQueueMetrics } from '../queue/agent-queue-metrics';
import { AgentWorkerCapacity } from '../queue/agent-worker-capacity.service';
import type { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue, AgentTurnJobHandlers } from '../queue/agent-turn-queue.service';
import type { QueuedTurnRunner } from '../queue/queued-turn-runner';
import type { QueuedTurnWorker } from '../queue/queued-turn-worker';

const turnHandlerOwners = [
	AgentChatResumeService,
	WebhookChannelService,
	AgentAppTurnService,
	AgentWorkflowToolResumeService,
	AgentTaskService,
	AgentWakeService,
];

describe('AgentQueueLifecycle', () => {
	const turnQueue = mock<AgentTurnQueue>();
	const consumer = mock<AgentMessageQueueConsumer>();
	const queuedTurns = mock<QueuedTurnRunner>();
	const queuedTurnWorker = mock<QueuedTurnWorker>();
	let getService: MockInstance<typeof Container.get>;
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
			queuedTurns,
			queuedTurnWorker,
			registry,
			{ workerConcurrency: 3 } as AgentsConfig,
			mockLogger(),
			capacity,
			backgroundJobs,
			new AgentQueueMetrics(),
		);
	}

	beforeEach(() => {
		vi.resetAllMocks();
		// The services that register request kinds are only built, never called.
		getService = vi.spyOn(Container, 'get').mockImplementation(() => ({}));
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
		expect(queuedTurns.removeStaleRequests).toHaveBeenCalledOnce();
		await leader.stop();

		queuedTurns.removeStaleRequests.mockClear();
		const follower = setup({ dispatchEnabled: true }, false);
		await follower.startOnMain();
		expect(queuedTurns.removeStaleRequests).not.toHaveBeenCalled();
		await follower.stop();
	});

	it('does nothing on a webhook process without agent queue mode', async () => {
		await setup({ ingressOnly: false }).startOnIngress();
		expect(turnQueue.init).not.toHaveBeenCalled();
		expect(registry.localCapabilities()).toEqual([]);
	});

	it('opens the queue on a webhook process, but pulls no job and runs no main work', async () => {
		vi.useFakeTimers();
		try {
			const lifecycle = setup({ ingressOnly: true });
			await lifecycle.startOnIngress();
			expect(turnQueue.init).toHaveBeenCalledOnce();
			expect(turnQueue.process).not.toHaveBeenCalled();
			expect(consumer.startOnWorker).not.toHaveBeenCalled();
			expect(queuedTurnWorker.startWorker).not.toHaveBeenCalled();
			vi.advanceTimersByTime(AgentQueueLifecycle.STALE_REQUEST_SWEEP_MS * 2);
			expect(queuedTurns.removeStaleRequests).not.toHaveBeenCalled();
			expect(registry.localCapabilities()).toEqual([AGENT_QUEUE_DISPATCH_CAPABILITY]);
			await lifecycle.stop();
			expect(registry.localCapabilities()).toEqual([]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('lets a failed queue open on a webhook process reach the caller', async () => {
		turnQueue.init.mockRejectedValueOnce(new Error('Redis unavailable'));
		await expect(setup({ ingressOnly: true }).startOnIngress()).rejects.toThrow(
			'Redis unavailable',
		);
		expect(registry.localCapabilities()).toEqual([]);
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
		expect(queuedTurnWorker.startWorker).toHaveBeenCalledOnce();
		expect(queuedTurnWorker.runJob).toHaveBeenCalledWith('request');
	});

	it.each([
		['main', async (lifecycle: AgentQueueLifecycle) => await lifecycle.startOnMain()],
		['worker', async (lifecycle: AgentQueueLifecycle) => await lifecycle.startOnWorker()],
	])('builds every service that registers request kinds on a %s', async (_role, start) => {
		await start(setup({ dispatchEnabled: false, runsTurnsOnWorker: false }));
		for (const owner of turnHandlerOwners) expect(getService).toHaveBeenCalledWith(owner);
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
