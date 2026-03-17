import { computed, nextTick, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useRoute } from 'vue-router';
import { FLOATING_CHAT_HUB_PANEL_EXPERIMENT } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { EDITABLE_CANVAS_VIEWS } from '@/app/constants';
import type { VIEWS } from '@/app/constants';

function isEnabledView(
	route: string | symbol | undefined,
	views: readonly VIEWS[],
): route is VIEWS {
	return typeof route === 'string' && (views as readonly string[]).includes(route);
}

export const useChatHubPanelStore = defineStore(STORES.CHAT_HUB_PANEL, () => {
	const route = useRoute();
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();

	// State
	const isOpen = ref(false);
	const isPoppedOut = ref(false);

	const isFloatingChatEnabled = computed(
		() =>
			settingsStore.isChatFeatureEnabled &&
			posthogStore.isVariantEnabled(
				FLOATING_CHAT_HUB_PANEL_EXPERIMENT.name,
				FLOATING_CHAT_HUB_PANEL_EXPERIMENT.variant,
			),
	);

	// Actions
	function open() {
		if (!isEnabledView(route?.name, EDITABLE_CANVAS_VIEWS)) return;
		isOpen.value = true;
	}

	function close() {
		if (isPoppedOut.value) {
			// Only set isPoppedOut = false first. This triggers the shouldPopOut
			// watcher in usePopOutWindow -> hidePopOut() moves DOM content back.
			// Don't change isOpen yet — that would trigger Vue to patch DOM
			// still in the pop-out window, causing cross-document insertBefore.
			isPoppedOut.value = false;
			void nextTick(() => {
				isOpen.value = false;
			});
		} else {
			isOpen.value = false;
		}
	}

	function popOut() {
		isPoppedOut.value = true;
	}

	// Close when navigating away from enabled views
	watch(
		() => route?.name,
		(newRoute) => {
			if (!newRoute || !isOpen.value) return;
			if (!isEnabledView(newRoute, EDITABLE_CANVAS_VIEWS)) {
				close();
			}
		},
	);

	return { isOpen, isPoppedOut, isFloatingChatEnabled, open, close, popOut };
});
