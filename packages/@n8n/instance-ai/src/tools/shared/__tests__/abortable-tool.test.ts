import type { BuiltTool, ToolContext } from '@n8n/agents';
import { describe, expect, it, vi } from 'vitest';

import {
	createAbortError,
	isAbortError,
	makeToolAbortable,
	throwIfAborted,
	withAbortableToolHandler,
} from '../abortable-tool';

function makeCtx(signal?: AbortSignal): ToolContext {
	return { abortSignal: signal };
}

describe('abortable-tool', () => {
	describe('isAbortError', () => {
		it('detects AbortError by name', () => {
			expect(isAbortError(createAbortError())).toBe(true);
		});

		it('rejects unrelated errors', () => {
			expect(isAbortError(new Error('boom'))).toBe(false);
		});
	});

	describe('throwIfAborted', () => {
		it('throws when the signal is already aborted', () => {
			const controller = new AbortController();
			controller.abort();
			expect(() => throwIfAborted(makeCtx(controller.signal))).toThrowError(
				expect.objectContaining({ name: 'AbortError' }),
			);
		});

		it('no-ops when the signal is still open', () => {
			expect(() => throwIfAborted(makeCtx(new AbortController().signal))).not.toThrow();
		});
	});

	describe('withAbortableToolHandler', () => {
		it('returns the handler result when not aborted', async () => {
			const handler = withAbortableToolHandler(async () => ({ ok: true }));
			await expect(handler({}, makeCtx(new AbortController().signal))).resolves.toEqual({
				ok: true,
			});
		});

		it('rejects promptly when the signal aborts during execution', async () => {
			const controller = new AbortController();
			let release!: () => void;
			const hang = new Promise<void>((resolve) => {
				release = resolve;
			});

			const handler = withAbortableToolHandler(async () => {
				await hang;
				return { ok: true };
			});

			const pending = handler({}, makeCtx(controller.signal));
			controller.abort();

			await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
			release();
		});

		it('rejects before starting when already aborted', async () => {
			const controller = new AbortController();
			controller.abort();
			const inner = vi.fn(async () => ({ ok: true }));
			const handler = withAbortableToolHandler(inner);

			await expect(handler({}, makeCtx(controller.signal))).rejects.toMatchObject({
				name: 'AbortError',
			});
			expect(inner).not.toHaveBeenCalled();
		});

		it('passes through when no abort signal is provided', async () => {
			const handler = withAbortableToolHandler(async () => ({ ok: true }));
			await expect(handler({}, {})).resolves.toEqual({ ok: true });
		});
	});

	describe('makeToolAbortable', () => {
		it('wraps the handler and is idempotent', async () => {
			const controller = new AbortController();
			let release!: () => void;
			const hang = new Promise<void>((resolve) => {
				release = resolve;
			});

			const tool: BuiltTool = {
				name: 'slow',
				description: 'slow tool',
				handler: async () => {
					await hang;
					return { done: true };
				},
			};

			const once = makeToolAbortable(tool);
			const twice = makeToolAbortable(once);
			expect(twice).toBe(once);
			expect(once.metadata?.abortableWrapped).toBe(true);

			const pending = once.handler?.({}, makeCtx(controller.signal));
			controller.abort();
			await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
			release();
		});
	});
});
