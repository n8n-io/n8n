import { computed, watch, type Ref } from 'vue';
import type { PromotionDirection } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	ensurePromotionChanges,
	getPromotionChangesEntry,
	refreshPromotionChanges,
} from './promotionChanges.cache';

/** How many rows the change preview lists for a project in one direction, while `enabled` holds. */
export function usePromotionChangeCount(
	projectId: Ref<string | undefined>,
	direction: PromotionDirection,
	enabled: Ref<boolean>,
) {
	const rootStore = useRootStore();

	// The cache is keyed per project, so one project's result can never show under another.
	const entry = computed(() =>
		enabled.value && projectId.value
			? getPromotionChangesEntry(projectId.value, direction)
			: undefined,
	);

	const count = computed(() => entry.value?.changes.value.length ?? 0);
	/** True when the last check failed, so the banner can say so instead of hiding. */
	const failed = computed(() => !!entry.value?.error.value);
	const isLoading = computed(() => entry.value?.isLoading.value ?? false);
	const lastRefreshedAt = computed(() => entry.value?.lastRefreshedAt.value ?? null);

	async function refetch() {
		if (!enabled.value || !projectId.value) return;
		await refreshPromotionChanges(rootStore.restApiContext, projectId.value, direction);
	}

	watch(
		[projectId, enabled],
		async () => {
			if (!enabled.value || !projectId.value) return;
			await ensurePromotionChanges(rootStore.restApiContext, projectId.value, direction);
		},
		{ immediate: true },
	);

	return { count, failed, isLoading, lastRefreshedAt, refetch };
}
