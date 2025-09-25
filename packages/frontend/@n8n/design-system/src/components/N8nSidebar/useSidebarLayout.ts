import { useLocalStorage } from '@vueuse/core';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const N8N_SIDEBAR_WIDTH_KEY = 'n8n-sidebar-width';
const N8N_SIDEBAR_STATE_KEY = 'n8n-sidebar-state';

export type SidebarState = 'open' | 'hidden' | 'peak';

export interface UseSidebarLayoutOptions {
	defaultWidth?: number;
}

export function useSidebarLayout({ defaultWidth = 300 }: UseSidebarLayoutOptions) {
	const persistedState = useLocalStorage<SidebarState>(N8N_SIDEBAR_STATE_KEY, 'open', {
		writeDefaults: false,
	});
	const persistedWidth = useLocalStorage<number>(N8N_SIDEBAR_WIDTH_KEY, defaultWidth, {
		writeDefaults: false,
	});

	const state = ref<SidebarState>(persistedState.value);
	const sidebarWidth = ref<number>(persistedWidth.value);
	const isResizing = ref(false);

	const subMenuOpen = ref(false);

	function toggleHidden() {
		if (state.value === 'open' || state.value === 'peak') {
			state.value = 'hidden';
		} else {
			state.value = 'open';
		}
	}

	function togglePeak() {
		if (state.value === 'peak') {
			state.value = 'open';
		} else {
			state.value = 'peak';
		}
	}

	function peakSidebar() {
		state.value = 'peak';
	}

	function onResizeStart() {
		isResizing.value = true;
	}

	function onResize(event: { width: number; x: number }) {
		if (event.x < 30) {
			state.value = 'hidden';
			return;
		}

		sidebarWidth.value = event.width;
	}

	function onResizeEnd() {
		isResizing.value = false;
		persistedWidth.value = sidebarWidth.value;
	}

	function peakMouseOver(event: MouseEvent) {
		if (subMenuOpen.value) return;
		if (event.relatedTarget == null) {
			return;
		}

		const target = event.relatedTarget as Element;

		const isSidebar = target.closest('.sidebar') || target.closest('.resizeWrapper');
		const isInteractiveArea = target.closest('.interactiveArea');

		if (state.value === 'peak' && !isSidebar && !isInteractiveArea && !isResizing.value) {
			state.value = 'hidden';
		}
	}

	watch(state, (newState) => {
		persistedState.value = newState;
	});

	onMounted(() => {
		window.addEventListener('keydown', (event) => {
			if (event.key === '[') {
				const target = event.target as HTMLElement;
				if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
					return;
				}
				toggleHidden();
			}
		});
	});

	onUnmounted(() => {
		window.removeEventListener('keydown', togglePeak);
	});

	return {
		state,
		sidebarWidth,
		isResizing,
		subMenuOpen,
		toggleHidden,
		togglePeak,
		peakSidebar,
		onResizeStart,
		onResize,
		onResizeEnd,
		peakMouseOver,
	};
}
