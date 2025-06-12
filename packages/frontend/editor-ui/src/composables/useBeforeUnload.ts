import { useCanvasStore } from '@/stores/canvas.store';
import { useUIStore } from '@/stores/ui.store';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { VIEWS } from '@/constants';
import type { useRoute } from 'vue-router';

/**
 * Composable to handle the beforeunload event in canvas views.
 *
 * This hook will prevent closing the tab and prompt the user if the ui state is dirty
 * (workflow has changes) and the user tries to leave the page.
 */

export function useBeforeUnload({ route }: { route: ReturnType<typeof useRoute> }) {
	const uiStore = useUIStore();
	const canvasStore = useCanvasStore();

	const i18n = useI18n();

	const unloadTimeout = ref<NodeJS.Timeout | null>(null);
	const isDemoRoute = computed(() => route.name === VIEWS.DEMO);

	type Handler = () => void;
	const handlers: Handler[] = [];

	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (isDemoRoute.value || window.preventNodeViewBeforeUnload) {
			return;
		}

		handlers.forEach((handler) => handler());

		if (uiStore.stateIsDirty) {
			e.returnValue = true; //Gecko + IE
			return true; //Gecko + Webkit, Safari, Chrome etc.
		} else {
			canvasStore.startLoading(i18n.baseText('nodeView.redirecting'));
			return;
		}
	}

	function addBeforeUnloadHandler(handler: () => void) {
		handlers.push(handler);
	}

	function addBeforeUnloadEventBindings() {
		window.addEventListener('beforeunload', onBeforeUnload);
	}

	function removeBeforeUnloadEventBindings() {
		if (unloadTimeout.value) {
			clearTimeout(unloadTimeout.value);
		}

		window.removeEventListener('beforeunload', onBeforeUnload);
	}

	return {
		onBeforeUnload,
		addBeforeUnloadEventBindings,
		removeBeforeUnloadEventBindings,
		addBeforeUnloadHandler,
	};
}
