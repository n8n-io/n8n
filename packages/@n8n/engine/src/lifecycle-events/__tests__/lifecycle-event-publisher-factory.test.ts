import { describe, expect, it, vi } from 'vitest';

import {
	noopLifecycleEventPublisher,
	type LifecycleEventPublisher,
} from '../lifecycle-event-publisher';
import { LifecycleEventPublisherFactory } from '../lifecycle-event-publisher-factory';

describe('LifecycleEventPublisherFactory', () => {
	const publisher: LifecycleEventPublisher = { publish: vi.fn(), stop: vi.fn() };
	const factory = new LifecycleEventPublisherFactory(publisher);

	it('returns the host publisher for an execution that subscribes to all events', () => {
		expect(factory.create({ lifecycleEvents: { kind: 'all' } })).toBe(publisher);
	});

	it.each([
		['is missing', {}],
		['is null', { lifecycleEvents: null }],
		['is none', { lifecycleEvents: { kind: 'none' as const } }],
	])('returns the no-op publisher when the subscription %s', (_name, execution) => {
		expect(factory.create(execution)).toBe(noopLifecycleEventPublisher);
	});
});
