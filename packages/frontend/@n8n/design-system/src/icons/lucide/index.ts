/// <reference path="./shims.d.ts" />
import bucketLoaders from 'virtual:lucide-icons';

import { getBucketIndex } from './bucket';
import type { IconBodyLoader } from '../../composables/useIconBodyLoader';

// The key and a loader are only ever used as a pair — `app.provide(IconBodyLoaderKey,
// loadLucideIconBody)` is the whole contract, at every call site. Re-exported here so
// wiring icons is one import, and so a consumer that must avoid the component barrel
// (`.storybook/preview.ts`, a TurboSnap global) has a published path to the key.
export { IconBodyLoaderKey } from '../../composables/useIconBodyLoader';
export type { IconBodyLoader } from '../../composables/useIconBodyLoader';

const buckets = new Map<number, Promise<Record<string, string>>>();

export const loadLucideIconBody: IconBodyLoader = async (name) => {
	const index = getBucketIndex(name);
	let bucket = buckets.get(index);
	if (!bucket) {
		const loadBucket = bucketLoaders[index];
		if (!loadBucket) return null;
		bucket = loadBucket().then((module) => module.default);
		// Cache the promise (not the result) so concurrent requests for icons in
		// the same bucket share a single fetch.
		buckets.set(index, bucket);
		// Evict failed loads so a later render retries instead of staying blank.
		bucket.catch(() => buckets.delete(index));
	}
	return (await bucket)[name] ?? null;
};
