import { AGENT_QUEUE_DISPATCH_CAPABILITY, AGENT_TURNS_CAPABILITY } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { InstanceRegistryProxyService } from '@n8n/backend-services';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentChatResumeService } from '../agent-chat-resume.service';
import type { AgentMessageQueueConsumer } from '../agent-message-queue-consumer.service';
import { AgentQueueLifecycle } from '../queue/agent-queue-lifecycle.service';
import type { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue, AgentTurnJobHandlers } from '../queue/agent-turn-queue.service';

describe('AgentQueueLifecycle', () => {
	const turnQueue = mock<AgentTurnQueue>();
	const consumer = mock<AgentMessageQueueConsumer>();
	const chatResume = mock<AgentChatResumeService>();
	let registry: InstanceRegistryProxyService;
	const refreshRegistration = vi.fn(async () => {});

	function setup(placement: Partial<AgentTurnPlacement>) {
		return new AgentQueueLifecycle(
			mock<AgentTurnPlacement>(placement),
			turnQueue,
			consumer,
			chatResume,
			registry,
			{ workerConcurrency: 3 } as AgentsConfig,
			mockLogger(),
		);
	}

	beforeEach(() => {
		vi.resetAllMocks();
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
		expect(chatResume.runRequest).toHaveBeenCalledWith('request');
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
