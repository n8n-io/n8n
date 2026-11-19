import { computed, ref, watch, type Ref } from 'vue';
import type { PromotionBlocker, PromotionDirection } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { getPromotionPreview } from '../promotions.api';
import { isPreviewNotConfigured } from '../promotionErrors';
import { buildSelectionGraph, totalChangeCount } from '../promotionPreview.selection';

/**
 * Delay the first spinner so a fast answer shows no flash. A direction without an environment
 * usually answers within this time. A real count reads the branch and usually takes longer.
 */
const SPINNER_DELAY_MS = 300;

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
	/** Set when an open review already holds the changes. The preview then lists none. */
	const blocker = ref<PromotionBlocker | null>(null);
	/**
	 * `null` until the first answer for the project. `true` when the project has no environment
	 * for the direction. A refetch keeps the last answer, so a badge does not flash.
	 */
	const missing = ref<boolean | null>(null);
	/** True when the first answer for the project takes longer than the spinner delay. */
	const slow = ref(false);
	/** Whether the badge shows: once the direction has an environment, or while a slow first check runs. */
	const visible = computed(() => missing.value === false || slow.value);
	/** The name of the environment that the preview reads. */
	const environmentName = ref<string | null>(null);

	async function fetchCount() {
		// Only the newest request may write, so a slow answer for a project the user left
		// and came back to cannot overwrite the current state.
		const isLatest = next();
		const requestedProjectId = projectId.value;
		changeCount.value = 0;
		failed.value = false;
		loading.value = false;
		blocker.value = null;
		if (!enabled.value || !requestedProjectId) {
			return;
		}
		loading.value = true;
		const spinnerTimer =
			missing.value === null
				? setTimeout(() => {
						if (isLatest()) slow.value = true;
					}, SPINNER_DELAY_MS)
				: undefined;
		try {
			const preview = await getPromotionPreview(
				rootStore.publicApiContext,
				requestedProjectId,
				direction,
			);
			if (!isLatest()) return;
			changeCount.value = totalChangeCount(buildSelectionGraph(preview, direction));
			blocker.value = preview.blocker ?? null;
			environmentName.value = preview.environment.name;
			missing.value = false;
		} catch (error) {
			if (!isLatest()) return;
			missing.value = isPreviewNotConfigured(error);
			failed.value = !missing.value;
		} finally {
			clearTimeout(spinnerTimer);
			if (isLatest()) {
				loading.value = false;
				slow.value = false;
			}
		}
	}

	watch(
		[projectId, enabled],
		async () => {
			missing.value = null;
			slow.value = false;
			await fetchCount();
		},
		{ immediate: true },
	);

	return { changeCount, loading, failed, blocker, visible, environmentName, refetch: fetchCount };
}
