import { externalHooks } from '@/components/mixins/externalHooks';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { showMessage } from '@/components/mixins/showMessage';


import mixins from 'vue-typed-mixins';
import { LOCAL_STORAGE_ACTIVATION_FLAG, PLACEHOLDER_EMPTY_WORKFLOW_ID, WORKFLOW_ACTIVE_MODAL_KEY } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useWorkflowsStore } from '@/stores/workflows';

export const workflowActivate = mixins(
	externalHooks,
	workflowHelpers,
	showMessage,
)
	.extend({
		data() {
			return {
				updatingWorkflowActivation: false,
			};
		},
		computed: {
			...mapStores(
				useSettingsStore,
				useUIStore,
				useWorkflowsStore,
			),
		},
		methods: {
			async activateCurrentWorkflow(telemetrySource?: string) {
				const workflowId = this.workflowsStore.workflowId;
				return this.updateWorkflowActivation(workflowId, true, telemetrySource);
			},
			async updateWorkflowActivation(workflowId: string | undefined, newActiveState: boolean, telemetrySource?: string) {
				this.updatingWorkflowActivation = true;
				const nodesIssuesExist = this.workflowsStore.nodesIssuesExist as boolean;

				let currWorkflowId: string | undefined = workflowId;
				if (!currWorkflowId || currWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
					const saved = await this.saveCurrentWorkflow();
					if (!saved) {
						this.updatingWorkflowActivation = false;
						return;
					}
					currWorkflowId = this.workflowsStore.workflowId as string;
				}
				const isCurrentWorkflow = currWorkflowId === this.workflowsStore.workflowId;

				const activeWorkflows =  this.workflowsStore.activeWorkflows;
				const isWorkflowActive = activeWorkflows.includes(currWorkflowId);

				const telemetryPayload = {
					workflow_id: currWorkflowId,
					is_active: newActiveState,
					previous_status: isWorkflowActive,
					ndv_input: telemetrySource === 'ndv',
				};
				this.$telemetry.track('User set workflow active status', telemetryPayload);
				this.$externalHooks().run('workflowActivate.updateWorkflowActivation', telemetryPayload);

				try {
					if (isWorkflowActive && newActiveState) {
						this.$showMessage({
							title: this.$locale.baseText('workflowActivator.workflowIsActive'),
							type: 'success',
						});
						this.updatingWorkflowActivation = false;

						return;
					}

					if (isCurrentWorkflow && nodesIssuesExist) {
						this.$showMessage({
							title: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title'),
							message: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.message'),
							type: 'error',
						});

						this.updatingWorkflowActivation = false;
						return;
					}

					await this.updateWorkflow({workflowId: currWorkflowId, active: newActiveState});
				} catch (error) {
					const newStateName = newActiveState === true ? 'activated' : 'deactivated';
					this.$showError(
						error,
						this.$locale.baseText(
							'workflowActivator.showError.title',
							{ interpolate: { newStateName } },
						) + ':',
					);
					this.updatingWorkflowActivation = false;
					return;
				}

				const activationEventName = isCurrentWorkflow ? 'workflow.activeChangeCurrent' : 'workflow.activeChange';
				this.$externalHooks().run(activationEventName, { workflowId: currWorkflowId, active: newActiveState });

				this.$emit('workflowActiveChanged', { id: currWorkflowId, active: newActiveState });
				this.updatingWorkflowActivation = false;

				if (isCurrentWorkflow) {
					if (newActiveState && window.localStorage.getItem(LOCAL_STORAGE_ACTIVATION_FLAG) !== 'true') {
						this.uiStore.openModal(WORKFLOW_ACTIVE_MODAL_KEY);
					}
					else {
						this.settingsStore.fetchPromptsData();
					}
				}
			},
		},
	});
