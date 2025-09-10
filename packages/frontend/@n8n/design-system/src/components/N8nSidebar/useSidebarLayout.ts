import { useLocalStorage } from '@vueuse/core';
import { ref } from 'vue';

const N8N_SIDEBAR_WIDTH_KEY = 'n8n-sidebar-width';

export interface UseSidebarLayoutOptions {
	defaultWidth?: number;
}

export function useSidebarLayout({ defaultWidth = 300 }: UseSidebarLayoutOptions) {
	const persistedWidth = useLocalStorage<number>(N8N_SIDEBAR_WIDTH_KEY, defaultWidth, {
		writeDefaults: false,
	});

	const sidebarWidth = ref<number>(persistedWidth.value);
	const isResizing = ref(false);

	const subMenuOpen = ref(false);

	function onResizeStart() {
		isResizing.value = true;
	}

	function onResize(event: { width: number; x: number }) {
		sidebarWidth.value = event.width;
	}

	function onResizeEnd() {
		isResizing.value = false;
		persistedWidth.value = sidebarWidth.value;
	}

	return {
		sidebarWidth,
		isResizing,
		subMenuOpen,
		onResizeStart,
		onResize,
		onResizeEnd,
	};
}
