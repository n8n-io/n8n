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
				return new Promise<void>((_resolve, reject) => {
					rejectFirstSave = reject;
				});
			}
			return Promise.resolve();
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
});
