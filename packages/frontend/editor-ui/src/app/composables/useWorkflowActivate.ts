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
import { useActivationError } from '@/app/composables/useActivationError';
import type { INode } from 'n8n-workflow';
import type { ResponseError } from '@n8n/rest-api-client/utils';
import type { findWebhook } from '@n8n/rest-api-client/api/webhooks';
import type { RefOrComputedRef } from '@/app/types';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

export function useWorkflowActivate(workflowId: RefOrComputedRef<string>) {
	const updatingWorkflowActivation = ref(false);
	const activationErrorNodeId = ref<string | undefined>();

	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const toast = useToast(workflowId);
	const i18n = useI18n();
	const collaborationStore = useCollaborationStore();
	const { errorMessage: activationErrorMessage } = useActivationError(
		workflowId,
		activationErrorNodeId,
	);

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
		targetWorkflowId: string,
		versionId: string,
		options?: { name?: string; description?: string },
	) => {
		updatingWorkflowActivation.value = true;

		collaborationStore.requestWriteAccess();

		const workflow = workflowsListStore.getWorkflowById(targetWorkflowId);
		const hadPublishedVersion = !!workflow.activeVersion;

		if (!hadPublishedVersion) {
			const telemetryPayload = {
				workflow_id: targetWorkflowId,
				is_active: true,
				previous_status: false,
				ndv_input: false,
			};
			void useExternalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);
		}

		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(targetWorkflowId),
		);

		try {
			const expectedChecksum =
				targetWorkflowId === workflowId.value ? workflowDocumentStore.checksum : undefined;

			const updatedWorkflow = await workflowsStore.publishWorkflow(targetWorkflowId, {
				versionId,
				name: options?.name,
				description: options?.description,
				expectedChecksum,
			});

			if (!updatedWorkflow.activeVersion || !updatedWorkflow.checksum) {
				throw new Error('Failed to publish workflow');
			}
			workflowsStore.setWorkflowActive(targetWorkflowId, updatedWorkflow.activeVersion, true);
			workflowDocumentStore.setActiveState({
				activeVersionId: updatedWorkflow.activeVersion.versionId,
				activeVersion: updatedWorkflow.activeVersion,
			});

			if (targetWorkflowId === workflowId.value) {
				workflowDocumentStore.setVersionData({
					versionId: updatedWorkflow.versionId,
					name: workflowDocumentStore.versionData?.name ?? null,
					description: workflowDocumentStore.versionData?.description ?? null,
				});
				if (updatedWorkflow.checksum) {
					workflowDocumentStore.setChecksum(updatedWorkflow.checksum);
				}
			}

			void useExternalHooks().run('workflow.published', {
				workflowId: targetWorkflowId,
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
				activationErrorNodeId.value = error.meta?.nodeId as string | undefined;
				const title = i18n.baseText('workflowActivator.showError.title', {
					interpolate: { newStateName: 'published' },
				});
				toast.showError(error, title, {
					message: activationErrorMessage.value,
					description: error.meta?.description as string | undefined,
				});

				// Only update workflow state to inactive if this is not a validation error
				if (!error.meta?.validationError) {
					workflowsStore.setWorkflowInactive(targetWorkflowId);
					workflowDocumentStore.setActiveState({
						activeVersionId: null,
						activeVersion: null,
					});
				}
			}
			return { success: false, errorHandled: true };
		} finally {
			updatingWorkflowActivation.value = false;
		}
	};

	const unpublishWorkflowFromHistory = async (targetWorkflowId: string) => {
		updatingWorkflowActivation.value = true;

		collaborationStore.requestWriteAccess();

		const workflow = workflowsListStore.getWorkflowById(targetWorkflowId);
		const wasPublished = !!workflow.activeVersion;

		const telemetryPayload = {
			workflow_id: targetWorkflowId,
			is_active: false,
			previous_status: wasPublished,
			ndv_input: false,
		};

		telemetry.track('User set workflow active status', telemetryPayload);
		void useExternalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(targetWorkflowId),
		);
		try {
			const expectedChecksum =
				targetWorkflowId === workflowId.value ? workflowDocumentStore.checksum : undefined;

			await workflowsStore.deactivateWorkflow(targetWorkflowId, expectedChecksum);
			workflowDocumentStore.setActiveState({
				activeVersionId: null,
				activeVersion: null,
			});

			void useExternalHooks().run('workflow.unpublished', {
				workflowId: targetWorkflowId,
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
