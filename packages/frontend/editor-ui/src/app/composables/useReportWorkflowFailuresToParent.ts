import { onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import type { IRunData } from 'n8n-workflow';
import { VIEWS } from '@/app/constants';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import type { FixWithAiError } from '@/features/ai/instanceAi/fixWithAi';

function collectErrorsFromRunData(runData: IRunData): FixWithAiError[] {
	const errors: FixWithAiError[] = [];
	for (const [nodeName, tasks] of Object.entries(runData)) {
		const error = tasks?.at(-1)?.error;
		if (!error) continue;
		const description = error.description ? ` (${error.description})` : '';
		errors.push({
			nodeName,
			errorMessage: `${error.message ?? 'Unknown error'}${description}`,
		});
	}
	return errors;
}

/**
 * Lives in the embedded canvas iframe. Listens for `executionFinished` push
 * events on the iframe's own connection (parent has a separate `pushRef`, so
 * iframe-triggered runs are not visible there) and forwards per-node failures
 * to the parent via `postMessage` so the chat can surface a "Fix with AI" card.
 *
 * Reads the per-execution data store (keyed by the executionId we just got the
 * finish event for) once per failed run — by then the in-iframe push handlers
 * have already populated it. Avoids a deep `watch` over the whole run-data tree.
 */
export function useReportWorkflowFailuresToParent() {
	if (window.parent === window) return;

	const route = useRoute();
	const pushStore = usePushConnectionStore();

	const removeListener = pushStore.addEventListener((event) => {
		if (route.name !== VIEWS.DEMO || route.query.canExecute !== 'true') return;
		if (event.type !== 'executionFinished') return;
		if (event.data.status === 'success') return;

		const execStore = useExecutionDataStore(createExecutionDataId(event.data.executionId));
		const runData = execStore.executionRunData;
		if (!runData) return;
		const errors = collectErrorsFromRunData(runData);
		if (errors.length === 0) return;

		window.parent.postMessage(
			JSON.stringify({
				command: 'reportWorkflowFailures',
				workflowId: event.data.workflowId,
				executionId: event.data.executionId,
				errors,
			}),
			window.location.origin,
		);
	});

	onBeforeUnmount(removeListener);
}
