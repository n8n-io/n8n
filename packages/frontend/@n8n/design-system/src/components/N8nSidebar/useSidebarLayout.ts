import { useLocalStorage } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const N8N_SIDEBAR_WIDTH_KEY = 'n8n-sidebar-width';
const N8N_SIDEBAR_STATE_KEY = 'n8n-sidebar-state';

export type SidebarState = 'open' | 'hidden';

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

	const panelIcon = computed(() => {
		return state.value === 'open' ? 'panel-left-close' : 'panel-left-open';
	});

	function toggleSidebar() {
		if (state.value === 'open') {
			state.value = 'hidden';
		} else {
			state.value = 'open';
		}
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
				toggleSidebar();
			}
		});
	});

	onUnmounted(() => {
		window.removeEventListener('keydown', toggleSidebar);
	});

	return {
		state,
		sidebarWidth,
		isResizing,
		panelIcon,
		subMenuOpen,
		toggleSidebar,
		onResizeStart,
		onResize,
		onResizeEnd,
	};
}
