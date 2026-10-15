import { describe, expect, it, vi } from 'vitest';

import { createResponseEmitter } from '../create-response-emitter';
import type { ExecutionResponseSender } from '../execution-response-sender';

const newSender = (): ExecutionResponseSender => ({
	send: vi.fn(() => ({ ok: true as const, result: undefined })),
	stop: vi.fn(),
});

describe('createResponseEmitter', () => {
	it('builds and sends the payload when the caller expects a step response', () => {
		const sender = newSender();
		const emitter = createResponseEmitter(sender, {
			id: 'exec-1',
			responseExpectation: { kind: 'stepResponse' },
		});

		const result = emitter.send(() => ({ ok: true }));

		expect(result.ok).toBe(true);
		expect(sender.send).toHaveBeenCalledExactlyOnceWith({
			type: 'response',
			executionId: 'exec-1',
			payload: { ok: true },
		});
	});

	it('returns the error of the sender', () => {
		const error = new Error('Too large');
		const sender = newSender();
		vi.mocked(sender.send).mockReturnValue({ ok: false, error });
		const emitter = createResponseEmitter(sender, {
			id: 'exec-1',
			responseExpectation: { kind: 'stepResponse' },
		});

		expect(emitter.send(() => ({ ok: true }))).toEqual({ ok: false, error });
	});

	it.each(['none', 'runEnd', 'stream'] as const)(
		'drops the response without building it when the caller expects %s',
		(kind) => {
			const sender = newSender();
			const build = vi.fn(() => ({ ok: true }));
			const emitter = createResponseEmitter(sender, {
				id: 'exec-1',
				responseExpectation: { kind },
			});

			const result = emitter.send(build);

			expect(result.ok).toBe(true);
			expect(build).not.toHaveBeenCalled();
			expect(sender.send).not.toHaveBeenCalled();
		},
	);

	it('builds and sends a chunk when the caller expects a stream', () => {
		const sender = newSender();
		const emitter = createResponseEmitter(sender, {
			id: 'exec-1',
			responseExpectation: { kind: 'stream' },
		});

		const result = emitter.chunk(() => ({ type: 'item', content: 'hi' }));

		expect(result.ok).toBe(true);
		expect(sender.send).toHaveBeenCalledExactlyOnceWith({
			type: 'chunk',
			executionId: 'exec-1',
			payload: { type: 'item', content: 'hi' },
		});
	});

	it('returns the error of the sender for a chunk', () => {
		const error = new Error('Too large');
		const sender = newSender();
		vi.mocked(sender.send).mockReturnValue({ ok: false, error });
		const emitter = createResponseEmitter(sender, {
			id: 'exec-1',
			responseExpectation: { kind: 'stream' },
		});

		expect(emitter.chunk(() => ({ ok: true }))).toEqual({ ok: false, error });
	});

	it.each(['none', 'runEnd', 'stepResponse'] as const)(
		'drops a chunk without building it when the caller expects %s',
		(kind) => {
			const sender = newSender();
			const build = vi.fn(() => ({ ok: true }));
			const emitter = createResponseEmitter(sender, {
				id: 'exec-1',
				responseExpectation: { kind },
			});

			const result = emitter.chunk(build);

			expect(result.ok).toBe(true);
			expect(build).not.toHaveBeenCalled();
			expect(sender.send).not.toHaveBeenCalled();
		},
	);
});
