import { describe, expect, it, vi } from 'vitest';

import { ExecutionResponseSender } from '../execution-response-sender';
import type { ExecutionResponse } from '../execution-response.types';
import type { ResponseFrameSender } from '../response-frame';

const ended = (outputs: unknown): ExecutionResponse => ({
	type: 'ended',
	executionId: 'exec-1',
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: outputs as never },
});

describe('ExecutionResponseSender', () => {
	it('serializes a response before sending it', () => {
		const frameSender: ResponseFrameSender = { send: vi.fn(), stop: vi.fn() };
		const sender = new ExecutionResponseSender(frameSender);

		sender.send(ended([[{ at: new Date(0) }]]));

		expect(frameSender.send).toHaveBeenCalledExactlyOnceWith(
			'exec-1',
			JSON.stringify(ended([[{ at: '1970-01-01T00:00:00.000Z' }]])),
		);
	});

	it('stops its frame sender', async () => {
		const frameSender: ResponseFrameSender = { send: vi.fn(), stop: vi.fn() };
		const sender = new ExecutionResponseSender(frameSender);

		await sender.stop();

		expect(frameSender.stop).toHaveBeenCalledOnce();
	});
});
