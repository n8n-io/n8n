import { vi, type Mocked } from 'vitest';

import type { WorkQueue } from '../work-queue.types';

/** A `WorkQueue` that dispatches nothing. Tests read and program its spies. */
export function fakeWorkQueue<TMessage>(): Mocked<WorkQueue<TMessage>> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn(), size: vi.fn() };
}
