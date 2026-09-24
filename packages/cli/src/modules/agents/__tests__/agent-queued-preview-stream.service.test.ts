import { mockLogger } from '@n8n/backend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { Redis } from 'ioredis';
import type { InstanceSettings } from 'n8n-core';
import { EventEmitter } from 'node:events';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { Subscriber } from '@/scaling/pubsub/subscriber.service';

import { AgentQueuedPreviewStreamService } from '../agent-queued-preview-stream.service';
import type { initSseStream } from '../agent-sse-stream';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentMessageQueue } from '../entities/agent-message-queue.entity';
import type { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';

describe('AgentQueuedPreviewStreamService', () => {
	const publisher = mock<Publisher>();
	const subscriber = mock<Subscriber>();
	const publisherClient = mock<Redis>({ status: 'ready' });
	const subscriberClient = mock<Redis>();
	let publisherEvents: EventEmitter;
	let subscriberEvents: EventEmitter;
	const repository = mock<AgentMessageQueueRepository>();
	let service: AgentQueuedPreviewStreamService;
	let stream: ReturnType<typeof initSseStream>;

	beforeEach(() => {
		vi.resetAllMocks();
		publisherEvents = new EventEmitter();
		subscriberEvents = new EventEmitter();
		publisher.getClient.mockReturnValue(publisherClient);
		subscriber.getClient.mockReturnValue(subscriberClient);
		publisherClient.on.mockImplementation((event, listener) => {
			publisherEvents.on(event, listener);
			return publisherClient;
		});
		subscriberClient.on.mockImplementation((event, listener) => {
			subscriberEvents.on(event, listener);
			return subscriberClient;
		});
		service = new AgentQueuedPreviewStreamService(
			publisher,
			mock<InstanceSettings>({ isMultiMain: true }),
			repository,
			mockLogger(),
			subscriber,
		);
		stream = mock<ReturnType<typeof initSseStream>>({ abortSignal: new AbortController().signal });
	});

	afterEach(() => vi.useRealTimers());

	it('forwards remote SSE events once and closes on a missing sequence', async () => {
		const subscription = service.subscribe('queue', stream);
		const event = { type: 'text-delta', id: 'text', delta: 'reply' } as const;
		service.handleRelay({ queueId: 'queue', sequence: 1, event });
		service.handleRelay({ queueId: 'queue', sequence: 1, event });
		expect(stream.send).toHaveBeenCalledExactlyOnceWith(event);
		service.handleRelay({ queueId: 'queue', sequence: 3, event });
		await subscription.done;
		expect(stream.close).toHaveBeenCalledOnce();
	});

	it('keeps an uncommitted listener open and closes it after recovered termination', async () => {
		vi.useFakeTimers();
		const subscription = service.subscribe('queue', stream);
		await service.closeSettledStreams();
		expect(repository.findDeliveryState).not.toHaveBeenCalled();
		subscription.accepted();
		repository.findDeliveryState.mockResolvedValue(
			mock<AgentMessageQueue>({ execution: null, executionId: null }),
		);
		await service.closeSettledStreams();
		expect(stream.close).not.toHaveBeenCalled();
		repository.findDeliveryState.mockResolvedValue(
			mock<AgentMessageQueue>({ execution: mock<AgentExecution>({ status: 'interrupted' }) }),
		);
		await service.closeSettledStreams();
		expect(stream.close).not.toHaveBeenCalled();
		vi.advanceTimersByTime(10_000);
		await service.closeSettledStreams();
		await subscription.done;
		expect(stream.close).toHaveBeenCalledOnce();
	});

	it.each(['terminal execution', 'removed queue item'])(
		'delivers final events after settlement with a %s',
		async (state) => {
			vi.useFakeTimers();
			const subscription = service.subscribe('queue', stream);
			subscription.accepted();
			repository.findDeliveryState.mockResolvedValue(
				state === 'terminal execution'
					? mock<AgentMessageQueue>({ execution: mock<AgentExecution>({ status: 'success' }) })
					: null,
			);
			await service.closeSettledStreams();
			expect(stream.close).not.toHaveBeenCalled();
			vi.advanceTimersByTime(9_000);
			service.handleRelay({
				queueId: 'queue',
				sequence: 1,
				event: { type: 'text-delta', id: 'text', delta: 'reply' },
			});
			await service.closeSettledStreams();
			vi.advanceTimersByTime(1_000);
			await service.closeSettledStreams();
			expect(stream.close).not.toHaveBeenCalled();
			const done = { type: 'done', sessionId: 'session', executionId: 'execution' } as const;
			service.handleRelay({ queueId: 'queue', sequence: 2, event: done });
			service.handleRelay({ queueId: 'queue', sequence: 3, event: null });
			await subscription.done;
			expect(stream.send).toHaveBeenLastCalledWith(done);
			expect(stream.close).toHaveBeenCalledOnce();
		},
	);

	it('publishes ordered events and an end marker without changing SSE payloads', async () => {
		const sender = service.createSender('queue');
		const events = [
			{ type: 'text-delta', id: 'text', delta: 'reply' },
			{ type: 'done', sessionId: 'session', executionId: 'execution' },
		] as const;
		for (const event of events) sender.send(event);
		await sender.close();
		expect(publisher.publishCommand.mock.calls.map(([{ payload }]) => payload)).toEqual([
			{ queueId: 'queue', sequence: 1, event: events[0] },
			{ queueId: 'queue', sequence: 2, event: events[1] },
			{ queueId: 'queue', sequence: 3, event: null },
		]);
	});

	it('closes local delivery when the relay fails', async () => {
		publisher.publishCommand.mockRejectedValue(new Error('Redis unavailable'));
		const subscription = service.subscribe('queue', stream);
		const sender = service.createSender('queue');
		sender.send({ type: 'text-delta', id: 'text', delta: 'reply' });
		await subscription.done;
		await sender.close();
		expect(stream.close).toHaveBeenCalledOnce();
		expect(publisher.publishCommand).toHaveBeenCalledOnce();
	});

	it('closes remote delivery when the subscription is lost', async () => {
		const subscription = service.subscribe('queue', stream);
		subscriberEvents.emit('close');
		await subscription.done;
		expect(stream.close).toHaveBeenCalledOnce();
	});

	it('settles delivery when Redis retains an in-flight publish during a disconnect', async () => {
		const publish = createDeferredPromise();
		publisher.publishCommand.mockReturnValue(publish.promise);
		const subscription = service.subscribe('queue', stream);
		const sender = service.createSender('queue');
		sender.send({ type: 'text-delta', id: 'text', delta: 'reply' });
		await Promise.resolve();
		expect(publisher.publishCommand).toHaveBeenCalledOnce();
		publisherEvents.emit('close');
		await subscription.done;
		await sender.close();
		publish.resolve();
		expect(stream.close).toHaveBeenCalledOnce();
		expect(publisher.publishCommand).toHaveBeenCalledOnce();
	});
});
