import { SIDE_PANEL_RAIL_WIDTH, useSidePanelStore } from '@n8n/frontend-module-ui-extensions';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

/**
 * Whether the side panel shows, and how much width it takes at the right edge of
 * the app. Floating UI (toasts, the node creator) moves left by that width.
 */
export function useAppSidePanelLayout() {
	const route = useRoute();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const sidePanelStore = useSidePanelStore();

	// Every page behind the login, except the demo canvas.
	const isVisible = computed(() => {
		const layout = route?.meta?.layout;
		return (
			settingsStore.isModuleActive('ui-extensions') &&
			!!usersStore.currentUser &&
			layout !== 'auth' &&
			layout !== 'demo'
		);
	});

	const width = computed(() => {
		if (!isVisible.value) return 0;
		return SIDE_PANEL_RAIL_WIDTH + (sidePanelStore.isOpen ? sidePanelStore.width : 0);
	});

	return { isVisible, width };
}
