import { mockLogger } from '@n8n/backend-test-utils';
import type { LifecycleEvent } from '@n8n/engine';

import { ExecutionChannelReceiver } from '../execution-channel/execution-channel-receiver';
import { ExecutionChannelSender } from '../execution-channel/execution-channel-sender';
import { createInMemoryExecutionChannel } from '../execution-channel/in-memory-execution-channel';
import { createLifecycleEventCodec } from '../execution-channel/lifecycle-event-frame';
import { LifecycleEventChannelSender } from '../execution-channel/lifecycle-event-sender';

const at = '2026-10-29T10:00:00.000Z';

const stepStarted = (executionId: string, stepId: string, nodeName = 'Node 1'): LifecycleEvent => ({
	type: 'step:started',
	executionId,
	stepId,
	nodeId: 'node-1',
	nodeName,
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

const stepFailed = (
	executionId: string,
	stepId: string,
	error: Extract<LifecycleEvent, { type: 'step:failed' }>['error'],
): LifecycleEvent => ({
	type: 'step:failed',
	executionId,
	stepId,
	nodeId: 'node-1',
	nodeName: 'Node 1',
	iteration: 0,
	at,
	error,
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
		receiver: new ExecutionChannelReceiver(
			subscriber,
			createLifecycleEventCodec(logger, maxFrameBytes),
			logger,
		),
	};
};

const signal = new AbortController().signal;

describe('LifecycleEventChannelSender', () => {
	it('publishes each event in its own frame on the lifecycle channel of its execution', async () => {
		const { sender, publish } = setup();

		await sender.send(
			[stepStarted('exec-1', 'step-1'), stepStarted('exec-2', 'step-1'), completed('exec-1')],
			signal,
		);

		expect(publish.mock.calls).toEqual([
			['lifecycle', 'exec-1', JSON.stringify(stepStarted('exec-1', 'step-1'))],
			['lifecycle', 'exec-2', JSON.stringify(stepStarted('exec-2', 'step-1'))],
			['lifecycle', 'exec-1', JSON.stringify(completed('exec-1'))],
		]);
	});

	it('drops an event that exceeds the frame size limit and keeps the others', async () => {
		const { sender, publish, logger } = setup(512);
		const oversized = stepStarted('exec-1', 'step-1', 'x'.repeat(1000));

		await sender.send([stepStarted('exec-1', 'step-1'), oversized, completed('exec-1')], signal);

		expect(publish.mock.calls).toEqual([
			['lifecycle', 'exec-1', JSON.stringify(stepStarted('exec-1', 'step-1'))],
			['lifecycle', 'exec-1', JSON.stringify(completed('exec-1'))],
		]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Dropped a lifecycle event that exceeds the frame size limit',
			expect.objectContaining({ executionId: 'exec-1', type: 'step:started' }),
		);
	});

	it('sends a completed step that exceeds the frame size limit without its outputs', async () => {
		const { sender, publish } = setup(512);

		await sender.send([stepCompleted('exec-1', 'step-1', ['x'.repeat(1000)])], signal);

		const { outputs: _outputs, ...withoutOutputs } = stepCompleted(
			'exec-1',
			'step-1',
			[],
		) as Extract<LifecycleEvent, { type: 'step:completed' }>;
		expect(publish.mock.calls).toEqual([['lifecycle', 'exec-1', JSON.stringify(withoutOutputs)]]);
	});
});

describe('receiving lifecycle events', () => {
	it('delivers the events that the sender publishes for the execution', async () => {
		const { sender, receiver } = setup();
		const seen: LifecycleEvent[] = [];
		await receiver.receive('exec-1', (event) => seen.push(event));

		await sender.send(
			[stepStarted('exec-1', 'step-1'), stepStarted('exec-2', 'step-1'), completed('exec-1')],
			signal,
		);

		expect(seen).toEqual([stepStarted('exec-1', 'step-1'), completed('exec-1')]);
	});

	it('does not deliver frames from the responses topic', async () => {
		const { publisher, receiver } = setup();
		const handler = vi.fn();
		await receiver.receive('exec-1', handler);

		publisher.publish('responses', 'exec-1', JSON.stringify(completed('exec-1')));

		expect(handler).not.toHaveBeenCalled();
	});

	it('discards malformed and unreadable frames', async () => {
		const { publisher, receiver, logger } = setup();
		const handler = vi.fn();
		await receiver.receive('exec-1', handler);

		publisher.publish('lifecycle', 'exec-1', 'not JSON');
		publisher.publish('lifecycle', 'exec-1', JSON.stringify({ type: 'unknown' }));
		publisher.publish('lifecycle', 'exec-1', JSON.stringify({ events: [completed('exec-1')] }));

		expect(handler).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledTimes(3);
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
	it('serializes an event and reads it back', () => {
		const codec = createLifecycleEventCodec(mockLogger());
		const event = stepCompleted('exec-1', 'step-1', [[{ json: { a: 1 } }]]);

		const frameResult = codec.serialize(event);

		expect(codec.topic).toBe('lifecycle');
		expect(codec.executionIdOf(event)).toBe('exec-1');
		expect(frameResult).toEqual({ ok: true, frame: JSON.stringify(event) });
		expect(codec.deserialize(JSON.stringify(event))).toEqual({ ok: true, result: event });
	});

	it('has no frame for an event over the size limit', () => {
		const logger = mockLogger();
		const codec = createLifecycleEventCodec(logger, 512);
		const event = stepStarted('exec-1', 'step-1', 'x'.repeat(1000));

		const frameResult = codec.serialize(event);

		expect(frameResult.ok).toBe(false);
		expect(frameResult.frame).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith(
			'Dropped a lifecycle event that exceeds the frame size limit',
			expect.objectContaining({ executionId: 'exec-1', type: 'step:started' }),
		);
	});

	it('strips the outputs from a completed step over the size limit', () => {
		const logger = mockLogger();
		const codec = createLifecycleEventCodec(logger, 512);
		const event = stepCompleted('exec-1', 'step-1', ['x'.repeat(1000)]);
		const { outputs: _outputs, ...withoutOutputs } = event as Extract<
			LifecycleEvent,
			{ type: 'step:completed' }
		>;

		const frameResult = codec.serialize(event);

		expect(frameResult).toEqual({ ok: true, frame: JSON.stringify(withoutOutputs) });
		expect(codec.deserialize(frameResult.frame as string)).toEqual({
			ok: true,
			result: withoutOutputs,
		});
		expect(logger.debug).toHaveBeenCalledWith(
			'Sent a lifecycle event without its largest part: it exceeds the frame size limit',
			{
				executionId: 'exec-1',
				stepId: 'step-1',
				type: 'step:completed',
				bytes: Buffer.byteLength(JSON.stringify(event)),
			},
		);
	});

	it('still drops a completed step whose frame is over the size limit without outputs', () => {
		const logger = mockLogger();
		const codec = createLifecycleEventCodec(logger, 64);

		const frameResult = codec.serialize(stepCompleted('exec-1', 'step-1', ['x'.repeat(1000)]));

		expect(frameResult.ok).toBe(false);
		expect(logger.warn).toHaveBeenCalledWith(
			'Dropped a lifecycle event that exceeds the frame size limit',
			expect.objectContaining({ executionId: 'exec-1', type: 'step:completed' }),
		);
	});

	it('passes an event at the size limit unchanged', () => {
		const logger = mockLogger();
		const event = stepCompleted('exec-1', 'step-1', [[{ json: { a: 1 } }]]);
		const frame = JSON.stringify(event);
		const codec = createLifecycleEventCodec(logger, Buffer.byteLength(frame));

		expect(codec.serialize(event)).toEqual({ ok: true, frame });
		expect(logger.warn).not.toHaveBeenCalled();
		expect(logger.debug).not.toHaveBeenCalled();
	});

	it('sends a failed step without its error details when they push the frame over the limit', () => {
		const logger = mockLogger();
		const codec = createLifecycleEventCodec(logger, 512);
		const event = stepFailed('exec-1', 'step-1', {
			name: 'NodeApiError',
			message: 'boom',
			stack: 'at x',
			details: { context: { body: 'x'.repeat(1000) } },
		});

		const frameResult = codec.serialize(event);

		expect(codec.deserialize(frameResult.frame as string)).toEqual({
			ok: true,
			result: { ...event, error: { name: 'NodeApiError', message: 'boom', stack: 'at x' } },
		});
		expect(logger.debug).toHaveBeenCalledWith(
			'Sent a lifecycle event without its largest part: it exceeds the frame size limit',
			expect.objectContaining({ executionId: 'exec-1', type: 'step:failed' }),
		);
	});

	it('sheds the stack too when the details alone were not enough', () => {
		const codec = createLifecycleEventCodec(mockLogger(), 300);
		const event = stepFailed('exec-1', 'step-1', {
			name: 'Error',
			message: 'boom',
			stack: 'x'.repeat(1000),
			details: { a: 1 },
		});

		const frameResult = codec.serialize(event);

		expect(codec.deserialize(frameResult.frame as string)).toEqual({
			ok: true,
			result: { ...event, error: { name: 'Error', message: 'boom' } },
		});
	});

	it('still drops a failed step whose message alone is over the limit', () => {
		const codec = createLifecycleEventCodec(mockLogger(), 64);

		const frameResult = codec.serialize(
			stepFailed('exec-1', 'step-1', { name: 'Error', message: 'x'.repeat(1000) }),
		);

		expect(frameResult.ok).toBe(false);
	});

	it('makes the sender publish nothing for an event it cannot encode', () => {
		const { publisher } = createInMemoryExecutionChannel();
		const publish = vi.spyOn(publisher, 'publish');
		const sender = new ExecutionChannelSender(
			publisher,
			createLifecycleEventCodec(mockLogger(), 512),
		);

		const result = sender.send(stepStarted('exec-1', 'step-1', 'x'.repeat(1000)));

		expect(result.ok).toBe(false);
		expect(publish).not.toHaveBeenCalled();
	});
});
