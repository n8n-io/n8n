import { ref } from 'vue';

export interface BatchRange {
	skip: number;
	take: number;
}

/**
 * Keeps count of the batches that a scroll-to-load-more list has loaded.
 *
 * A refresh loads every batch again in one request, so the list keeps its length and scroll
 * position. A refresh also cancels a load-more that is in progress, because the rows can change.
 */
export function useLoadMoreBatches(batchSize: number) {
	const batchCount = ref(1);
	const isLoadingMore = ref(false);
	let refreshesInProgress = 0;
	let generation = 0;

	/** Starts again from the first batch, for example after the sort or a filter changes */
	function reset() {
		batchCount.value = 1;
	}

	/** Call before a refresh request. Call `endRefresh` when the request is done */
	function startRefresh(): BatchRange {
		refreshesInProgress++;
		generation++;
		return { skip: 0, take: batchSize * batchCount.value };
	}

	function endRefresh() {
		refreshesInProgress = Math.max(0, refreshesInProgress - 1);
	}

	/**
	 * Fetches the batch after the loaded rows and gives it to `append`, unless a refresh started
	 * meanwhile. The batch starts at `loadedCount`, so a row that was removed from the list does
	 * not make the batch skip a row.
	 */
	async function loadMore<T>(
		loadedCount: number,
		fetchBatch: (range: BatchRange) => Promise<T>,
		append: (result: T) => void,
	) {
		if (isLoadingMore.value || refreshesInProgress > 0) return;

		const startedAt = generation;
		isLoadingMore.value = true;
		try {
			const result = await fetchBatch({ skip: loadedCount, take: batchSize });
			if (startedAt !== generation) return;
			append(result);
			batchCount.value++;
		} finally {
			isLoadingMore.value = false;
		}
	}

	return { batchCount, isLoadingMore, reset, startRefresh, endRefresh, loadMore };
}
