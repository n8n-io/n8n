import { describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { ExecutionResponseChannel } from '../execution-response-channel';
import type { ExecutionResponse } from '../execution-response.types';
import { InMemoryResponseTransport } from '../in-memory-transport';
import type { ResponseTransport } from '../response-transport';

const silentLogger = (): EngineLogger => ({
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
});

const ended = (outputs: unknown): ExecutionResponse => ({
	type: 'ended',
	executionId: 'exec-1',
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: outputs as never },
});

/** A transport that keeps its frames, so a test can see what crossed. */
class RecordingTransport implements ResponseTransport {
	readonly frames: string[] = [];

	private handler?: (frame: string) => void;

	publish(frame: string): void {
		this.frames.push(frame);
		this.handler?.(frame);
	}

	subscribe(handler: (frame: string) => void): void {
		this.handler = handler;
	}

	async stop(): Promise<void> {}
}

describe('ExecutionResponseChannel', () => {
	const newChannel = () =>
		new ExecutionResponseChannel(new InMemoryResponseTransport(), silentLogger());

	it('delivers a response to every subscriber', () => {
		const channel = newChannel();
		const first: ExecutionResponse[] = [];
		const second: ExecutionResponse[] = [];
		channel.subscribe((r) => first.push(r));
		channel.subscribe((r) => second.push(r));

		channel.publish(ended([[{ json: { a: 1 } }]]));

		expect(first[0]).toMatchObject({
			type: 'ended',
			status: 'completed',
			lastStep: { nodeName: 'A', outputs: [[{ json: { a: 1 } }]] },
		});
		expect(second).toEqual(first);
	});

	it('strips a value no transport could carry, rather than passing it live', () => {
		const channel = newChannel();
		const seen: ExecutionResponse[] = [];
		channel.subscribe((r) => seen.push(r));

		// `Date` has no JSON form. Passing the live object would work in-process
		// and break over a socket, which is the divergence the channel prevents.
		channel.publish(ended([[{ at: new Date(0) }]]));

		expect(seen[0]).toMatchObject({
			lastStep: { outputs: [[{ at: '1970-01-01T00:00:00.000Z' }]] },
		});
	});

	it('discards a frame that is not a response', () => {
		const transport = new RecordingTransport();
		const channel = new ExecutionResponseChannel(transport, silentLogger());
		const seen: ExecutionResponse[] = [];
		channel.subscribe((r) => seen.push(r));

		transport.publish('{"type":"nonsense"}');
		transport.publish('not json at all');

		expect(seen).toEqual([]);
	});

	it('isolates a subscriber that throws', () => {
		const channel = newChannel();
		channel.subscribe(() => {
			throw new Error('boom');
		});

		expect(() => channel.publish(ended(null))).not.toThrow();
	});
});
