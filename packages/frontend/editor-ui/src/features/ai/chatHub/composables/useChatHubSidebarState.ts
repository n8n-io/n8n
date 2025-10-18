import {
	CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY,
	LOCAL_STORAGE_CHAT_HUB_STATIC_SIDEBAR,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useLocalStorage, useMediaQuery } from '@vueuse/core';
import { computed } from 'vue';
import { MOBILE_MEDIA_QUERY } from '../constants';
import { useUsersStore } from '@/features/settings/users/users.store';

export function useChatHubSidebarState() {
	const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
	const uiStore = useUIStore();
	const usersStore = useUsersStore();
	const isStatic = useLocalStorage(
		LOCAL_STORAGE_CHAT_HUB_STATIC_SIDEBAR(usersStore.currentUserId ?? 'anonymous'),
		!isMobileDevice.value,
		{ writeDefaults: false },
	);
	const canBeStatic = computed(() => !isMobileDevice.value);

	function toggleOpen(value?: boolean) {
		const isOpen = !!uiStore.isModalActiveById[CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY];
		const newValue = value ?? !isOpen;

		if (newValue) {
			uiStore.openModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY);
		} else {
			uiStore.closeModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY);
		}
	}

	function toggleStatic(value?: boolean) {
		const newValue = value ?? !isStatic.value;

		isStatic.value = newValue;
		toggleOpen(newValue);
	}

	return {
		canBeStatic,
		isStatic: computed(() => canBeStatic.value && isStatic.value),
		isCollapsed: computed(
			() =>
				!isStatic.value && uiStore.isModalActiveById[CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY] !== true,
		),
		toggleOpen,
		toggleStatic,
	};
}
