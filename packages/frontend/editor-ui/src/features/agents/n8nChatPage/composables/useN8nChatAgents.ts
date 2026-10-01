import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { AgentChatListItem } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';

import { listN8nChatAgents } from '../../composables/useAgentApi';

export interface UseN8nChatAgentsOptions {
	query: MaybeRefOrGetter<string>;
	page: MaybeRefOrGetter<number>;
	pageSize: MaybeRefOrGetter<number>;
}

/**
 * Loads one page of the n8n Chat agent library, ranked by the user's own usage.
 * Refetches whenever `query`, `page` or `pageSize` change, and drops a stale response via a
 * request counter (no AbortController hook on `makeRestApiRequest`).
 */
export function useN8nChatAgents(options: UseN8nChatAgentsOptions) {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();

	const agents = ref<AgentChatListItem[]>([]);
	const count = ref(0);
	const isLoading = ref(false);
	const loadFailed = ref(false);

	let requestVersion = 0;
	async function fetchAgents(): Promise<void> {
		const version = ++requestVersion;
		isLoading.value = true;
		loadFailed.value = false;
		const query = toValue(options.query);
		const page = toValue(options.page);
		const pageSize = toValue(options.pageSize);
		try {
			const result = await listN8nChatAgents(rootStore.restApiContext, {
				query,
				skip: (page - 1) * pageSize,
				take: pageSize,
				sortBy: 'usage:desc',
			});
			if (version !== requestVersion) return;
			agents.value = result.data;
			count.value = result.count;
		} catch (error) {
			if (version !== requestVersion) return;
			agents.value = [];
			count.value = 0;
			loadFailed.value = true;
			toast.showError(error, i18n.baseText('agents.n8nChatPage.library.loadError'));
		} finally {
			if (version === requestVersion) isLoading.value = false;
		}
	}

	function retry(): void {
		void fetchAgents();
	}

	watch(
		[() => toValue(options.query), () => toValue(options.page), () => toValue(options.pageSize)],
		() => {
			void fetchAgents();
		},
		{ immediate: true },
	);

	return { agents, count, isLoading, loadFailed, retry };
}
