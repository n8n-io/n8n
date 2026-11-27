import { useEngineV2FindingsDialog } from '@n8n/frontend-module-engine-v2';
import { useRoute, useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';

/**
 * Opens the engine v2 findings of a workflow. The dialog lives on the canvas, because "Go to
 * node" needs it, so another tab of the workflow (for example Executions) goes to the editor
 * first.
 */
export function useOpenEngineV2Findings() {
	const route = useRoute();
	const router = useRouter();
	const findingsDialog = useEngineV2FindingsDialog();

	return async function openEngineV2Findings(workflowId: string) {
		if (route.meta?.nodeView !== true) {
			// A guard can refuse or redirect the move. Then nothing opens, so that a later canvas
			// doesn't open it.
			const failure = await router.push({ name: VIEWS.WORKFLOW, params: { workflowId } });
			const { meta, params } = router.currentRoute.value;
			if (failure || meta.nodeView !== true || params.workflowId !== workflowId) return;
		}
		findingsDialog.open();
	};
}
