import { computed, ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useUIStore } from '../stores/ui.store';
import { LOCAL_STORAGE_SIDEBAR_WIDTH } from '../constants';

export function useSidebarLayout() {
	const uiStore = useUIStore();
	const isCollapsed = computed(() => uiStore.sidebarMenuCollapsed);
	const sidebarWidth = useLocalStorage(LOCAL_STORAGE_SIDEBAR_WIDTH, isCollapsed.value ? 42 : 300);

	const toggleCollapse = () => {
		uiStore.toggleSidebarMenuCollapse();
		if (!isCollapsed.value) {
			sidebarWidth.value = 200;
		} else {
			sidebarWidth.value = 42;
		}
	};

	const isResizing = ref(false);

	function onResizeStart() {
		isResizing.value = true;
	}

	function onResize(event: { width: number; x: number }) {
		if (isCollapsed.value && event.x > 100) {
			toggleCollapse();
			return;
		}

		if (isCollapsed.value) {
			return;
		}

		if (event.x < 100 && !isCollapsed.value) {
			toggleCollapse();
			return;
		}

		sidebarWidth.value = event.width;
	}

	function onResizeEnd() {
		isResizing.value = false;
	}

	return {
		isCollapsed,
		toggleCollapse,
		sidebarWidth,
		isResizing,
		onResizeStart,
		onResize,
		onResizeEnd,
	};
}
