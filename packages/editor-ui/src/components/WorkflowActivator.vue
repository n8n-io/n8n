<template>
	<div class="workflow-activator">
		<el-switch
			v-loading="loading"
			element-loading-spinner="el-icon-loading"
			:value="workflowActive"
			@change="activeChanged"
			:title="workflowActive?'Deactivate Workflow':'Activate Workflow'"
			:disabled="disabled || loading"
			:active-color="getActiveColor"
			inactive-color="#8899AA">
		</el-switch>

		<div class="could-not-be-started" v-if="couldNotBeStarted">
			<n8n-tooltip placement="top">
				<div @click="displayActivationError" slot="content">The workflow is set to be active but could not be started.<br />Click to display error message.</div>
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
import {
	IWorkflowDataUpdate,
} from '../Interface';

import mixins from 'vue-typed-mixins';
import { mapGetters } from "vuex";

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
				'disabled',
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
			},
			methods: {
				async activeChanged (newActiveState: boolean) {
					if (this.workflowId === undefined) {
						this.$showMessage({
							title: 'Problem activating workflow',
							message: 'The workflow did not get saved yet so can not be set active!',
							type: 'error',
						});
						return;
					}

					if (this.nodesIssuesExist === true) {
						this.$showMessage({
							title: 'Problem activating workflow',
							message: 'It is only possible to activate a workflow when all issues on all nodes got resolved!',
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
							const importConfirm = await this.confirmMessage(`When you activate the workflow all currently unsaved changes of the workflow will be saved.`, 'Activate and save?', 'warning', 'Yes, activate and save!');
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
						this.$showError(error, 'Problem', `There was a problem and the workflow could not be ${newStateName}:`);
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
					} else {
						this.$store.commit('setWorkflowInactive', this.workflowId);
					}

					this.$externalHooks().run(activationEventName, { workflowId: this.workflowId, active: newActiveState });

					this.$emit('workflowActiveChanged', { id: this.workflowId, active: newActiveState });
					this.loading = false;
				},
				async displayActivationError () {
					let errorMessage: string;
					try {
						const errorData = await this.restApi().getActivationError(this.workflowId);

						if (errorData === undefined) {
							errorMessage = 'Sorry there was a problem. No error got found to display.';
						} else {
							errorMessage = `The following error occurred on workflow activation:<br /><i>${errorData.error.message}</i>`;
						}
					} catch (error) {
						errorMessage = 'Sorry there was a problem requesting the error';
					}

					this.$showMessage({
						title: 'Problem activating workflow',
						message: errorMessage,
						type: 'warning',
						duration: 0,
					});
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
