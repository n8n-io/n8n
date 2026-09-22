import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionResponse } from '@n8n/engine';

import { InMemoryExecutionResponseChannel } from '../response-channel/in-memory-execution-response-channel';
import { InMemoryExecutionResponseReceiver } from '../response-channel/in-memory-execution-response-receiver';
import { InMemoryExecutionResponseSender } from '../response-channel/in-memory-execution-response-sender';

const ended = (executionId = 'exec-1', outputs: unknown = null): ExecutionResponse => ({
	type: 'ended',
	executionId,
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: outputs as never },
});

describe('in-memory execution responses', () => {
	it('serializes a response before publishing it', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const publish = vi.spyOn(channel, 'publish');
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());

		sender.send(ended('exec-1', [[{ at: new Date(0) }]]));

		expect(publish).toHaveBeenCalledExactlyOnceWith(
			'exec-1',
			JSON.stringify(ended('exec-1', [[{ at: '1970-01-01T00:00:00.000Z' }]])),
		);
	});

	it('reports a response that exceeds the frame size limit', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const publish = vi.spyOn(channel, 'publish');
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger(), 256);

		sender.send(ended('exec-1', [['x'.repeat(500)]]));

		expect(publish).toHaveBeenCalledExactlyOnceWith(
			'exec-1',
			JSON.stringify({
				type: 'failure',
				executionId: 'exec-1',
				error: {
					code: 'RESPONSE_TOO_LARGE',
					message: 'The execution response exceeds the maximum size of 256 bytes.',
				},
			}),
		);
	});

	it('reports a response that cannot be serialized', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const publish = vi.spyOn(channel, 'publish');
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const response = ended() as ExecutionResponse & { circular?: unknown };
		response.circular = response;

		sender.send(response);

		expect(publish).toHaveBeenCalledExactlyOnceWith(
			'exec-1',
			JSON.stringify({
				type: 'failure',
				executionId: 'exec-1',
				error: {
					code: 'RESPONSE_SERIALIZATION_FAILED',
					message: 'The execution response could not be serialized.',
				},
			}),
		);
	});

	it('validates a response before delivering it', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		receiver.receive('exec-1', (response) => seen.push(response));

		channel.publish('exec-1', JSON.stringify(ended()));

		expect(seen).toEqual([ended()]);
	});

	it('discards malformed and unreadable responses', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		receiver.receive('exec-1', (response) => seen.push(response));

		channel.publish('exec-1', '{"type":"nonsense"}');
		channel.publish('exec-1', 'not json at all');

		expect(seen).toEqual([]);
	});

	it('isolates a handler that throws', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		receiver.receive('exec-1', () => {
			throw new Error('boom');
		});

		expect(() => channel.publish('exec-1', JSON.stringify(ended()))).not.toThrow();
	});

	it('delivers a response to every handler for that execution', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const first: ExecutionResponse[] = [];
		const second: ExecutionResponse[] = [];
		receiver.receive('exec-1', (response) => first.push(response));
		receiver.receive('exec-1', (response) => second.push(response));

		sender.send(ended());

		expect(first).toEqual([ended()]);
		expect(second).toEqual(first);
	});

	it('does not deliver a response to another execution', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		receiver.receive('exec-1', (response) => seen.push(response));

		sender.send(ended('exec-2'));

		expect(seen).toEqual([]);
	});

	it('stops delivery after the handler is removed', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		const unsubscribe = receiver.receive('exec-1', (response) => seen.push(response));

		unsubscribe();
		sender.send(ended());

		expect(seen).toEqual([]);
	});

	it('stops publishing through the sender', async () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const seen: string[] = [];
		channel.subscribe('exec-1', (frame) => seen.push(frame));

		await sender.stop();
		sender.send(ended());

		expect(seen).toEqual([]);
	});

	it('stops delivery through the receiver', async () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		receiver.receive('exec-1', (response) => seen.push(response));

		await receiver.stop();
		sender.send(ended());

		expect(seen).toEqual([]);
	});
});
