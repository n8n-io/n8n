import { mock } from 'vitest-mock-extended';

import type { FoldFailureStreaks } from '../fold/fold-failure-streaks';

/** Same contract as the real store: one entry for each step, valid for one batch key. */
export const fakeFailureStreaks = () => {
	const entries = new Map<string, { batchKey: string; failures: number }>();
	const streaks = mock<FoldFailureStreaks>();
	streaks.get.mockImplementation(async (step, batchKey) => {
		const entry = entries.get(step);
		return await Promise.resolve(entry?.batchKey === batchKey ? entry.failures : 0);
	});
	streaks.set.mockImplementation(async (step, batchKey, failures) => {
		entries.set(step, { batchKey, failures });
		await Promise.resolve();
	});
	return streaks;
};
