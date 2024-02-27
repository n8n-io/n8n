import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
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
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';

export const workflowActivate = defineComponent({
	setup() {
		const router = useRouter();
		const workflowHelpers = useWorkflowHelpers({ router });
		return {
			workflowHelpers,
			...useToast(),
		};
	},
	data() {
		return {
			updatingWorkflowActivation: false,
		};
	},
	computed: {
		...mapStores(useSettingsStore, useUIStore, useWorkflowsStore),
	},
	methods: {
		async activateCurrentWorkflow(telemetrySource?: string) {
			const workflowId = this.workflowsStore.workflowId;
			return await this.updateWorkflowActivation(workflowId, true, telemetrySource);
		},
		async updateWorkflowActivation(
			workflowId: string | undefined,
			newActiveState: boolean,
			telemetrySource?: string,
		) {
			this.updatingWorkflowActivation = true;
			const nodesIssuesExist = this.workflowsStore.nodesIssuesExist;

			let currWorkflowId: string | undefined = workflowId;
			if (!currWorkflowId || currWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				const saved = await this.workflowHelpers.saveCurrentWorkflow();
				if (!saved) {
					this.updatingWorkflowActivation = false;
					return;
				}
				currWorkflowId = this.workflowsStore.workflowId;
			}
			const isCurrentWorkflow = currWorkflowId === this.workflowsStore.workflowId;

			const activeWorkflows = this.workflowsStore.activeWorkflows;
			const isWorkflowActive = activeWorkflows.includes(currWorkflowId);

			const telemetryPayload = {
				workflow_id: currWorkflowId,
				is_active: newActiveState,
				previous_status: isWorkflowActive,
				ndv_input: telemetrySource === 'ndv',
			};
			this.$telemetry.track('User set workflow active status', telemetryPayload);
			void useExternalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);

			try {
				if (isWorkflowActive && newActiveState) {
					this.showMessage({
						title: this.$locale.baseText('workflowActivator.workflowIsActive'),
						type: 'success',
					});
					this.updatingWorkflowActivation = false;

					return;
				}

				if (isCurrentWorkflow && nodesIssuesExist && newActiveState) {
					this.showMessage({
						title: this.$locale.baseText(
							'workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title',
						),
						message: this.$locale.baseText(
							'workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.message',
						),
						type: 'error',
					});

					this.updatingWorkflowActivation = false;
					return;
				}

				await this.workflowHelpers.updateWorkflow(
					{ workflowId: currWorkflowId, active: newActiveState },
					!this.uiStore.stateIsDirty,
				);
			} catch (error) {
				const newStateName = newActiveState ? 'activated' : 'deactivated';
				this.showError(
					error,
					this.$locale.baseText('workflowActivator.showError.title', {
						interpolate: { newStateName },
					}) + ':',
				);
				this.updatingWorkflowActivation = false;
				return;
			}

			const activationEventName = isCurrentWorkflow
				? 'workflow.activeChangeCurrent'
				: 'workflow.activeChange';
			void useExternalHooks().run(activationEventName, {
				workflowId: currWorkflowId,
				active: newActiveState,
			});

			this.$emit('workflowActiveChanged', { id: currWorkflowId, active: newActiveState });
			this.updatingWorkflowActivation = false;

			if (isCurrentWorkflow) {
				if (newActiveState && useStorage(LOCAL_STORAGE_ACTIVATION_FLAG).value !== 'true') {
					this.uiStore.openModal(WORKFLOW_ACTIVE_MODAL_KEY);
				} else {
					await this.settingsStore.fetchPromptsData();
				}
			}
		},
	},
});
