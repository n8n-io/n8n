<template>
	<div class="workflow-activator">
		<el-switch
			v-if="!disabled"
			v-loading="loading"
			element-loading-spinner="el-icon-loading"
			:value="workflowActive"
			@change="activeChanged"
			:title="workflowActive ? $locale.baseText('workflowActivator.deactivateWorkflow') : $locale.baseText('workflowActivator.activateWorkflow')"
			:disabled="disabled || loading"
			:active-color="getActiveColor"
			inactive-color="#8899AA">
		</el-switch>
		<n8n-tooltip v-else placement="bottom">
			<div slot="content">This workflow has no trigger nodes that require activation</div>
			<el-switch
				v-loading="loading"
				element-loading-spinner="el-icon-loading"
				:value="workflowActive"
				@change="activeChanged"
				:title="workflowActive?'Deactivate Workflow':'Activate Workflow'"
				:disabled="true"
				:active-color="getActiveColor"
				inactive-color="#8899AA">
			</el-switch>
		</n8n-tooltip>

		<div class="could-not-be-started" v-if="couldNotBeStarted">
			<n8n-tooltip placement="top">
				<div @click="displayActivationError" slot="content">{{ $locale.baseText('workflowActivator.theWorkflowIsSetToBeActiveBut') }}</div>
				<font-awesome-icon @click="displayActivationError" icon="exclamation-triangle" />
			</n8n-tooltip>
		</div>

		<div v-if="showActivationAlert">

			<el-dialog
				title="Workflow activated"
				append-to-body
				center
				:visible="showActivationAlert"
				width="30%">
				<p>{{alertTriggerContent}}</p>
				<p><b>These executions will not show up immediately in the editor</b>, but you can see them in the <a @click="showExecutionsList">execution list</a>.</p>
				<span slot="footer" class="dialog-footer">
					<n8n-button @click="showActivationAlert = false" label="Got it"/>
				</span>
			</el-dialog>
		</div>
	</div>
</template>

<script lang="ts">

import { externalHooks } from '@/components/mixins/externalHooks';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import {
	IWorkflowDataUpdate,
	INodeUi,
} from '../Interface';

import mixins from 'vue-typed-mixins';
import { mapGetters } from "vuex";
import {
	INodeTypeDescription,
} from 'n8n-workflow';
import { EXECUTIONS_MODAL_KEY } from '@/constants';


