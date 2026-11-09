import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionResponse } from '@n8n/engine';
import { ENCODED_BUFFER_KEY } from 'n8n-core';

import { createExecutionResponseCodec } from '../response-channel/execution-response-frame';
import { ExecutionChannelReceiver } from '../response-channel/in-memory-execution-response-receiver';
import { ExecutionChannelSender } from '../response-channel/in-memory-execution-response-sender';
import { createInMemoryExecutionChannel } from '../response-channel/in-memory-execution-response-channel';

const ended = (executionId = 'exec-1', outputs: unknown = null): ExecutionResponse => ({
	type: 'ended',
	executionId,
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: outputs as never },
});

const setup = (maxFrameBytes?: number) => {
	const { publisher, subscriber } = createInMemoryExecutionChannel();
	const publish = vi.spyOn(publisher, 'publish');

	return {
		publisher,
		subscriber,
		publish,
		sender: new ExecutionChannelSender(
			publisher,
			createExecutionResponseCodec(mockLogger(), maxFrameBytes),
		),
		receiver: new ExecutionChannelReceiver(
			subscriber,
			createExecutionResponseCodec(mockLogger()),
			mockLogger(),
		),
	};
};

describe('ExecutionChannelSender', () => {
	it('serializes a response and publishes it on the responses topic', () => {
		const { sender, publish } = setup();

		const result = sender.send(ended('exec-1', [[{ at: new Date(0) }]]));

		expect(result.ok).toBe(true);
		expect(publish).toHaveBeenCalledExactlyOnceWith(
			'responses',
			'exec-1',
			JSON.stringify(ended('exec-1', [[{ at: '1970-01-01T00:00:00.000Z' }]])),
		);
	});

	it('reports a response that exceeds the frame size limit', () => {
		const { sender, publish } = setup(256);

		const result = sender.send(ended('exec-1', [['x'.repeat(500)]]));

		expect(result.ok).toBe(false);
		expect(publish).toHaveBeenCalledExactlyOnceWith(
			'responses',
			'exec-1',
			JSON.stringify({
				type: 'undeliverable',
				executionId: 'exec-1',
				error: {
					code: 'RESPONSE_TOO_LARGE',
					message: 'The execution response exceeds the maximum size of 256 bytes.',
				},
			}),
		);
	});

	it('reports a response that cannot be serialized', () => {
		const { sender, publish } = setup();
		const response = ended() as ExecutionResponse & { circular?: unknown };
		response.circular = response;

		const result = sender.send(response);

		expect(result.ok).toBe(false);
		expect(publish).toHaveBeenCalledExactlyOnceWith(
			'responses',
			'exec-1',
			JSON.stringify({
				type: 'undeliverable',
				executionId: 'exec-1',
				error: {
					code: 'RESPONSE_SERIALIZATION_FAILED',
					message: 'The execution response could not be serialized.',
				},
			}),
		);
	});

	it('refuses to send after it stops', async () => {
		const { sender, publish } = setup();

		await sender.stop();
		const result = sender.send(ended());

		expect(result.ok).toBe(false);
		expect(publish).not.toHaveBeenCalled();
	});
});

describe('ExecutionChannelReceiver', () => {
	it('delivers a base64 Buffer envelope unchanged', async () => {
		const { sender, receiver } = setup();
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));
		const payload = {
			body: { [ENCODED_BUFFER_KEY]: Buffer.from([0x00, 0xff, 0x10]).toString('base64') },
			headers: { 'content-type': 'application/octet-stream' },
			statusCode: 200,
		};

		sender.send({ type: 'response', executionId: 'exec-1', payload });

		expect(seen).toEqual([{ type: 'response', executionId: 'exec-1', payload }]);
	});

	it('validates a response before it delivers it', async () => {
		const { publisher, receiver } = setup();
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));

		publisher.publish('responses', 'exec-1', JSON.stringify(ended()));

		expect(seen).toEqual([ended()]);
	});

	it('discards malformed and unreadable responses', async () => {
		const { publisher, receiver } = setup();
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));

		publisher.publish('responses', 'exec-1', '{"type":"nonsense"}');
		publisher.publish('responses', 'exec-1', 'not json at all');

		expect(seen).toEqual([]);
	});

	it('isolates a handler that throws', async () => {
		const { publisher, receiver } = setup();
		await receiver.receive('exec-1', () => {
			throw new Error('boom');
		});

		expect(() => publisher.publish('responses', 'exec-1', JSON.stringify(ended()))).not.toThrow();
	});

	it('does not deliver frames from another topic', async () => {
		const { publisher, receiver } = setup();
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));

		publisher.publish('lifecycle', 'exec-1', JSON.stringify(ended()));

		expect(seen).toEqual([]);
	});

	it('does not deliver a response to another execution', async () => {
		const { sender, receiver } = setup();
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));

		sender.send(ended('exec-2'));

		expect(seen).toEqual([]);
	});

	it('stops delivery after the handler is removed', async () => {
		const { sender, receiver } = setup();
		const seen: ExecutionResponse[] = [];
		const unsubscribe = await receiver.receive('exec-1', (response) => seen.push(response));

		unsubscribe();
		sender.send(ended());

		expect(seen).toEqual([]);
	});

	it('stops delivery after it stops', async () => {
		const { sender, receiver } = setup();
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));

		await receiver.stop();
		sender.send(ended());

		expect(seen).toEqual([]);
	});
});
