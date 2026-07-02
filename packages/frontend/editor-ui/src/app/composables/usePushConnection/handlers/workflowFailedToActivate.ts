import type { WorkflowFailedToActivate } from '@n8n/api-types/push/workflow';
import { useToast } from '@/app/composables/useToast';
import { useActivationError } from '@/app/composables/useActivationError';
import { useI18n } from '@n8n/i18n';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { PushHandlerOptions } from './types';

export async function workflowFailedToActivate(
	{ data }: WorkflowFailedToActivate,
	{ documentId }: PushHandlerOptions,
) {
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);

	if (workflowDocumentStore.workflowId !== data.workflowId) {
		return;
	}

	const settingsStore = useSettingsStore();
	if (settingsStore.isWorkflowPublicationServiceEnabled) {
		// Failed activation is recoverable — preserve the published version and set
		// the lifecycle to 'failed' so the UI can surface the error without clearing
		// the active state.
		workflowDocumentStore.setPublicationStatus({
			status: 'failed',
			failures: data.nodeId
				? [
						{
							nodeId: data.nodeId,
							nodeName: workflowDocumentStore.getNodeById(data.nodeId)?.name ?? data.nodeId,
							errorMessage: data.errorMessage,
						},
					]
				: [],
		});
	} else {
		// Legacy path: clear active state so the UI reflects the deactivated workflow.
		const workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowInactive(data.workflowId);
		workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
	}

	const toast = useToast();
	const i18n = useI18n();
	const { errorMessage } = useActivationError(() => data.nodeId);
	const title = i18n.baseText('workflowActivator.showError.title', {
		interpolate: { newStateName: 'activated' },
	});
	toast.showError(new Error(data.errorMessage), title, {
		message: errorMessage.value,
		description: data.errorDescription,
	});
}
