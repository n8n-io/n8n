import { useStorage } from '@/app/composables/useStorage';

import { LOCAL_STORAGE_ACTIVATION_FLAG, WORKFLOW_ACTIVE_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';
import { useNpsSurveyStore } from '@/app/stores/npsSurvey.store';
import { useWorkflowSaving } from './useWorkflowSaving';
import * as workflowsApi from '@/app/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';

export function useWorkflowActivate() {
	const updatingWorkflowActivation = ref(false);

	const router = useRouter();
	const workflowHelpers = useWorkflowHelpers();
	const workflowSaving = useWorkflowSaving({ router });
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();
	const npsSurveyStore = useNpsSurveyStore();
	const rootStore = useRootStore();

	//methods

	const updateWorkflowActivation = async (
		workflowId: string | undefined,
		newActiveState: boolean,
		telemetrySource?: string,
	): Promise<boolean> => {
		// Add return type
		updatingWorkflowActivation.value = true;
		const nodesIssuesExist = workflowsStore.nodesIssuesExist;

		let currWorkflowId: string | undefined = workflowId;
		// Check if workflow needs to be saved (doesn't exist in store yet)
		const existingWorkflow = currWorkflowId ? workflowsStore.workflowsById[currWorkflowId] : null;
		if (!currWorkflowId || !existingWorkflow?.id) {
			const saved = await workflowSaving.saveCurrentWorkflow();
			if (!saved) {
				updatingWorkflowActivation.value = false;
				return false; // Return false if save failed
			}
			currWorkflowId = workflowsStore.workflowId;
		}
		const isCurrentWorkflow = currWorkflowId === workflowsStore.workflowId;

		const activeWorkflows = workflowsStore.activeWorkflows;
		const isWorkflowActive = activeWorkflows.includes(currWorkflowId);

		const telemetryPayload = {
			workflow_id: currWorkflowId,
			is_active: newActiveState,
			previous_status: isWorkflowActive,
			ndv_input: telemetrySource === 'ndv',
		};
		telemetry.track('User set workflow active status', telemetryPayload);
		void useExternalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);

		try {
			if (isWorkflowActive && newActiveState) {
				toast.showMessage({
					title: i18n.baseText('workflowActivator.workflowIsActive'),
					type: 'success',
				});
				updatingWorkflowActivation.value = false;

				return true; // Already active, return true
			}

			if (isCurrentWorkflow && nodesIssuesExist && newActiveState) {
				toast.showMessage({
					title: i18n.baseText(
						'workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title',
					),
					message: i18n.baseText(
						'workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.message',
					),
					type: 'error',
				});

				updatingWorkflowActivation.value = false;
				return false; // Return false if there are node issues
			}

			// Save workflow if there are unsaved changes
			if (uiStore.stateIsDirty) {
				await workflowHelpers.updateWorkflow({ workflowId: currWorkflowId }, false);
			}

			// Call activate or deactivate endpoint
			let workflow;
			if (newActiveState) {
				workflow = await workflowsApi.activateWorkflow(rootStore.restApiContext, currWorkflowId, {
					versionId: workflowsStore.workflow.versionId,
				});
			} else {
				workflow = await workflowsApi.deactivateWorkflow(rootStore.restApiContext, currWorkflowId);
			}

			if (!workflow.checksum) {
				throw new Error('Failed to activate or deactivate workflow');
			}

			// Update local state
			if (workflow.activeVersion) {
				workflowsStore.setWorkflowActive(currWorkflowId, workflow.activeVersion, true);
			} else {
				workflowsStore.setWorkflowInactive(currWorkflowId);
			}
		} catch (error) {
			const newStateName = newActiveState ? 'activated' : 'deactivated';
			toast.showError(
				error,
				i18n.baseText('workflowActivator.showError.title', {
					interpolate: { newStateName },
				}) + ':',
			);
			updatingWorkflowActivation.value = false;
			return false; // Return false if update failed
		}

		const activationEventName = isCurrentWorkflow
			? 'workflow.activeChangeCurrent'
			: 'workflow.activeChange';
		void useExternalHooks().run(activationEventName, {
			workflowId: currWorkflowId,
			active: newActiveState,
		});

		updatingWorkflowActivation.value = false;

		if (isCurrentWorkflow) {
			if (newActiveState && useStorage(LOCAL_STORAGE_ACTIVATION_FLAG).value !== 'true') {
				uiStore.openModal(WORKFLOW_ACTIVE_MODAL_KEY);
			} else {
				await npsSurveyStore.fetchPromptsData();
			}
		}

		return newActiveState; // Return the new state after successful update
	};

	const activateCurrentWorkflow = async (telemetrySource?: string) => {
		const workflowId = workflowsStore.workflowId;
		return await updateWorkflowActivation(workflowId, true, telemetrySource);
	};

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
		activateCurrentWorkflow,
		updateWorkflowActivation,
		updatingWorkflowActivation,
		publishWorkflow,
		unpublishWorkflowFromHistory,
	};
}
