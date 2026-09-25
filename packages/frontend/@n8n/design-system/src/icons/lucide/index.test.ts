import { vi } from 'vitest';

import type * as BucketModule from './bucket';
import { getBucketIndex } from './bucket';
import { loadLucideIconBody } from './index';

const mockState = vi.hoisted(() => ({
	bucketLoadCounts: new Map<number, number>(),
	failBuckets: new Set<number>(),
	bodies: {
		anchor: '<path data-icon="anchor" />',
		badge: '<path data-icon="badge" />',
		bell: '<path data-icon="bell" />',
		cake: '<path data-icon="cake" />',
	} as Record<string, string>,
}));

vi.mock('virtual:lucide-icons', async () => {
	const { BUCKET_COUNT, getBucketIndex: getActualBucketIndex } =
		await vi.importActual<typeof BucketModule>('./bucket');

	const buckets = Array.from({ length: BUCKET_COUNT }, (): Record<string, string> => ({}));
	for (const [name, body] of Object.entries(mockState.bodies)) {
		const bucket = buckets[getActualBucketIndex(name)];
		if (bucket) bucket[name] = body;
	}

	return {
		default: buckets.map((bucket, index) => async () => {
			mockState.bucketLoadCounts.set(index, (mockState.bucketLoadCounts.get(index) ?? 0) + 1);
			if (mockState.failBuckets.has(index)) {
				mockState.failBuckets.delete(index);
				throw new Error('Failed to fetch bucket');
			}
			return { default: bucket };
		}),
	};
});

describe('loadLucideIconBody', () => {
	it('returns the SVG body string for a known icon', async () => {
		await expect(loadLucideIconBody('anchor')).resolves.toBe('<path data-icon="anchor" />');
	});

	it('returns null for an unknown icon name', async () => {
		await expect(loadLucideIconBody('this-icon-does-not-exist')).resolves.toBeNull();
	});

	it('loads a bucket once for concurrent same-bucket requests', async () => {
		const bucketIndex = getBucketIndex('badge');
		// Fixture precondition: both names must hash into the same bucket
		expect(getBucketIndex('bell')).toBe(bucketIndex);

		const [badge, bell] = await Promise.all([
			loadLucideIconBody('badge'),
			loadLucideIconBody('bell'),
		]);

		expect(badge).toBe('<path data-icon="badge" />');
		expect(bell).toBe('<path data-icon="bell" />');
		expect(mockState.bucketLoadCounts.get(bucketIndex)).toBe(1);
	});

	it('retries a bucket after a failed load', async () => {
		const bucketIndex = getBucketIndex('cake');
		mockState.failBuckets.add(bucketIndex);

		await expect(loadLucideIconBody('cake')).rejects.toThrow('Failed to fetch bucket');
		await expect(loadLucideIconBody('cake')).resolves.toBe('<path data-icon="cake" />');
		expect(mockState.bucketLoadCounts.get(bucketIndex)).toBe(2);
	});
});
