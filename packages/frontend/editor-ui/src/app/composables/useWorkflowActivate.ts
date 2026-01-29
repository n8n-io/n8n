import { useStorage } from '@/app/composables/useStorage';

import {
	LOCAL_STORAGE_ACTIVATION_FLAG,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
} from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import type { INode } from 'n8n-workflow';
import type { ResponseError } from '@n8n/rest-api-client/utils';
import type { findWebhook } from '@n8n/rest-api-client/api/webhooks';

export function useWorkflowActivate() {
	const updatingWorkflowActivation = ref(false);

	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();
	const collaborationStore = useCollaborationStore();

	const parseWebhookConflictError = (error: ResponseError) => {
		try {
			const { errorCode, hint } = error;
			if (errorCode === 409) {
				const parsedHint = JSON.parse(hint ?? '') as Array<{
					trigger: INode;
					conflict: Awaited<ReturnType<typeof findWebhook>>;
				}>;
				if (
					Array.isArray(parsedHint) &&
					parsedHint.length > 0 &&
					Object.hasOwn(parsedHint[0] as object, 'trigger')
				) {
					return parsedHint;
				}
			}
			return null;
		} catch {
			return null;
		}
	};

	const handleWebhookConflictError = async (error: ResponseError) => {
		const { trigger, conflict } = parseWebhookConflictError(error)?.pop() || {};
		let workflowName = conflict?.workflowId;
		try {
			if (conflict?.workflowId) {
				const conflictingWorkflow = await workflowsListStore.fetchWorkflow(conflict?.workflowId);
				workflowName = conflictingWorkflow.name;
			}
		} catch {}

		uiStore.openModalWithData({
			name: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
			data: {
				triggerType: trigger?.type,
				workflowName,
				...conflict,
			},
		});
	};

	const isWebhookConflictError = (error: ResponseError) => {
		return parseWebhookConflictError(error) !== null;
	};

	const publishWorkflow = async (
		workflowId: string,
		versionId: string,
		options?: { name?: string; description?: string },
	) => {
		updatingWorkflowActivation.value = true;

		collaborationStore.requestWriteAccess();

		const workflow = workflowsListStore.getWorkflowById(workflowId);
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
			return { success: true };
		} catch (error) {
			if (isWebhookConflictError(error)) {
				await handleWebhookConflictError(error);
				return { success: false, errorHandled: true };
			} else {
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
			}
			return { success: false };
		} finally {
			updatingWorkflowActivation.value = false;
		}
	};

	const unpublishWorkflowFromHistory = async (workflowId: string) => {
		updatingWorkflowActivation.value = true;

		collaborationStore.requestWriteAccess();

		const workflow = workflowsListStore.getWorkflowById(workflowId);
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
