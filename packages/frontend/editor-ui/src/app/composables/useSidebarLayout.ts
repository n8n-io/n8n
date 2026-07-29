import { computed, ref } from 'vue';
import { useUIStore } from '../stores/ui.store';

// Matches `$sidebar-width` in `app/css/_variables.scss`.
export const COLLAPSED_MAIN_SIDEBAR_WIDTH = 42;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 500;

export function useSidebarLayout() {
	const uiStore = useUIStore();
	const isCollapsed = computed(() => uiStore.sidebarMenuCollapsed ?? false);

	// The persisted width can be stale or corrupted (e.g. written by an older
	// version, or edited outside the app), and it is applied as an inline width
	// on expand. Clamp it on read so the sidebar always expands to a usable width.
	const sidebarWidth = computed<number>({
		get: () => {
			const width = uiStore.sidebarWidth;
			if (!Number.isFinite(width)) return MIN_SIDEBAR_WIDTH;
			return Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
		},
		set: (width) => {
			uiStore.sidebarWidth = width;
		},
	});

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
