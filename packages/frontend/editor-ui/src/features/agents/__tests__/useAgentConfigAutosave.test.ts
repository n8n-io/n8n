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
});
