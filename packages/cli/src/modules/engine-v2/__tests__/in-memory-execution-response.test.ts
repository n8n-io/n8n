import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionResponse } from '@n8n/engine';
import { ENCODED_BUFFER_KEY } from 'n8n-core';

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
		const channel = new InMemoryExecutionResponseChannel();
		const publish = vi.spyOn(channel, 'publish');
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const response = ended() as ExecutionResponse & { circular?: unknown };
		response.circular = response;

		sender.send(response);

		expect(publish).toHaveBeenCalledExactlyOnceWith(
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

	it('stamps the execution ID on a response from a step', () => {
		const channel = new InMemoryExecutionResponseChannel();
		const publish = vi.spyOn(channel, 'publish');
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());

		sender.emitterFor('exec-1').send({ ok: true });

		expect(publish).toHaveBeenCalledExactlyOnceWith(
			'exec-1',
			JSON.stringify({ type: 'response', executionId: 'exec-1', payload: { ok: true } }),
		);
	});

	it('delivers a base64 Buffer envelope unchanged', async () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));
		const payload = {
			body: { [ENCODED_BUFFER_KEY]: Buffer.from([0x00, 0xff, 0x10]).toString('base64') },
			headers: { 'content-type': 'application/octet-stream' },
			statusCode: 200,
		};

		sender.emitterFor('exec-1').send(payload);

		expect(seen).toEqual([{ type: 'response', executionId: 'exec-1', payload }]);
	});

	it('validates a response before delivering it', async () => {
		const channel = new InMemoryExecutionResponseChannel();
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));

		channel.publish('exec-1', JSON.stringify(ended()));

		expect(seen).toEqual([ended()]);
	});

	it('discards malformed and unreadable responses', async () => {
		const channel = new InMemoryExecutionResponseChannel();
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));

		channel.publish('exec-1', '{"type":"nonsense"}');
		channel.publish('exec-1', 'not json at all');

		expect(seen).toEqual([]);
	});

	it('isolates a handler that throws', async () => {
		const channel = new InMemoryExecutionResponseChannel();
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		await receiver.receive('exec-1', () => {
			throw new Error('boom');
		});

		expect(() => channel.publish('exec-1', JSON.stringify(ended()))).not.toThrow();
	});

	it('delivers a response to every handler for that execution', async () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const first: ExecutionResponse[] = [];
		const second: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => first.push(response));
		await receiver.receive('exec-1', (response) => second.push(response));

		sender.send(ended());

		expect(first).toEqual([ended()]);
		expect(second).toEqual(first);
	});

	it('does not deliver a response to another execution', async () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		await receiver.receive('exec-1', (response) => seen.push(response));

		sender.send(ended('exec-2'));

		expect(seen).toEqual([]);
	});

	it('stops delivery after the handler is removed', async () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());
		const seen: ExecutionResponse[] = [];
		const unsubscribe = await receiver.receive('exec-1', (response) => seen.push(response));

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
		await receiver.receive('exec-1', (response) => seen.push(response));

		await receiver.stop();
		sender.send(ended());

		expect(seen).toEqual([]);
	});
});
