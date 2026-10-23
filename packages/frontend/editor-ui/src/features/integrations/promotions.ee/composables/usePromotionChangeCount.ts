import { ref, watch, type Ref } from 'vue';
import type { PromotionDirection } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useLatestFetch } from '@/app/composables/useLatestFetch';
import { getPromotionPreview } from '../promotions.api';
import { buildSelectionGraph, totalChangeCount } from '../promotionPreview.selection';

/** How many changes the preview lists for a project in one direction, while `enabled` holds. */
export function usePromotionChangeCount(
	projectId: Ref<string | undefined>,
	direction: PromotionDirection,
	enabled: Ref<boolean>,
) {
	const rootStore = useRootStore();
	const { next } = useLatestFetch();
	/** All changed resources that the preview page can include. */
	const changeCount = ref(0);
	const loading = ref(false);
	/** True when the last check failed, so the badge can show the failure. */
	const failed = ref(false);

	async function fetchCount() {
		// Only the newest request may write, so a slow answer for a project the user left
		// and came back to cannot overwrite the current state.
		const isLatest = next();
		const requestedProjectId = projectId.value;
		changeCount.value = 0;
		failed.value = false;
		loading.value = false;
		if (!enabled.value || !requestedProjectId) {
			return;
		}
		loading.value = true;
		try {
			const preview = await getPromotionPreview(
				rootStore.restApiContext,
				requestedProjectId,
				direction,
			);
			if (!isLatest()) return;
			changeCount.value = totalChangeCount(buildSelectionGraph(preview, direction));
		} catch {
			if (isLatest()) failed.value = true;
		} finally {
			if (isLatest()) loading.value = false;
		}
	}

	watch([projectId, enabled], fetchCount, { immediate: true });

	return { changeCount, loading, failed, refetch: fetchCount };
}
