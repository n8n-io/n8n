import { useI18n } from '@n8n/i18n';
import type { IStartRunData } from '@/Interface';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import type { WorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IExecutionPushResponse } from '@/features/execution/executions/executions.types';

export function useRunWorkflowApi() {
	const i18n = useI18n();
	const pushConnectionStore = usePushConnectionStore();
	const workflowsStore = useWorkflowsStore();

	async function runWorkflowApi(
		runData: IStartRunData,
		documentId: WorkflowDocumentId,
	): Promise<IExecutionPushResponse> {
		if (!pushConnectionStore.isConnected) {
			throw new Error(i18n.baseText('workflowRun.noActiveConnectionToTheServer'));
		}

		const executionState = useWorkflowExecutionStateStore(documentId);
		// Push handlers only accept this run after the document starts tracking it.
		executionState.setActiveExecutionId(null);

		let response: IExecutionPushResponse;
		try {
			response = await workflowsStore.runWorkflow(runData);
		} catch (error) {
			executionState.setActiveExecutionId(undefined);
			throw error;
		}

		if (
			response.executionId &&
			executionState.previousExecutionId !== response.executionId &&
			executionState.activeExecutionId === null
		) {
			executionState.setActiveExecutionId(response.executionId);
		}
		if (response.waitingForWebhook === true) executionState.setExecutionWaitingForWebhook(true);
		return response;
	}

	return { runWorkflowApi };
}
