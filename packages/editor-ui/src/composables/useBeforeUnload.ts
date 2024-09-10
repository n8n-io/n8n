import { useCanvasStore } from '@/stores/canvas.store';
import { useUIStore } from '@/stores/ui.store';
import { useI18n } from '@/composables/useI18n';
import { computed, ref } from 'vue';
import { TIME, VIEWS } from '@/constants';
import type { useRoute } from 'vue-router';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

/**
 * Composable to handle the beforeunload event in canvas views.
 *
 * This hook will prevent closing the tab and prompt the user if the ui state is dirty
 * (workflow has changes) and the user tries to leave the page.
 */

export function useBeforeUnload({ route }: { route: ReturnType<typeof useRoute> }) {
	const uiStore = useUIStore();
	const canvasStore = useCanvasStore();
	const collaborationStore = useCollaborationStore();
	const workflowsStore = useWorkflowsStore();

	const i18n = useI18n();

	const unloadTimeout = ref<NodeJS.Timeout | null>(null);
	const isDemoRoute = computed(() => route.name === VIEWS.DEMO);

	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (isDemoRoute.value || window.preventNodeViewBeforeUnload) {
			return;
		} else if (uiStore.stateIsDirty) {
			// A bit hacky solution to detecting users leaving the page after prompt:
			// 1. Notify that workflow is closed straight away
			collaborationStore.notifyWorkflowClosed(workflowsStore.workflowId);
			// 2. If user decided to stay on the page we notify that the workflow is opened again
			unloadTimeout.value = setTimeout(() => {
				collaborationStore.notifyWorkflowOpened(workflowsStore.workflowId);
			}, 5 * TIME.SECOND);

			e.returnValue = true; //Gecko + IE
			return true; //Gecko + Webkit, Safari, Chrome etc.
		} else {
			canvasStore.startLoading(i18n.baseText('nodeView.redirecting'));
			collaborationStore.notifyWorkflowClosed(workflowsStore.workflowId);
			return;
		}
	}

	function addBeforeUnloadEventBindings() {
		window.addEventListener('beforeunload', onBeforeUnload);
	}

	function removeBeforeUnloadEventBindings() {
		collaborationStore.notifyWorkflowClosed(workflowsStore.workflowId);

		if (unloadTimeout.value) {
			clearTimeout(unloadTimeout.value);
		}

		window.removeEventListener('beforeunload', onBeforeUnload);
	}

	return {
		onBeforeUnload,
		addBeforeUnloadEventBindings,
		removeBeforeUnloadEventBindings,
	};
}
