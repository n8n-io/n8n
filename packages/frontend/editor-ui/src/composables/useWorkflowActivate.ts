import { useStorage } from '@/composables/useStorage';

import {
	LOCAL_STORAGE_ACTIVATION_FLAG,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WORKFLOW_ACTIVE_MODAL_KEY,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useWorkflowSaving } from './useWorkflowSaving';

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
		if (!currWorkflowId || currWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
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

			await workflowHelpers.updateWorkflow(
				{ workflowId: currWorkflowId, active: newActiveState },
				!uiStore.stateIsDirty,
			);
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

	return {
		activateCurrentWorkflow,
		updateWorkflowActivation,
		updatingWorkflowActivation,
	};
}
