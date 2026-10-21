import type { PromotionDirection, PromotionPreview, PromotionResourceDetail } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import chunk from 'lodash/chunk';
import { ref, watch, type Ref } from 'vue';

import { getPromotionResourceDetails } from '../promotions.api';
import { PROMOTION_DETAILS_BATCH_SIZE } from '../promotions.constants';
import type { ResourceKey, SelectionGraph } from '../promotionPreview.selection';

export type DetailEntry =
	| { status: 'loading' }
	| { status: 'loaded'; detail: PromotionResourceDetail }
	/** Neither side holds the resource anymore. It changed after the preview loaded. */
	| { status: 'missing' }
	| { status: 'error' };

/**
 * Loads the before and after content of the changed resources other than workflows with each
 * preview, in batches that the endpoint accepts.
 */
export function usePromotionResourceDetails(
	projectId: Ref<string>,
	direction: Ref<PromotionDirection>,
	preview: Ref<PromotionPreview | null>,
	graph: Ref<SelectionGraph | null>,
) {
	const rootStore = useRootStore();
	const entries = ref(new Map<ResourceKey, DetailEntry>());
	// A new preview starts a new generation, so answers for the old one are dropped.
	let generation = 0;

	watch(preview, async () => {
		generation++;
		entries.value = new Map();
		const changed = [...(graph.value?.resources.values() ?? [])].filter(
			(resource) => resource.change !== 'unchanged' && resource.type !== 'workflow',
		);
		await request(changed.map((resource) => resource.key));
	});

	async function fetchBatch(
		keys: ResourceKey[],
		commitSha: string | null,
		batchGeneration: number,
	) {
		try {
			const { details, missingKeys } = await getPromotionResourceDetails(
				rootStore.restApiContext,
				projectId.value,
				direction.value,
				{ commitSha, keys },
			);
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

		const { commitSha } = preview.value;
		const batchGeneration = generation;
		await Promise.all(
			chunk(pending, PROMOTION_DETAILS_BATCH_SIZE).map(
				async (batch) => await fetchBatch(batch, commitSha, batchGeneration),
			),
		);
	}

	async function retry(key: ResourceKey) {
		entries.value.delete(key);
		await request([key]);
	}

	return { entries, request, retry };
}
