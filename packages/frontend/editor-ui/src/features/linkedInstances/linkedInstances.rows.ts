import type { LinkedInstanceSummary } from '@n8n/api-types';
import { ref } from 'vue';

const MAX_LIST_READS = 3;

/** The moment a request started. Compare it with the rows when the request ends. */
export type RowsMark = { readonly generation: number; readonly writes: number };

/**
 * The rows of the links, with a count of their changes. A request takes a mark when it starts.
 * When it ends, the mark tells if a clear or a change of a row happened meanwhile, so an old
 * answer does not undo a newer change.
 */
export function useLinkedInstanceRows() {
	const instances = ref<LinkedInstanceSummary[]>([]);
	// Counts the changes of single rows. A full list read does not count.
	let writes = 0;
	// The value of `writes` after the latest change of each row.
	const lastWriteOf = new Map<string, number>();
	// Changes on clear(). An answer to a request from before a clear is not used.
	let generation = 0;

	function recordWrite(id: string) {
		writes += 1;
		lastWriteOf.set(id, writes);
	}

	function replace(summary: LinkedInstanceSummary) {
		recordWrite(summary.id);
		instances.value = instances.value.map((item) => (item.id === summary.id ? summary : item));
	}

	function append(summary: LinkedInstanceSummary) {
		recordWrite(summary.id);
		const others = instances.value.filter((item) => item.id !== summary.id);
		// The server lists the oldest link first, so a new link goes last.
		instances.value = [...others, summary];
	}

	function remove(id: string) {
		recordWrite(id);
		instances.value = instances.value.filter((item) => item.id !== id);
	}

	const isListed = (id: string) => instances.value.some((item) => item.id === id);
	const mark = (): RowsMark => ({ generation, writes });
	/** False after a clear that came after the mark. */
	const isCurrent = (since: RowsMark) => since.generation === generation;
	/** True when any row changed after the mark. */
	const changedSince = (since: RowsMark) => since.writes !== writes;
	/** True when this row changed (or went) after the mark. */
	const rowChangedSince = (since: RowsMark, id: string) =>
		(lastWriteOf.get(id) ?? 0) > since.writes;

	function clear() {
		generation += 1;
		// Only frees memory: `writes` only grows, so an old entry never counts for a later mark.
		lastWriteOf.clear();
		instances.value = [];
	}

	return {
		instances,
		replace,
		append,
		remove,
		isListed,
		mark,
		isCurrent,
		changedSince,
		rowChangedSince,
		clear,
	};
}

export type LinkedInstanceRows = ReturnType<typeof useLinkedInstanceRows>;

/** Reads the full list into the rows and records the state of the read for the page. */
export function useLinkedInstanceListLoad(
	rows: LinkedInstanceRows,
	fetchList: () => Promise<LinkedInstanceSummary[]>,
) {
	const isLoading = ref(false);
	const loadFailed = ref(false);
	const hasLoaded = ref(false);
	let pendingLoad: Promise<void> | undefined;

	/** Reads again when a row changed during the read, so the list does not undo that change. */
	async function readCurrentList(): Promise<LinkedInstanceSummary[]> {
		for (let attempt = 1; ; attempt++) {
			const startedAt = rows.mark();
			const list = await fetchList();
			if (!rows.changedSince(startedAt) || attempt >= MAX_LIST_READS) return list;
		}
	}

	async function readList(): Promise<void> {
		const startedAt = rows.mark();
		isLoading.value = true;
		loadFailed.value = false;
		// `undefined` when the read failed. The page shows the failure with a way to try again.
		const list = await readCurrentList().catch(() => undefined);
		if (!rows.isCurrent(startedAt)) return;
		isLoading.value = false;
		pendingLoad = undefined;
		if (list) {
			rows.instances.value = list;
			hasLoaded.value = true;
		} else {
			loadFailed.value = true;
		}
	}

	/** Reads the list again. Calls that overlap share one request. Never rejects. */
	async function fetchInstances(): Promise<void> {
		pendingLoad ??= readList();
		await pendingLoad;
	}

	/** Call together with `rows.clear()`. A read that is still open then changes nothing. */
	function reset() {
		pendingLoad = undefined;
		isLoading.value = false;
		loadFailed.value = false;
		hasLoaded.value = false;
	}

	return { isLoading, loadFailed, hasLoaded, fetchInstances, reset };
}
