import { useCanvasStore } from '@/stores/canvas.store';
import { useUIStore } from '@/stores/ui.store';
import { useI18n } from '@/composables/useI18n';
import { computed } from 'vue';
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

	const isDemoRoute = computed(() => route.name === VIEWS.DEMO);

	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (isDemoRoute.value || window.preventNodeViewBeforeUnload) {
			return;
		} else if (uiStore.stateIsDirty) {
			e.returnValue = true; //Gecko + IE
			return true; //Gecko + Webkit, Safari, Chrome etc.
		} else {
			canvasStore.startLoading(i18n.baseText('nodeView.redirecting'));
			return;
		}
	}

	function addBeforeUnloadEventBindings() {
		window.addEventListener('beforeunload', onBeforeUnload);
	}

	function removeBeforeUnloadEventBindings() {
		window.removeEventListener('beforeunload', onBeforeUnload);
	}

	return {
		onBeforeUnload,
		addBeforeUnloadEventBindings,
		removeBeforeUnloadEventBindings,
	};
}
