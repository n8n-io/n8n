import { externalHooks } from '@/components/mixins/externalHooks';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { showMessage } from '@/components/mixins/showMessage';


import mixins from 'vue-typed-mixins';
import { LOCAL_STORAGE_ACTIVATION_FLAG, PLACEHOLDER_EMPTY_WORKFLOW_ID, WORKFLOW_ACTIVE_MODAL_KEY } from '@/constants';

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
		methods: {
			async activateCurrentWorkflow(telemetrySource?: string) {
				const workflowId = this.$store.getters.workflowId;
				return this.updateWorkflowActivation(workflowId, true, telemetrySource);
			},
			async updateWorkflowActivation(workflowId: string | undefined, newActiveState: boolean, telemetrySource?: string) {
				this.updatingWorkflowActivation = true;
				const nodesIssuesExist = this.$store.getters.nodesIssuesExist as boolean;

				let currWorkflowId: string | undefined = workflowId;
				if (!currWorkflowId || currWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
					const saved = await this.saveCurrentWorkflow();
					if (!saved) {
						this.updatingWorkflowActivation = false;
						return;
					}
					currWorkflowId = this.$store.getters.workflowId as string;
				}

				const isCurrentWorkflow = currWorkflowId === this.$store.getters['workflowId'];

				const activeWorkflows = this.$store.getters.getActiveWorkflows;
				const isWorkflowActive = activeWorkflows.includes(currWorkflowId);

				this.$telemetry.track('User set workflow active status', { workflow_id: currWorkflowId, is_active: newActiveState, previous_status: isWorkflowActive,  ndv_input: telemetrySource === 'ndv' });

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
						this.$store.dispatch('ui/openModal', WORKFLOW_ACTIVE_MODAL_KEY);
					}
					else {
						this.$store.dispatch('settings/fetchPromptsData');
					}
				}
			},
		},
	});
