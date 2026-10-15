import type { PromotionRepository } from '@n8n/api-types';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDebounceFn } from '@vueuse/core';
import { onScopeDispose, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import { fetchPromotionBranches, fetchPromotionRepositories } from '../promotionsSettings.api';

type DiscoveryContext = {
	providerId: string;
	kind: 'repository' | 'branch';
	repositoryId?: string;
	revision?: number;
};

type DiscoveryOption = { value: string; label: string; repository?: PromotionRepository };

/** Loads one searchable list. */
export function usePromotionGitHostDiscovery(context: DiscoveryContext) {
	const rootStore = useRootStore();
	const i18n = useI18n();
	const options = ref<DiscoveryOption[]>([]);
	const search = ref('');
	const loading = ref(false);
	const error = ref<string>();
	let generation = 0;

	async function load(requestGeneration: number) {
		const repositoryId = context.repositoryId;
		if (requestGeneration !== generation || (context.kind === 'branch' && !repositoryId)) return;
		loading.value = true;
		error.value = undefined;
		try {
			const query = { search: search.value || undefined, limit: 25 };
			let pageOptions: DiscoveryOption[];
			if (context.kind === 'repository') {
				const page = await fetchPromotionRepositories(
					rootStore.publicApiContext,
					context.providerId,
					query,
				);
				pageOptions = page.data.map((repository) => ({
					value: repository.remoteUrl,
					label: repository.fullPath,
					repository,
				}));
			} else if (repositoryId) {
				const page = await fetchPromotionBranches(
					rootStore.publicApiContext,
					context.providerId,
					repositoryId,
					query,
				);
				pageOptions = page.data.map((branch) => ({ value: branch.name, label: branch.name }));
			} else return;
			if (requestGeneration !== generation) return;
			options.value = pageOptions;
		} catch (cause) {
			if (requestGeneration !== generation) return;
			error.value =
				cause instanceof Error
					? cause.message
					: i18n.baseText('settings.promotions.discovery.error');
		} finally {
			if (requestGeneration === generation) loading.value = false;
		}
	}

	const debouncedLoad = useDebounceFn(load, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
	function onSearch(value: string) {
		if (context.kind === 'branch' && !context.repositoryId) return;
		const query = value.trim();
		if (query === search.value) return;
		search.value = query;
		options.value = [];
		error.value = undefined;
		loading.value = true;
		void debouncedLoad(++generation);
	}

	function cancel() {
		generation++;
		loading.value = false;
		error.value = undefined;
	}

	watch(
		() => [context.providerId, context.repositoryId, context.kind, context.revision],
		() => {
			cancel();
			search.value = '';
			options.value = [];
			void load(generation);
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		generation++;
	});

	return {
		options,
		search,
		loading,
		error,
		onSearch,
		cancel,
		retry: async () => await load(generation),
	};
}
