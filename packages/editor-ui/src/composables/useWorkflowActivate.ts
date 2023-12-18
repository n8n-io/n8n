import type { SetupContext } from 'vue';
import { computed, ref, getCurrentInstance } from 'vue';
import { useStorage } from '@/composables/useStorage';

import { useToast } from '@/composables/useToast';

import {
	LOCAL_STORAGE_ACTIVATION_FLAG,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WORKFLOW_ACTIVE_MODAL_KEY,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowHelpers } from './useWorkflowHelpers';
import { useTelemetry } from './useTelemetry';
import { useI18n } from './useI18n';

export function useWorkflowActivate(ctx: SetupContext) {
	const updatingWorkflowActivation = ref(false);
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();
	const i18n = useI18n();

	async function activateCurrentWorkflow(telemetrySource?: string) {
		const workflowId = useWorkflowsStore().workflowId;
		return updateWorkflowActivation(workflowId, true, telemetrySource);
	}

	async function updateWorkflowActivation(
		workflowId: string | undefined,
		newActiveState: boolean,
		telemetrySource?: string,
	) {
		updatingWorkflowActivation.value = true;
		const instance = getCurrentInstance()
		const workflowHelpers = useWorkflowHelpers(instance ?? undefined);
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
		useTelemetry().track('User set workflow active status', telemetryPayload);
		void useExternalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);

		try {
			if (isWorkflowActive && newActiveState) {
				useToast().showMessage({
					title: i18n.baseText('workflowActivator.workflowIsActive'),
					type: 'success',
				});
				updatingWorkflowActivation.value = false;

				return;
			}

			if (isCurrentWorkflow && nodesIssuesExist && newActiveState) {
				useToast().showMessage({
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
			useToast().showError(
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

		ctx.emit('workflowActiveChanged', { id: currWorkflowId, active: newActiveState });
		updatingWorkflowActivation.value = false;

		if (isCurrentWorkflow) {
			if (newActiveState && useStorage(LOCAL_STORAGE_ACTIVATION_FLAG).value !== 'true') {
				uiStore.openModal(WORKFLOW_ACTIVE_MODAL_KEY);
			} else {
				await settingsStore.fetchPromptsData();
			}
		}
	}
	return {
		activateCurrentWorkflow,
		updateWorkflowActivation,
		updatingWorkflowActivation: computed(() => updatingWorkflowActivation.value),
	};
}
