<template>
	<div class="workflow-activator">
		<n8n-tooltip :disabled="!disabled" placement="bottom">
			<div slot="content">{{ $locale.baseText('workflowActivator.thisWorkflowHasNoTriggerNodes') }}</div>
			<el-switch
				v-loading="loading"
				element-loading-spinner="el-icon-loading"
				:value="workflowActive"
				@change="activeChanged"
			  :title="workflowActive ? $locale.baseText('workflowActivator.deactivateWorkflow') : $locale.baseText('workflowActivator.activateWorkflow')"
				:disabled="disabled || loading"
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
	</div>
</template>

<script lang="ts">

import { externalHooks } from '@/components/mixins/externalHooks';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { IWorkflowDataUpdate, INodeUi } from '../Interface';

import mixins from 'vue-typed-mixins';
import { mapGetters } from "vuex";

import {
	WORKFLOW_ACTIVE_MODAL_KEY,
	LOCAL_STORAGE_ACTIVATION_FLAG,
} from '@/constants';


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
					// Switch should be enabled if workflow is currently active and should always be enabled for workflows not currently in editor
					return this.isCurrentWorkflow && !this.workflowActive && !this.containsTrigger;
				},
				isCurrentWorkflow(): boolean {
					return this.workflowId ? this.$store.state.workflow.id === this.workflowId : true;
				},
				containsTrigger(): boolean {
					const foundTriggers = this.$store.getters.workflowTriggerNodes
						.filter((node: INodeUi) => {
							return !node.disabled;
						})
						// Error Trigger does not behave like other triggers and workflows using it can not be activated
						.filter(({ type }: INodeUi) => {
							return type !== 'n8n-nodes-base.errorTrigger';
						});
					return foundTriggers.length > 0;
				},
			},
			methods: {
				async activeChanged (newActiveState: boolean) {
					if (this.workflowId === undefined) {
						await this.saveCurrentWorkflow();
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

						// Show activation dialog only for current workflow and if user hasn't deactivated it
						if (this.isCurrentWorkflow && window.localStorage.getItem(LOCAL_STORAGE_ACTIVATION_FLAG) !== 'true') {
							this.$store.dispatch('ui/openModal', WORKFLOW_ACTIVE_MODAL_KEY);
						}
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
			},
		},
	);
</script>

<style lang="scss" scoped>

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
