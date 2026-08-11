import type { PushMessage } from '@n8n/api-types';
import { onBeforeUnmount, onMounted, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';

/**
 * Keeps the review-status store in sync with the backend for the given
 * workflow. Push messages are treated purely as invalidation signals.
 */
export function useWorkflowReviewStatusSync(workflowId: MaybeRefOrGetter<string | undefined>) {
	const pushStore = usePushConnectionStore();
	const reviewStatusStore = useWorkflowReviewStatusStore();
	const { isWorkflowReviewsEnabled } = useWorkflowReviewsFeature();
	const { onDocumentVisible } = useDocumentVisibility();

	async function refetch() {
		// Re-check the feature gate on every call — it can be disabled mid-session.
		if (!isWorkflowReviewsEnabled.value) return;

		const id = toValue(workflowId);
		if (!id) return;

		await reviewStatusStore.fetchStatus(id);
	}

	function onPushMessage(event: PushMessage) {
		if (
			event.type === 'workflowReviewStateChanged' &&
			event.data.workflowId === toValue(workflowId)
		) {
			void refetch();
		}
	}

	const removePushListener = pushStore.addEventListener(onPushMessage);

	// Re-sync when the user navigates to another workflow without a remount.
	watch(
		() => toValue(workflowId),
		() => void refetch(),
	);

	// On reconnect, refetch to recover invalidations missed while offline.
	watch(
		() => pushStore.isConnected,
		(isConnected, wasConnected) => {
			if (isConnected && !wasConnected) void refetch();
		},
	);

	onMounted(() => void refetch());
	onDocumentVisible(() => void refetch());
	onBeforeUnmount(() => removePushListener());

	return { refetch };
}
