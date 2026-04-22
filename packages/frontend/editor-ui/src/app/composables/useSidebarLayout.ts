import { computed, ref, toRef } from 'vue';
import { useUIStore } from '../stores/ui.store';

export function useSidebarLayout() {
	const uiStore = useUIStore();
	const isCollapsed = computed(() => uiStore.sidebarMenuCollapsed ?? false);
	const sidebarWidth = toRef(uiStore, 'sidebarWidth');

	const toggleCollapse = () => {
		uiStore.toggleSidebarMenuCollapse();
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
