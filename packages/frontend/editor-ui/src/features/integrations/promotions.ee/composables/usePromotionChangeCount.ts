import { ref, watch, type Ref } from 'vue';
import type { PromotionDirection } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getPromotableChanges } from '../promotions.api';

/** How many rows the change preview lists for a project in one direction, while `enabled` holds. */
export function usePromotionChangeCount(
	projectId: Ref<string | undefined>,
	direction: PromotionDirection,
	enabled: Ref<boolean>,
) {
	const rootStore = useRootStore();
	const count = ref(0);

	async function fetchCount() {
		// Capture the project this request is for, so a slow response for a project the
		// user already navigated away from cannot overwrite the current count.
		const requestedProjectId = projectId.value;
		count.value = 0;
		if (!enabled.value || !requestedProjectId) {
			return;
		}
		try {
			const { changes } = await getPromotableChanges(
				rootStore.restApiContext,
				requestedProjectId,
				direction,
			);
			if (projectId.value !== requestedProjectId) return;
			count.value = changes.length;
		} catch {
			// A configured direction that is not cloned yet answers 400: no banner.
			if (projectId.value !== requestedProjectId) return;
			count.value = 0;
		}
	}

	watch([projectId, enabled], fetchCount, { immediate: true });

	return { count };
}
