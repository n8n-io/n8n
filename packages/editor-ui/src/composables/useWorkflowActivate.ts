import { useStorage } from '@/composables/useStorage';

import {
	LOCAL_STORAGE_ACTIVATION_FLAG,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WORKFLOW_ACTIVE_MODAL_KEY,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import { ref } from 'vue';

export function useWorkflowActivate() {
	const updatingWorkflowActivation = ref(false);

	const router = useRouter();
	const workflowHelpers = useWorkflowHelpers({ router });
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const uiStore = useUIStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();

	//methods

	const updateWorkflowActivation = async (
		workflowId: string | undefined,
		newActiveState: boolean,
		telemetrySource?: string,
	) => {
		updatingWorkflowActivation.value = true;
		const nodesIssuesExist = workflowsStore.nodesIssuesExist;

		let currWorkflowId: string | undefined = workflowId;
		if (!currWorkflowId || currWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			const saved = await workflowHelpers.saveCurrentWorkflow();
			if (!saved) {
				updatingWorkflowActivation.value = false;
				return;
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

				return;
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
				return;
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
			return;
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
				await settingsStore.fetchPromptsData();
			}
		}
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
