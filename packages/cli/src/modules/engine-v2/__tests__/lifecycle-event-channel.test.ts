import { mockLogger } from '@n8n/backend-test-utils';
import {
	MAX_LIFECYCLE_EVENTS_PER_BATCH,
	type LifecycleEvent,
	type LifecycleEventBatch,
} from '@n8n/engine';

import { ExecutionChannelReceiver } from '../execution-channel/execution-channel-receiver';
import { ExecutionChannelSender } from '../execution-channel/execution-channel-sender';
import { createInMemoryExecutionChannel } from '../execution-channel/in-memory-execution-channel';
import { createLifecycleEventCodec } from '../execution-channel/lifecycle-event-frame';
import { LifecycleEventChannelSender } from '../execution-channel/lifecycle-event-sender';

const at = '2026-10-29T10:00:00.000Z';

const stepStarted = (executionId: string, stepId: string): LifecycleEvent => ({
	type: 'step:started',
	executionId,
	stepId,
	nodeId: 'node-1',
	nodeName: 'Node 1',
	iteration: 0,
	at,
});

const stepCompleted = (
	executionId: string,
	stepId: string,
	outputs: unknown[],
): LifecycleEvent => ({
	type: 'step:completed',
	executionId,
	stepId,
	nodeId: 'node-1',
	nodeName: 'Node 1',
	iteration: 0,
	at,
	outputs: outputs as never,
});

const completed = (executionId: string): LifecycleEvent => ({
	type: 'execution:completed',
	executionId,
	workflowId: 'wf-1',
	at,
});

const setup = (maxFrameBytes?: number) => {
	const { publisher, subscriber } = createInMemoryExecutionChannel();
	const logger = mockLogger();

	return {
		logger,
		publisher,
		publish: vi.spyOn(publisher, 'publish'),
		sender: new LifecycleEventChannelSender(publisher, logger, maxFrameBytes),
		receiver: new ExecutionChannelReceiver(subscriber, createLifecycleEventCodec(logger), logger),
	};
};

const signal = new AbortController().signal;

describe('LifecycleEventChannelSender', () => {
	it('publishes the events of each execution on its own lifecycle channel, in order', async () => {
		const { sender, publish } = setup();

		await sender.send(
			[
				stepStarted('exec-1', 'step-1'),
				stepStarted('exec-2', 'step-1'),
				stepCompleted('exec-1', 'step-1', []),
				completed('exec-1'),
			],
			signal,
		);

		expect(publish).toHaveBeenCalledTimes(2);
		expect(publish).toHaveBeenNthCalledWith(
			1,
			'lifecycle',
			'exec-1',
			JSON.stringify({
				events: [
					stepStarted('exec-1', 'step-1'),
					stepCompleted('exec-1', 'step-1', []),
					completed('exec-1'),
				],
			}),
		);
		expect(publish).toHaveBeenNthCalledWith(
			2,
			'lifecycle',
			'exec-2',
			JSON.stringify({ events: [stepStarted('exec-2', 'step-1')] }),
		);
	});

	it('splits the events of one execution into frames that fit the size limit', async () => {
		const events = [
			stepCompleted('exec-1', 'step-1', ['x'.repeat(200)]),
			stepCompleted('exec-1', 'step-2', ['x'.repeat(200)]),
			stepCompleted('exec-1', 'step-3', ['x'.repeat(200)]),
		];
		const eventBytes = Buffer.byteLength(JSON.stringify(events[0]));
		// Room for two events and their separator, but not for three.
		const maxFrameBytes = '{"events":[]}'.length + 2 * eventBytes + 1;
		const { sender, publish } = setup(maxFrameBytes);

		await sender.send(events, signal);

		const frames = publish.mock.calls.map(([, , frame]) => frame);
		expect(frames).toEqual([
			JSON.stringify({ events: events.slice(0, 2) }),
			JSON.stringify({ events: events.slice(2) }),
		]);
		for (const frame of frames) expect(Buffer.byteLength(frame)).toBeLessThanOrEqual(maxFrameBytes);
	});

	it('splits a frame that would hold more events than a batch allows', async () => {
		const events = Array.from({ length: MAX_LIFECYCLE_EVENTS_PER_BATCH + 1 }, (_, i) =>
			stepStarted('exec-1', `step-${i}`),
		);
		const { sender, publish } = setup();

		await sender.send(events, signal);

		expect(publish).toHaveBeenCalledTimes(2);
		expect(JSON.parse(publish.mock.calls[0][2]).events).toHaveLength(
			MAX_LIFECYCLE_EVENTS_PER_BATCH,
		);
		expect(JSON.parse(publish.mock.calls[1][2]).events).toHaveLength(1);
	});

	it('drops an event that is larger than the size limit by itself and keeps the others', async () => {
		const { sender, publish, logger } = setup(512);

		await sender.send(
			[
				stepStarted('exec-1', 'step-1'),
				stepCompleted('exec-1', 'step-1', ['x'.repeat(1000)]),
				completed('exec-1'),
			],
			signal,
		);

		expect(publish).toHaveBeenCalledExactlyOnceWith(
			'lifecycle',
			'exec-1',
			JSON.stringify({ events: [stepStarted('exec-1', 'step-1'), completed('exec-1')] }),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Dropped a lifecycle event that exceeds the frame size limit',
			expect.objectContaining({ executionId: 'exec-1', type: 'step:completed' }),
		);
	});

	it('publishes nothing when every event is dropped', async () => {
		const { sender, publish } = setup(64);

		await sender.send([stepCompleted('exec-1', 'step-1', ['x'.repeat(1000)])], signal);

		expect(publish).not.toHaveBeenCalled();
	});
});

