import type { PromotionRepository } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onScopeDispose, ref, watch } from 'vue';

import { fetchPromotionRepositories } from '../promotionsSettings.api';

type RepositoryResolutionOptions = {
	providerId: () => string | undefined;
	remoteUrl: () => string;
	onResolved: (repository: PromotionRepository) => void;
};

/** Resolves a saved clone URL without changing the user's discovery query. */
export function usePromotionRepositoryResolution(options: RepositoryResolutionOptions) {
	const rootStore = useRootStore();
	const i18n = useI18n();
	const repository = ref<PromotionRepository>();
	const loading = ref(false);
	const error = ref<string>();
	let generation = 0;
	let attempted = false;

	function select(selected: PromotionRepository) {
		generation++;
		attempted = true;
		loading.value = false;
		error.value = undefined;
		repository.value = selected;
	}

	function resolve(selected: PromotionRepository) {
		select(selected);
		options.onResolved(selected);
	}

	async function retry() {
		const providerId = options.providerId();
		const remoteUrl = options.remoteUrl();
		if (!providerId || !remoteUrl || repository.value?.remoteUrl === remoteUrl) return;
		const requestGeneration = ++generation;
		attempted = true;
		loading.value = true;
		error.value = undefined;
		try {
			const search = new URL(remoteUrl).pathname
				.split('/')
				.at(-1)
				?.replace(/\.git$/, '');
			let cursor: string | undefined;
			do {
				const page = await fetchPromotionRepositories(rootStore.publicApiContext, providerId, {
					search,
					cursor,
					limit: 100,
				});
				if (requestGeneration !== generation) return;
				const match = page.data.find((item) => item.remoteUrl === remoteUrl);
				if (match) {
					resolve(match);
					return;
				}
				cursor = page.nextCursor ?? undefined;
			} while (cursor);
			throw new Error(i18n.baseText('settings.promotions.discovery.repository.unavailable'));
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

	function receivePage(repositories: PromotionRepository[]) {
		const remoteUrl = options.remoteUrl();
		if (!options.providerId() || !remoteUrl || repository.value?.remoteUrl === remoteUrl) return;
		const match = repositories.find((item) => item.remoteUrl === remoteUrl);
		if (match) resolve(match);
		else if (!attempted) void retry();
	}

	watch(
		[options.providerId, options.remoteUrl],
		([providerId, remoteUrl], [previousProviderId]) => {
			if (providerId === previousProviderId && repository.value?.remoteUrl === remoteUrl) return;
			generation++;
			attempted = false;
			repository.value = undefined;
			loading.value = false;
			error.value = undefined;
		},
		{ flush: 'sync' },
	);

	onScopeDispose(() => {
		generation++;
	});

	return { repository, loading, error, receivePage, select, retry };
}
