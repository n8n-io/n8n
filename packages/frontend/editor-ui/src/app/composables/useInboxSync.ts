import { useInboxStore } from '@n8n/frontend-module-inbox';
import { useEventListener } from '@vueuse/core';
import { onScopeDispose, watch } from 'vue';

import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

/** Keep shell transport dependencies outside the Inbox package. */
export function useInboxSync() {
	const inboxStore = useInboxStore();
	const pushStore = usePushConnectionStore();
	function refresh() {
		if (document.hidden || !inboxStore.enabled) return;
		if (inboxStore.isActive) void inboxStore.refreshVisibleInbox();
		else void inboxStore.fetchSummary();
	}
	function refreshSummaryOnReturn() {
		// The mounted Inbox owns its list and detail refresh on return.
		if (!inboxStore.isActive) refresh();
	}
	useEventListener(window, 'focus', refreshSummaryOnReturn);
	useEventListener(document, 'visibilitychange', refreshSummaryOnReturn);
	const removeListener = pushStore.addEventListener((event) => {
		if (event.type === 'workflowReviewStateChanged') refresh();
	});
	watch(
		() => pushStore.isConnected,
		(connected, previous) => {
			if (connected && !previous) refresh();
		},
	);
	onScopeDispose(removeListener);
}
