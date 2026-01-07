import { useStorage } from '@/app/composables/useStorage';

import { LOCAL_STORAGE_ACTIVATION_FLAG, WORKFLOW_ACTIVE_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

export function useWorkflowActivate() {
	const updatingWorkflowActivation = ref(false);

	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();

	const publishWorkflow = async (
		workflowId: string,
		versionId: string,
		options?: { name?: string; description?: string },
	) => {
		updatingWorkflowActivation.value = true;
		const workflow = workflowsStore.getWorkflowById(workflowId);
		const hadPublishedVersion = !!workflow.activeVersion;

		if (!hadPublishedVersion) {
			const telemetryPayload = {
				workflow_id: workflowId,
				is_active: true,
				previous_status: false,
				ndv_input: false,
			};
			void useExternalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);
		}

		try {
			const expectedChecksum =
				workflowId === workflowsStore.workflowId ? workflowsStore.workflowChecksum : undefined;

			const updatedWorkflow = await workflowsStore.publishWorkflow(workflowId, {
				versionId,
				name: options?.name,
				description: options?.description,
				expectedChecksum,
			});

			if (!updatedWorkflow.activeVersion || !updatedWorkflow.checksum) {
				throw new Error('Failed to publish workflow');
			}

			workflowsStore.setWorkflowActive(workflowId, updatedWorkflow.activeVersion, true);

			if (workflowId === workflowsStore.workflowId) {
				workflowsStore.setWorkflowVersionId(updatedWorkflow.versionId, updatedWorkflow.checksum);
			}

			void useExternalHooks().run('workflow.published', {
				workflowId,
				versionId: updatedWorkflow.activeVersion.versionId,
			});

			if (!hadPublishedVersion && useStorage(LOCAL_STORAGE_ACTIVATION_FLAG).value !== 'true') {
				uiStore.openModal(WORKFLOW_ACTIVE_MODAL_KEY);
			}
			return true;
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText('workflowActivator.showError.title', {
					interpolate: { newStateName: 'published' },
				}) + ':',
			);
			// Only update workflow state to inactive if this is not a validation error
			if (!error.meta?.validationError) {
				workflowsStore.setWorkflowInactive(workflowId);
			}
			return false;
		} finally {
			updatingWorkflowActivation.value = false;
		}
	};

	const unpublishWorkflowFromHistory = async (workflowId: string) => {
		updatingWorkflowActivation.value = true;

		const workflow = workflowsStore.getWorkflowById(workflowId);
		const wasPublished = !!workflow.activeVersion;

		const telemetryPayload = {
			workflow_id: workflowId,
			is_active: false,
			previous_status: wasPublished,
			ndv_input: false,
		};

		telemetry.track('User set workflow active status', telemetryPayload);
		void useExternalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);

		try {
			await workflowsStore.deactivateWorkflow(workflowId);

			void useExternalHooks().run('workflow.unpublished', {
				workflowId,
			});

			return true;
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText('workflowActivator.showError.title', {
					interpolate: { newStateName: 'deactivated' },
				}) + ':',
			);
			return false;
		} finally {
			updatingWorkflowActivation.value = false;
		}
	};

	return {
		updatingWorkflowActivation,
		publishWorkflow,
		unpublishWorkflowFromHistory,
	};
}
