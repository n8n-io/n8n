import type { PromotionResourceDetail, PromotionResourceDetails } from '@n8n/api-types';
import chunk from 'lodash/chunk';
import { ref, watch, type Ref } from 'vue';

import { PROMOTION_DETAILS_BATCH_SIZE } from '../promotions.constants';
import type { ResourceKey, SelectionGraph } from '../promotionPreview.selection';

export type DetailEntry =
	| { status: 'loading' }
	| { status: 'loaded'; detail: PromotionResourceDetail }
	/** Neither side holds the resource anymore. It changed after the preview loaded. */
	| { status: 'missing' }
	| { status: 'error' };

/** Reads one batch of details at the commits of the loaded preview. */
export type FetchResourceDetails = (keys: ResourceKey[]) => Promise<PromotionResourceDetails>;

/**
 * Loads the before and after content of the changed resources with each preview, in batches
 * that the endpoint accepts. A workflow loads only when the user activates its diff.
 */
export function usePromotionResourceDetails(
	fetchDetails: FetchResourceDetails,
	preview: Ref<object | null>,
	graph: Ref<SelectionGraph | null>,
	activeWorkflowKey: Ref<ResourceKey | undefined>,
) {
	const entries = ref(new Map<ResourceKey, DetailEntry>());
	// A new preview starts a new generation, so answers for the old one are dropped.
	let generation = 0;

	watch(preview, async () => {
		generation++;
		entries.value = new Map();
		const changed = [...(graph.value?.resources.values() ?? [])].filter(
			(resource) =>
				resource.change !== 'unchanged' &&
				(resource.type !== 'workflow' || resource.key === activeWorkflowKey.value),
		);
		await request(changed.map((resource) => resource.key));
	});

	watch(activeWorkflowKey, async (key) => {
		if (key) await request([key]);
	});

	async function fetchBatch(keys: ResourceKey[], batchGeneration: number) {
		try {
			const { details, missingKeys } = await fetchDetails(keys);
			if (batchGeneration !== generation) return;
			for (const detail of details) entries.value.set(detail.key, { status: 'loaded', detail });
			for (const key of missingKeys) entries.value.set(key, { status: 'missing' });
		} catch {
			if (batchGeneration !== generation) return;
			for (const key of keys) entries.value.set(key, { status: 'error' });
		}
	}

	/** Loads the keys that have a file on either side and are not loaded yet. */
	async function request(keys: readonly ResourceKey[]) {
		if (!preview.value) return;
		const pending = keys.filter((key) => {
			const resource = graph.value?.resources.get(key);
			// A sub-workflow that neither side holds has no file to compare.
			const hasFile =
				resource && (resource.revision.before !== null || resource.revision.after !== null);
			return hasFile && !entries.value.has(key);
		});
		for (const key of pending) entries.value.set(key, { status: 'loading' });

		const batchGeneration = generation;
		await Promise.all(
			chunk(pending, PROMOTION_DETAILS_BATCH_SIZE).map(
				async (batch) => await fetchBatch(batch, batchGeneration),
			),
		);
	}

	async function retry(key: ResourceKey) {
		entries.value.delete(key);
		await request([key]);
	}

	return { entries, request, retry };
}
