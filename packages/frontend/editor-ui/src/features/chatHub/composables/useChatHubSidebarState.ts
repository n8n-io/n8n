import { CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useMediaQuery } from '@vueuse/core';
import { computed } from 'vue';
import { MOBILE_MEDIA_QUERY } from '../constants';

export function useChatHubSidebarState() {
	const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
	const uiStore = useUIStore();
	const isCollapsible = computed(() => isMobileDevice.value);

	return {
		isCollapsible,
		isCollapsed: computed(
			() =>
				isCollapsible.value &&
				uiStore.isModalActiveById[CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY] !== true,
		),
	};
}
