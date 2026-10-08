import type { LinkInstanceRequestDto, LinkedInstanceSummary } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import * as api from './linkedInstances.api';

const MAX_LIST_READS = 3;

/**
 * The links of the current user. The state holds only summaries: a token goes straight from
 * the caller to the API and is never kept here.
 */
export const useLinkedInstancesStore = defineStore('linkedInstances', () => {
	const rootStore = useRootStore();

	const instances = ref<LinkedInstanceSummary[]>([]);
	const isLoading = ref(false);
	const loadFailed = ref(false);
	const hasLoaded = ref(false);

	let pendingLoad: Promise<void> | undefined;
	// Counts the changes this store makes. A list read that started before a change is stale.
	let writes = 0;

	function replace(summary: LinkedInstanceSummary) {
		writes += 1;
		instances.value = instances.value.map((item) => (item.id === summary.id ? summary : item));
	}

	function append(summary: LinkedInstanceSummary) {
		writes += 1;
		const others = instances.value.filter((item) => item.id !== summary.id);
		// The server lists the oldest link first, so a new link goes last.
		instances.value = [...others, summary];
	}

	function remove(id: string) {
		writes += 1;
		instances.value = instances.value.filter((item) => item.id !== id);
	}

	/** Reads again when a change landed during the read, so the list does not undo that change. */
	async function readCurrentList(): Promise<LinkedInstanceSummary[]> {
		for (let attempt = 1; ; attempt++) {
			const startedAt = writes;
			const list = await api.fetchLinkedInstances(rootStore.restApiContext);
			if (startedAt === writes || attempt >= MAX_LIST_READS) return list;
		}
	}

	async function readList(): Promise<void> {
		isLoading.value = true;
		loadFailed.value = false;
		try {
			instances.value = await readCurrentList();
			hasLoaded.value = true;
		} catch {
			// The page shows the failure with a way to try again.
			loadFailed.value = true;
		} finally {
			isLoading.value = false;
			pendingLoad = undefined;
		}
	}

	/** Reads the list again. Calls that overlap share one request. Never rejects. */
	async function fetchInstances(): Promise<void> {
		pendingLoad ??= readList();
		await pendingLoad;
	}

	/** @throws the server error, for example when the check of the instance fails */
	async function link(payload: LinkInstanceRequestDto): Promise<LinkedInstanceSummary> {
		const summary = await api.linkInstance(rootStore.restApiContext, payload);
		append(summary);
		return summary;
	}

	/** Checks the instance again and records the new status. */
	async function verify(id: string): Promise<LinkedInstanceSummary> {
		const summary = await api.verifyLinkedInstance(rootStore.restApiContext, id);
		replace(summary);
		return summary;
	}

	/** @throws the server error when the instance refuses the new token. The old token stays. */
	async function changeToken(id: string, token: string): Promise<LinkedInstanceSummary> {
		const summary = await api.updateLinkedInstance(rootStore.restApiContext, id, { token });
		replace(summary);
		return summary;
	}

	async function unlink(id: string): Promise<void> {
		await api.unlinkInstance(rootStore.restApiContext, id);
		remove(id);
	}

	return {
		instances,
		isLoading,
		loadFailed,
		hasLoaded,
		fetchInstances,
		link,
		verify,
		changeToken,
		unlink,
	};
});