describe('receiving lifecycle events', () => {
	it('delivers the events that the sender publishes for the execution', async () => {
		const { sender, receiver } = setup();
		const seen: LifecycleEventBatch[] = [];
		await receiver.receive('exec-1', (batch) => seen.push(batch));

		await sender.send([stepStarted('exec-1', 'step-1'), stepStarted('exec-2', 'step-1')], signal);

		expect(seen).toEqual([{ events: [stepStarted('exec-1', 'step-1')] }]);
	});

	it('does not deliver frames from the responses topic', async () => {
		const { publisher, receiver } = setup();
		const handler = vi.fn();
		await receiver.receive('exec-1', handler);

		publisher.publish(
			'responses',
			'exec-1',
			JSON.stringify({ events: [stepStarted('exec-1', 'step-1')] }),
		);

		expect(handler).not.toHaveBeenCalled();
	});

	it('discards malformed and unreadable frames', async () => {
		const { publisher, receiver, logger } = setup();
		const handler = vi.fn();
		await receiver.receive('exec-1', handler);

		publisher.publish('lifecycle', 'exec-1', 'not JSON');
		publisher.publish('lifecycle', 'exec-1', JSON.stringify({ events: [] }));
		publisher.publish('lifecycle', 'exec-1', JSON.stringify({ events: [{ type: 'unknown' }] }));

		expect(handler).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledTimes(3);
	});

	it('discards a frame with events of more than one execution', async () => {
		const { publisher, receiver, logger } = setup();
		const handler = vi.fn();
		await receiver.receive('exec-1', handler);

		publisher.publish(
			'lifecycle',
			'exec-1',
			JSON.stringify({
				events: [stepStarted('exec-1', 'step-1'), stepStarted('exec-2', 'step-1')],
			}),
		);

		expect(handler).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledWith(
			'Discarding a lifecycle event frame with events of more than one execution',
			{ executionId: 'exec-1' },
		);
	});

	it('stops delivery after the subscriber leaves', async () => {
		const { sender, receiver } = setup();
		const handler = vi.fn();
		const unsubscribe = await receiver.receive('exec-1', handler);

		unsubscribe();
		await sender.send([completed('exec-1')], signal);

		expect(handler).not.toHaveBeenCalled();
	});
});

describe('createLifecycleEventCodec', () => {
	it('serializes a batch of one execution and reads it back', () => {
		const codec = createLifecycleEventCodec(mockLogger());
		const batch = { events: [stepStarted('exec-1', 'step-1'), completed('exec-1')] };

		const frameResult = codec.serialize(batch);

		expect(codec.topic).toBe('lifecycle');
		expect(codec.executionIdOf(batch)).toBe('exec-1');
		expect(frameResult).toEqual({ ok: true, frame: JSON.stringify(batch) });
		expect(codec.deserialize(JSON.stringify(batch))).toEqual({ ok: true, result: batch });
	});

	it.each([
		['no events', { events: [] }],
		['events of more than one execution', { events: [completed('exec-1'), completed('exec-2')] }],
		[
			'a frame over the size limit',
			{ events: [stepCompleted('exec-1', 'step-1', ['x'.repeat(1000)])] },
		],
	])('has no frame for a batch with %s', (_label, batch) => {
		const codec = createLifecycleEventCodec(mockLogger(), 512);

		const frameResult = codec.serialize(batch);

		expect(frameResult.ok).toBe(false);
		expect(frameResult.frame).toBeUndefined();
	});

	it('makes the sender publish nothing for a batch it cannot encode', () => {
		const { publisher } = createInMemoryExecutionChannel();
		const publish = vi.spyOn(publisher, 'publish');
		const sender = new ExecutionChannelSender(publisher, createLifecycleEventCodec(mockLogger()));

		const result = sender.send({ events: [completed('exec-1'), completed('exec-2')] });

		expect(result.ok).toBe(false);
		expect(publish).not.toHaveBeenCalled();
	});
});
