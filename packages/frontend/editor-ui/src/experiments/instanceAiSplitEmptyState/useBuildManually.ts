import { useRouter } from 'vue-router';

import { NODE_CREATOR_OPEN_SOURCES, VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

/**
 * Shared "build manually" escape hatch for the split-empty-state experiment.
 * Opens a fresh workflow with the trigger node-creator already open, matching
 * the behaviour of the canvas "Add first step" button. Used by both the teaser
 * canvas (examples-below-input variant) and the header CTA (manual-build-cta
 * variant).
 *
 * Experiment cleanup: remove with instanceAiSplitEmptyState.
 */
export function useBuildManually() {
	const router = useRouter();
	const uiStore = useUIStore();

	function buildManually(projectId?: string) {
		uiStore.addFirstStepOnLoad = true;
		// Attribute the manual build to Instance AI (the 'User opened nodes panel'
		// event). Generic on purpose — reused by future Instance AI experiments.
		uiStore.addFirstStepOnLoadSource = NODE_CREATOR_OPEN_SOURCES.INSTANCE_AI;
		void router.push({
			name: VIEWS.NEW_WORKFLOW,
			query: projectId ? { projectId } : {},
		});
	}

	return { buildManually };
}
