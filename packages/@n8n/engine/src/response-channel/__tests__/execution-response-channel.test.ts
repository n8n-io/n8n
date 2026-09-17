import { describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { ExecutionResponseChannel } from '../execution-response-channel';
import type { ExecutionResponse } from '../execution-response.types';
import { InMemoryResponseTransport } from '../in-memory-transport';
import type { ResponseTransport, Unsubscribe } from '../response-transport';

const silentLogger = (): EngineLogger => ({
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
});

const ended = (outputs: unknown, executionId = 'exec-1'): ExecutionResponse => ({
	type: 'ended',
	executionId,
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: outputs as never },
});

/** A transport that keeps its frames, so a test can see what crossed. */
class RecordingTransport implements ResponseTransport {
	readonly frames: string[] = [];

	private handler?: (frame: string) => void;

	publish(_executionId: string, frame: string): void {
		this.frames.push(frame);
		this.handler?.(frame);
	}

	subscribe(_executionId: string, handler: (frame: string) => void): Unsubscribe {
		this.handler = handler;

		return () => {
			this.handler = undefined;
		};
	}

	async stop(): Promise<void> {}
}

describe('ExecutionResponseChannel', () => {
	const newChannel = () =>
		new ExecutionResponseChannel(new InMemoryResponseTransport(), silentLogger());

	it('delivers a response to every subscriber of that execution', () => {
		const channel = newChannel();
		const first: ExecutionResponse[] = [];
		const second: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (r) => first.push(r));
		channel.subscribe('exec-1', (r) => second.push(r));

		channel.publish(ended([[{ json: { a: 1 } }]]));

		expect(first[0]).toMatchObject({
			type: 'ended',
			status: 'completed',
			lastStep: { nodeName: 'A', outputs: [[{ json: { a: 1 } }]] },
		});
		expect(second).toEqual(first);
	});

	it('tells one execution nothing about another', () => {
		const channel = newChannel();
		const seen: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (r) => seen.push(r));

		channel.publish(ended(null, 'exec-2'));

		expect(seen).toEqual([]);
	});

	it('stops delivering once the subscriber unsubscribes', () => {
		const channel = newChannel();
		const seen: ExecutionResponse[] = [];
		const unsubscribe = channel.subscribe('exec-1', (r) => seen.push(r));

		unsubscribe();
		channel.publish(ended(null));

		expect(seen).toEqual([]);
	});

	it('strips a value no transport could carry, rather than passing it live', () => {
		const channel = newChannel();
		const seen: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (r) => seen.push(r));

		// The channel always serializes, so a `Date` crosses as the ISO string
		// `JSON.stringify` gives it, never as the live object a subscriber could
		// otherwise get away with in-process.
		channel.publish(ended([[{ at: new Date(0) }]]));

		expect(seen[0]).toMatchObject({
			lastStep: { outputs: [[{ at: '1970-01-01T00:00:00.000Z' }]] },
		});
	});

	it('reports a response that exceeds the frame size limit', () => {
		const channel = new ExecutionResponseChannel(new RecordingTransport(), silentLogger(), 256);
		const seen: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (response) => seen.push(response));

		channel.publish(ended([['x'.repeat(500)]]));

		expect(seen).toEqual([
			{
				type: 'failure',
				executionId: 'exec-1',
				error: {
					code: 'RESPONSE_TOO_LARGE',
					message: 'The execution response exceeds the maximum size of 256 bytes.',
				},
			},
		]);
	});

	it('reports a response that cannot be serialized', () => {
		const channel = newChannel();
		const seen: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (response) => seen.push(response));
		const response = ended(null) as ExecutionResponse & { circular?: unknown };
		response.circular = response;

		channel.publish(response);

		expect(seen).toEqual([
			{
				type: 'failure',
				executionId: 'exec-1',
				error: {
					code: 'RESPONSE_SERIALIZATION_FAILED',
					message: 'The execution response could not be serialized.',
				},
			},
		]);
	});

	it('reports an oversized response', () => {
		const channel = new ExecutionResponseChannel(new RecordingTransport(), silentLogger(), 64);
		const seen: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (r) => seen.push(r));

		channel.publish({ type: 'response', executionId: 'exec-1', payload: 'x'.repeat(200) });

		expect(seen[0]).toEqual({
			type: 'failure',
			executionId: 'exec-1',
			error: {
				code: 'RESPONSE_TOO_LARGE',
				message: 'The execution response exceeds the maximum size of 64 bytes.',
			},
		});
	});

	it('reports an unserializable response', () => {
		const channel = new ExecutionResponseChannel(new RecordingTransport(), silentLogger());
		const seen: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (r) => seen.push(r));

		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		channel.publish({ type: 'response', executionId: 'exec-1', payload: cyclic as never });

		expect(seen[0]).toEqual({
			type: 'failure',
			executionId: 'exec-1',
			error: {
				code: 'RESPONSE_SERIALIZATION_FAILED',
				message: 'The execution response could not be serialized.',
			},
		});
	});

	it('stamps the execution id, so a step carries no routing state', () => {
		const channel = newChannel();
		const seen: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (r) => seen.push(r));

		const respond = channel.emitterFor('exec-1');
		respond.send({ ok: true });
		respond.chunk({ part: 1 });

		expect(seen).toEqual([
			{ type: 'response', executionId: 'exec-1', payload: { ok: true } },
			{ type: 'chunk', executionId: 'exec-1', payload: { part: 1 } },
		]);
	});

	it('reports an oversized chunk', () => {
		const transport = new RecordingTransport();
		const channel = new ExecutionResponseChannel(transport, silentLogger(), 64);
		const seen: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (response) => seen.push(response));

		channel.publish({ type: 'chunk', executionId: 'exec-1', payload: 'x'.repeat(200) });

		expect(seen[0]).toEqual({
			type: 'failure',
			executionId: 'exec-1',
			error: {
				code: 'RESPONSE_TOO_LARGE',
				message: 'The execution response exceeds the maximum size of 64 bytes.',
			},
		});
	});

	it('discards a frame that is not a response', () => {
		const transport = new RecordingTransport();
		const channel = new ExecutionResponseChannel(transport, silentLogger());
		const seen: ExecutionResponse[] = [];
		channel.subscribe('exec-1', (r) => seen.push(r));

		transport.publish('exec-1', '{"type":"nonsense"}');
		transport.publish('exec-1', 'not json at all');

		expect(seen).toEqual([]);
	});

	it('isolates a subscriber that throws', () => {
		const channel = newChannel();
		channel.subscribe('exec-1', () => {
			throw new Error('boom');
		});

		expect(() => channel.publish(ended(null))).not.toThrow();
	});

	it('stops the underlying transport', async () => {
		const transport = new RecordingTransport();
		const stop = vi.spyOn(transport, 'stop');
		const channel = new ExecutionResponseChannel(transport, silentLogger());

		await channel.stop();

		expect(stop).toHaveBeenCalledTimes(1);
	});
});
