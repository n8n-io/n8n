import { externalHooks } from '@/components/mixins/externalHooks';
// import { restApi } from '@/components/mixins/restApi';
// import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { showMessage } from '@/components/mixins/showMessage';


import mixins from 'vue-typed-mixins';
import { LOCAL_STORAGE_ACTIVATION_FLAG, WORKFLOW_ACTIVE_MODAL_KEY } from '@/constants';

export const workflowActivate = mixins(
	externalHooks,
	// nodeHelpers,
	// restApi,
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
			async activateCurrentWorkflow() {
				const workflowId = this.$store.getters.workflowId;
				return this.updateWorkflowActivation(workflowId, true);
			},
			async updateWorkflowActivation(workflowId: string, newActiveState: boolean) {
				this.updatingWorkflowActivation = true;
				const isCurrentWorkflow = workflowId === this.$store.getters['workflowId'];
				const nodesIssuesExist = this.$store.getters.nodesIssuesExist as boolean;

				if (!workflowId) {
					const saved = await this.saveCurrentWorkflow();
					if (!saved) {
						this.updatingWorkflowActivation = false;
						return;
					}
				}

				try {
					if (isCurrentWorkflow && nodesIssuesExist) {
						this.$showMessage({
							title: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title'),
							message: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.message'),
							type: 'error',
						});

						this.updatingWorkflowActivation = false;
						return;
					}

					await this.updateWorkflow({workflowId, active: newActiveState});
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
				this.$externalHooks().run(activationEventName, { workflowId, active: newActiveState });
				this.$telemetry.track('User set workflow active status', { workflow_id: workflowId, is_active: newActiveState });

				this.$emit('workflowActiveChanged', { id: workflowId, active: newActiveState });
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
