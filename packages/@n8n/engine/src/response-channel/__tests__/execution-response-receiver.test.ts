import { describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { ExecutionResponseReceiver } from '../execution-response-receiver';
import type { ExecutionResponse } from '../execution-response.types';
import type { ResponseFrameReceiver } from '../response-frame';

const silentLogger = (): EngineLogger => ({
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
});

class RecordingFrameReceiver implements ResponseFrameReceiver {
	private handler?: (frame: string) => void;

	receive(_executionId: string, handler: (frame: string) => void) {
		this.handler = handler;
		return () => {
			this.handler = undefined;
		};
	}

	deliver(frame: string): void {
		this.handler?.(frame);
	}

	async stop(): Promise<void> {}
}

const ended = (): ExecutionResponse => ({
	type: 'ended',
	executionId: 'exec-1',
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: null },
});

describe('ExecutionResponseReceiver', () => {
	it('validates a frame before delivering it', () => {
		const frameReceiver = new RecordingFrameReceiver();
		const receiver = new ExecutionResponseReceiver(frameReceiver, silentLogger());
		const seen: ExecutionResponse[] = [];
		receiver.receive('exec-1', (response) => seen.push(response));

		frameReceiver.deliver(JSON.stringify(ended()));

		expect(seen).toEqual([ended()]);
	});

	it('discards malformed and unreadable frames', () => {
		const frameReceiver = new RecordingFrameReceiver();
		const receiver = new ExecutionResponseReceiver(frameReceiver, silentLogger());
		const seen: ExecutionResponse[] = [];
		receiver.receive('exec-1', (response) => seen.push(response));

		frameReceiver.deliver('{"type":"nonsense"}');
		frameReceiver.deliver('not json at all');

		expect(seen).toEqual([]);
	});

	it('isolates a handler that throws', () => {
		const frameReceiver = new RecordingFrameReceiver();
		const receiver = new ExecutionResponseReceiver(frameReceiver, silentLogger());
		receiver.receive('exec-1', () => {
			throw new Error('boom');
		});

		expect(() => frameReceiver.deliver(JSON.stringify(ended()))).not.toThrow();
	});

	it('stops its frame receiver', async () => {
		const frameReceiver = new RecordingFrameReceiver();
		const stop = vi.spyOn(frameReceiver, 'stop');
		const receiver = new ExecutionResponseReceiver(frameReceiver, silentLogger());

		await receiver.stop();

		expect(stop).toHaveBeenCalledOnce();
	});
});