export default mixins(
	externalHooks,
	genericHelpers,
	restApi,
	showMessage,
	workflowHelpers,
)
	.extend(
		{
			name: 'WorkflowActivator',
			props: [
				'workflowActive',
				'workflowId',
			],
			data () {
				return {
					loading: false,
					alertTriggerContent: '',
					showActivationAlert: false,
				};
			},
			computed: {
				...mapGetters({
					dirtyState: "getStateIsDirty",
				}),
				nodesIssuesExist (): boolean {
					return this.$store.getters.nodesIssuesExist;
				},
				isWorkflowActive (): boolean {
					const activeWorkflows = this.$store.getters.getActiveWorkflows;
					return activeWorkflows.includes(this.workflowId);
				},
				couldNotBeStarted (): boolean {
					return this.workflowActive === true && this.isWorkflowActive !== this.workflowActive;
				},
				getActiveColor (): string {
					if (this.couldNotBeStarted === true) {
						return '#ff4949';
					}
					return '#13ce66';
				},
				disabled(): boolean {
					return this.workflowActive ? false : !this.containsTrigger;
				},
				containsTrigger(): boolean {
					const foundNodes = this.$store.getters.allNodes.map(({ type }: INodeUi) => this.$store.getters.nodeType(type));
					return foundNodes.filter(((type: INodeTypeDescription) => type.group.includes('trigger'))).length > 0;
				},
			},
			methods: {
				async activeChanged (newActiveState: boolean) {
					if (this.workflowId === undefined) {
						this.$showMessage({
							title: this.$locale.baseText('workflowActivator.showMessage.activeChangedWorkflowIdUndefined.title'),
							message: this.$locale.baseText('workflowActivator.showMessage.activeChangedWorkflowIdUndefined.message'),
							type: 'error',
						});
						return;
					}

					if (this.nodesIssuesExist === true) {
						this.$showMessage({
							title: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title'),
							message: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.message'),
							type: 'error',
						});
						return;
					}

					// Set that the active state should be changed
					let data: IWorkflowDataUpdate = {};

					const activeWorkflowId = this.$store.getters.workflowId;
					if (newActiveState === true && this.workflowId === activeWorkflowId) {
						// If the currently active workflow gets activated save the whole
						// workflow. If that would not happen then it could be quite confusing
						// for people because it would activate a different version of the workflow
						// than the one they can currently see.
						if (this.dirtyState) {
							const importConfirm = await this.confirmMessage(
								this.$locale.baseText('workflowActivator.confirmMessage.message'),
								this.$locale.baseText('workflowActivator.confirmMessage.headline'),
								'warning',
								this.$locale.baseText('workflowActivator.confirmMessage.confirmButtonText'),
								this.$locale.baseText('workflowActivator.confirmMessage.cancelButtonText'),
							);
							if (importConfirm === false) {
								return;
							}
						}

						// Get the current workflow data that it gets saved together with the activation
						data = await this.getWorkflowDataToSave();
					}

					data.active = newActiveState;

					this.loading = true;

					try {
						await this.restApi().updateWorkflow(this.workflowId, data);
					} catch (error) {
						const newStateName = newActiveState === true ? 'activated' : 'deactivated';
						this.$showError(
							error,
							this.$locale.baseText('workflowActivator.showError.title'),
							this.$locale.baseText(
								'workflowActivator.showError.message',
								{ interpolate: { newStateName } },
							) + ':',
						);
						this.loading = false;
						return;
					}

					const currentWorkflowId = this.$store.getters.workflowId;
					let activationEventName = 'workflow.activeChange';
					if (currentWorkflowId === this.workflowId) {
						// If the status of the current workflow got changed
						// commit it specifically
						this.$store.commit('setActive', newActiveState);
						activationEventName = 'workflow.activeChangeCurrent';
					}

					if (newActiveState === true) {
						this.$store.commit('setWorkflowActive', this.workflowId);

						// Show activation dialog
						const foundTriggers = this.$store.getters.allNodes
							.map(({ type }: INodeUi) => this.$store.getters.nodeType(type))
							.filter(((type: INodeTypeDescription) => type.group.includes('trigger')));
						// if multiple triggers
						if (foundTriggers.length > 1) {
							this.alertTriggerContent = 'Your triggers will now fire production executions automatically.';
						} else {
							const trigger = foundTriggers[0];
							const serviceName = trigger.displayName.replace(/ trigger/i, '');
							//check if webhook
							if (this.$store.getters.currentWorkflowHasWebhookNode) {
								if (trigger.name === 'Webhook') {
									// check if a standard Webhook trigger
									this.alertTriggerContent = 'You can now make calls to your production webhook URL.';
								} else {
									this.alertTriggerContent = `Your workflow will now listen for events from ${serviceName}.`;
								}
							} else if (trigger.polling) {
								//check if a polling trigger
								this.alertTriggerContent = `Your workflow will now check ${serviceName} for events on a regular basis.`;
							} else if (trigger.displayName === 'Cron') {
								// check if a standard Cron trigger
								this.alertTriggerContent = 'Your cron trigger will now run on the schedule you have defined.';
							} else if (trigger.displayName === 'Interval') {
								// check if a standard Interval trigger
								this.alertTriggerContent = 'Your interval trigger will now run on the schedule you have defined.';
							}
						}
						this.showActivationAlert = true;
					} else {
						this.$store.commit('setWorkflowInactive', this.workflowId);
					}

					this.$externalHooks().run(activationEventName, { workflowId: this.workflowId, active: newActiveState });
					this.$telemetry.track('User set workflow active status', { workflow_id: this.workflowId, is_active: newActiveState });

					this.$emit('workflowActiveChanged', { id: this.workflowId, active: newActiveState });
					this.loading = false;
					this.$store.dispatch('settings/fetchPromptsData');
				},
				async displayActivationError () {
					let errorMessage: string;
					try {
						const errorData = await this.restApi().getActivationError(this.workflowId);

						if (errorData === undefined) {
							errorMessage = this.$locale.baseText('workflowActivator.showMessage.displayActivationError.message.errorDataUndefined');
						} else {
							errorMessage = this.$locale.baseText(
								'workflowActivator.showMessage.displayActivationError.message.errorDataNotUndefined',
								{ interpolate: { message: errorData.error.message } },
							);
						}
					} catch (error) {
						errorMessage = this.$locale.baseText('workflowActivator.showMessage.displayActivationError.message.catchBlock');
					}

					this.$showMessage({
						title: this.$locale.baseText('workflowActivator.showMessage.displayActivationError.title'),
						message: errorMessage,
						type: 'warning',
						duration: 0,
					});
				},
				async showExecutionsList () {
					this.$store.dispatch('ui/openModal', EXECUTIONS_MODAL_KEY);

				},
			},
		},
	);
</script>

<style scoped>
.workflow-activator {
	display: inline-block;
}

.could-not-be-started {
	display: inline-block;
	color: #ff4949;
	margin-left: 0.5em;
}

::v-deep .el-loading-spinner {
	margin-top: -10px;
}

</style>
