import { describe, it, expect, vi, afterEach } from 'vitest';

import { useAgentConfigAutosave } from '../composables/useAgentConfigAutosave';

describe('useAgentConfigAutosave', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
	});

	it('flushAutosave immediately saves a pending debounced snapshot', async () => {
		vi.useFakeTimers();
		const save = vi.fn().mockResolvedValue(undefined);
		const autosave = useAgentConfigAutosave<{ value: string }>({
			save,
			debounceMs: 500,
		});

		autosave.scheduleAutosave({ value: 'latest' });
		await autosave.flushAutosave();

		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith({ value: 'latest' });

		await vi.advanceTimersByTimeAsync(500);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('flushAutosave rejects when the immediate save fails', async () => {
		vi.useFakeTimers();
		const error = new Error('save failed');
		const save = vi.fn().mockRejectedValue(error);
		const onError = vi.fn();
		const autosave = useAgentConfigAutosave<{ value: string }>({
			save,
			onError,
			debounceMs: 500,
		});

		autosave.scheduleAutosave({ value: 'latest' });

		await expect(autosave.flushAutosave()).rejects.toBe(error);
		expect(onError).toHaveBeenCalledWith(error);
	});

	it('does not restore a failed flush snapshot over a newer pending snapshot', async () => {
		vi.useFakeTimers();
		const error = new Error('save failed');
		let rejectFirstSave: (error: Error) => void = () => {};
		const save = vi.fn((snapshot: { value: string }) => {
			if (snapshot.value === 'old') {
				return new Promise<'skipped' | undefined>((_resolve, reject) => {
					rejectFirstSave = reject;
				});
			}
			return Promise.resolve(undefined);
		});
		const autosave = useAgentConfigAutosave<{ value: string }>({
			save,
			debounceMs: 500,
		});

		autosave.scheduleAutosave({ value: 'old' });
		const flushPromise = autosave.flushAutosave();
		await Promise.resolve();

		autosave.scheduleAutosave({ value: 'new' });
		rejectFirstSave(error);

		await expect(flushPromise).rejects.toBe(error);
		await autosave.flushAutosave();

		expect(save).toHaveBeenCalledTimes(2);
		expect(save).toHaveBeenNthCalledWith(1, { value: 'old' });
		expect(save).toHaveBeenNthCalledWith(2, { value: 'new' });
	});

	it('does not restore a failed flush snapshot when reset() ran while the save was in flight', async () => {
		vi.useFakeTimers();
		const error = new Error('save failed');
		let rejectFirstSave: (error: Error) => void = () => {};
		const save = vi.fn((snapshot: { value: string }) => {
			if (snapshot.value === 'a') {
				return new Promise<'skipped' | undefined>((_resolve, reject) => {
					rejectFirstSave = reject;
				});
			}
			return Promise.resolve(undefined);
		});
		const autosave = useAgentConfigAutosave<{ value: string }>({
			save,
			debounceMs: 500,
		});

		autosave.scheduleAutosave({ value: 'a' });
		const flushPromise = autosave.flushAutosave();
		await Promise.resolve();

		// Target switch while A's flush is still awaiting the failing save.
		autosave.reset();
		rejectFirstSave(error);
		await expect(flushPromise).rejects.toBe(error);

		// B's flush must not replay A's failed snapshot.
		await autosave.flushAutosave();
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith({ value: 'a' });
	});

	it('cancelPendingAutosave drops a debounced snapshot without saving it', async () => {
		vi.useFakeTimers();
		const save = vi.fn().mockResolvedValue(undefined);
		const autosave = useAgentConfigAutosave<{ value: string }>({
			save,
			debounceMs: 500,
		});

		autosave.scheduleAutosave({ value: 'pending' });
		autosave.cancelPendingAutosave();

		await vi.advanceTimersByTimeAsync(500);
		await autosave.flushAutosave();

		expect(save).not.toHaveBeenCalled();
	});

	it('keeps saveStatus idle and skips onSaved when save resolves "skipped"', async () => {
		vi.useFakeTimers();
		const save = vi.fn().mockResolvedValue('skipped' as const);
		const onSaved = vi.fn();
		const autosave = useAgentConfigAutosave<{ value: string }>({
			save,
			onSaved,
			debounceMs: 500,
		});

		autosave.scheduleAutosave({ value: 'latest' });
		await vi.advanceTimersByTimeAsync(500);
		await autosave.settleAutosave();

		expect(save).toHaveBeenCalledTimes(1);
		expect(onSaved).not.toHaveBeenCalled();
		expect(autosave.saveStatus.value).toBe('idle');
	});

	it('reset() clears saveStatus and drops a pending debounced snapshot', async () => {
		vi.useFakeTimers();
		const save = vi.fn().mockResolvedValue(undefined);
		const autosave = useAgentConfigAutosave<{ value: string }>({
			save,
			debounceMs: 500,
			savedHoldMs: 2000,
		});

		autosave.scheduleAutosave({ value: 'a' });
		await vi.advanceTimersByTimeAsync(500);
		await autosave.settleAutosave();
		expect(autosave.saveStatus.value).toBe('saved');

		autosave.reset();
		expect(autosave.saveStatus.value).toBe('idle');

		// A pending debounced snapshot is dropped — no save fires after reset.
		autosave.scheduleAutosave({ value: 'b' });
		autosave.reset();
		await vi.advanceTimersByTimeAsync(500);
		await autosave.flushAutosave();
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith({ value: 'a' });
	});

	it('reset() detaches an in-flight save so it cannot flip saveStatus or fire later', async () => {
		vi.useFakeTimers();
		let resolveSave: (value?: 'skipped' | undefined) => void = () => {};
		const save = vi
			.fn()
			.mockImplementation(
				() => new Promise<'skipped' | undefined>((resolve) => void (resolveSave = resolve)),
			);
		const onSaved = vi.fn();
		const autosave = useAgentConfigAutosave<{ value: string }>({
			save,
			onSaved,
			debounceMs: 500,
			savedHoldMs: 2000,
		});

		autosave.scheduleAutosave({ value: 'a' });
		await vi.advanceTimersByTimeAsync(500);
		// Save is now in flight for A.
		expect(autosave.saveStatus.value).toBe('saving');

		// Switch to B: reset detaches the in-flight A save from saveStatus.
		autosave.reset();
		expect(autosave.saveStatus.value).toBe('idle');

		// A's save resolves after the switch — it must not flip B's indicator.
		resolveSave();
		await Promise.resolve();
		await Promise.resolve();
		expect(autosave.saveStatus.value).toBe('idle');
		expect(onSaved).toHaveBeenCalledWith({ value: 'a' });

		// The `saved` hold timer queued by the stale save must not fire for B.
		await vi.advanceTimersByTimeAsync(5000);
		expect(autosave.saveStatus.value).toBe('idle');
	});
});
