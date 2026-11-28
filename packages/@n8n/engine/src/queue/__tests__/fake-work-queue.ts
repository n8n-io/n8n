import { vi, type Mocked } from 'vitest';

import type { WorkQueue } from '../work-queue.types';

/** A `WorkQueue` that dispatches nothing. */
export function fakeWorkQueue<TMessage>(): Mocked<WorkQueue<TMessage>> {
	return {
		publish: vi.fn(async () => {}),
		start: vi.fn(),
		stop: vi.fn(async () => {}),
		size: vi.fn(async () => 0),
	};
}
