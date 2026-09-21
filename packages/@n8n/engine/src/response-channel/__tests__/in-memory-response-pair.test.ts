import { describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { ExecutionResponseReceiver } from '../execution-response-receiver';
import { ExecutionResponseSender } from '../execution-response-sender';
import type { ExecutionResponse } from '../execution-response.types';
import { createInMemoryResponsePair } from '../in-memory-response-pair';

const silentLogger = (): EngineLogger => ({
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
});

const ended = (executionId = 'exec-1'): ExecutionResponse => ({
	type: 'ended',
	executionId,
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: null },
});

describe('createInMemoryResponsePair', () => {
	it('delivers a response to every handler for that execution', () => {
		const { frameSender, frameReceiver } = createInMemoryResponsePair();
		const sender = new ExecutionResponseSender(frameSender);
		const receiver = new ExecutionResponseReceiver(frameReceiver, silentLogger());
		const first: ExecutionResponse[] = [];
		const second: ExecutionResponse[] = [];
		receiver.receive('exec-1', (response) => first.push(response));
		receiver.receive('exec-1', (response) => second.push(response));

		sender.send(ended());

		expect(first).toEqual([ended()]);
		expect(second).toEqual(first);
	});

	it('does not deliver a response to another execution', () => {
		const { frameSender, frameReceiver } = createInMemoryResponsePair();
		const sender = new ExecutionResponseSender(frameSender);
		const receiver = new ExecutionResponseReceiver(frameReceiver, silentLogger());
		const seen: ExecutionResponse[] = [];
		receiver.receive('exec-1', (response) => seen.push(response));

		sender.send(ended('exec-2'));

		expect(seen).toEqual([]);
	});

	it('stops delivery after the handler is removed', () => {
		const { frameSender, frameReceiver } = createInMemoryResponsePair();
		const sender = new ExecutionResponseSender(frameSender);
		const receiver = new ExecutionResponseReceiver(frameReceiver, silentLogger());
		const seen: ExecutionResponse[] = [];
		const unsubscribe = receiver.receive('exec-1', (response) => seen.push(response));

		unsubscribe();
		sender.send(ended());

		expect(seen).toEqual([]);
	});
});
