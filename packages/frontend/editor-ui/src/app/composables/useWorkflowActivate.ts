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

			// Always clear gradual rollout from database when publishing
			// (backend handles case where there's no active rollout)
			try {
				await workflowsStore.removeGradualRollout(workflowId);
			} catch {
				// Ignore errors - rollout may not exist
			}

			if (workflowId === workflowsStore.workflowId) {
				workflowsStore.setWorkflowVersionData(
					{
						versionId: updatedWorkflow.versionId,
						name: workflowsStore.versionData?.name ?? null,
						description: workflowsStore.versionData?.description ?? null,
					},
					updatedWorkflow.checksum,
				);
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
			const expectedChecksum =
				workflowId === workflowsStore.workflowId ? workflowsStore.workflowChecksum : undefined;

			await workflowsStore.deactivateWorkflow(workflowId, expectedChecksum);

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

	const gradualPublishWorkflow = async (
		workflowId: string,
		options: { versionId?: string; percentage: number; name?: string; description?: string },
	) => {
		updatingWorkflowActivation.value = true;

		collaborationStore.requestWriteAccess();

		try {
			if (options.percentage === 0) {
				// Rollback: Remove gradual rollout, keep current active version
				await workflowsStore.removeGradualRollout(workflowId);
				toast.showMessage({
					title: i18n.baseText('workflowHistory.gradualRollout.rollback.success.title'),
					message: i18n.baseText('workflowHistory.gradualRollout.rollback.success.message'),
					type: 'success',
				});
				return { success: true, gradualRolloutState: null };
			} else if (options.percentage === 100) {
				// Complete rollout: Promote rollout version to active, then clear gradual rollout
				if (!options.versionId) {
					throw new Error('Version ID is required to complete rollout');
				}
				const expectedChecksum =
					workflowId === workflowsStore.workflowId ? workflowsStore.workflowChecksum : undefined;

				await workflowsStore.publishWorkflow(workflowId, {
					versionId: options.versionId,
					name: options.name,
					description: options.description,
					expectedChecksum,
				});
				await workflowsStore.removeGradualRollout(workflowId);
				toast.showMessage({
					title: i18n.baseText('workflowHistory.gradualRollout.complete.success.title'),
					message: i18n.baseText('workflowHistory.gradualRollout.complete.success.message'),
					type: 'success',
				});
				return { success: true, gradualRolloutState: null };
			} else {
				// Start/adjust gradual rollout (1-99%)
				const gradualRolloutState = await workflowsStore.gradualPublishWorkflow(workflowId, {
					versionId: options.versionId,
					percentage: options.percentage,
					name: options.name,
					description: options.description,
				});
				toast.showMessage({
					title: i18n.baseText('workflowHistory.action.gradualPublish.success.title'),
					message: i18n.baseText('workflowHistory.action.gradualPublish.success.message', {
						interpolate: { percentage: String(options.percentage) },
					}),
					type: 'success',
				});
				return { success: true, gradualRolloutState };
			}
		} catch (error) {
			if (isWebhookConflictError(error)) {
				await handleWebhookConflictError(error);
				return { success: false, errorHandled: true };
			} else {
				toast.showError(
					error,
					i18n.baseText('workflowHistory.action.gradualPublish.error.title') + ':',
				);
			}
			return { success: false };
		} finally {
			updatingWorkflowActivation.value = false;
		}
	};

	return {
		updatingWorkflowActivation,
		publishWorkflow,
		unpublishWorkflowFromHistory,
		gradualPublishWorkflow,
	};
}
