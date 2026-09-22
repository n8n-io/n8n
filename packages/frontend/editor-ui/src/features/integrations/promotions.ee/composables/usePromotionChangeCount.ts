import { ref, watch, type Ref } from 'vue';
import type { PromotionDirection } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useLatestFetch } from '@/app/composables/useLatestFetch';
import { getPromotableChanges } from '../promotions.api';

/** How many rows the change preview lists for a project in one direction, while `enabled` holds. */
export function usePromotionChangeCount(
	projectId: Ref<string | undefined>,
	direction: PromotionDirection,
	enabled: Ref<boolean>,
) {
	const rootStore = useRootStore();
	const { next } = useLatestFetch();
	const count = ref(0);
	/** True when the last check failed, so the banner can say so instead of hiding. */
	const failed = ref(false);

	async function fetchCount() {
		// Only the newest request may write, so a slow answer for a project the user left
		// and came back to cannot overwrite the current state.
		const isLatest = next();
		const requestedProjectId = projectId.value;
		count.value = 0;
		failed.value = false;
		if (!enabled.value || !requestedProjectId) {
			return;
		}
		try {
			const { changes } = await getPromotableChanges(
				rootStore.restApiContext,
				requestedProjectId,
				direction,
			);
			if (isLatest()) count.value = changes.length;
		} catch {
			if (isLatest()) failed.value = true;
		}
	}

	watch([projectId, enabled], fetchCount, { immediate: true });

	return { count, failed, refetch: fetchCount };
}
