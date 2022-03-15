<template>
	<div class="workflow-activator">
		<n8n-tooltip :disabled="!disabled" placement="bottom">
			<div slot="content">{{ $locale.baseText('workflowActivator.thisWorkflowHasNoTriggerNodes') }}</div>
			<el-switch
				v-loading="loading"
				:value="workflowActive"
				@change="activeChanged"
			  :title="workflowActive ? $locale.baseText('workflowActivator.deactivateWorkflow') : $locale.baseText('workflowActivator.activateWorkflow')"
				:disabled="disabled || loading"
				:active-color="getActiveColor"
				inactive-color="#8899AA"
				element-loading-spinner="el-icon-loading">
			</el-switch>
		</n8n-tooltip>

		<div class="could-not-be-started" v-if="couldNotBeStarted">
			<n8n-tooltip placement="top">
				<div @click="displayActivationError" slot="content" v-html="$locale.baseText('workflowActivator.theWorkflowIsSetToBeActiveBut')"></div>
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

import mixins from 'vue-typed-mixins';
import { mapGetters } from "vuex";

import {
	WORKFLOW_ACTIVE_MODAL_KEY,
	LOCAL_STORAGE_ACTIVATION_FLAG,
} from '@/constants';
import { getActivatableTriggerNodes } from './helpers';


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
				isCurrentWorkflow(): boolean {
					return this.$store.getters['workflowId'] === this.workflowId;
				},
				disabled(): boolean {
					const isNewWorkflow = !this.workflowId;
					if (isNewWorkflow || this.isCurrentWorkflow) {
						return !this.workflowActive && !this.containsTrigger;
					}

					return false;
				},
				containsTrigger(): boolean {
					const foundTriggers = getActivatableTriggerNodes(this.$store.getters.workflowTriggerNodes);
					return foundTriggers.length > 0;
				},
			},
			methods: {
				async activeChanged (newActiveState: boolean) {
					this.loading = true;

					if (!this.workflowId) {
						const saved = await this.saveCurrentWorkflow();
						if (!saved) {
							this.loading = false;
							return;
						}
					}

					try {
						if (this.isCurrentWorkflow && this.nodesIssuesExist) {
							this.$showMessage({
								title: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title'),
								message: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.message'),
								type: 'error',
							});

							this.loading = false;
							return;
						}

						await this.updateWorkflow({workflowId: this.workflowId, active: newActiveState});
					} catch (error) {
						const newStateName = newActiveState === true ? 'activated' : 'deactivated';
						this.$showError(
							error,
							this.$locale.baseText(
								'workflowActivator.showError.title',
								{ interpolate: { newStateName } },
							) + ':',
						);
						this.loading = false;
						return;
					}

					const activationEventName = this.isCurrentWorkflow ? 'workflow.activeChangeCurrent' : 'workflow.activeChange';
					this.$externalHooks().run(activationEventName, { workflowId: this.workflowId, active: newActiveState });
					this.$telemetry.track('User set workflow active status', { workflow_id: this.workflowId, is_active: newActiveState });

					this.$emit('workflowActiveChanged', { id: this.workflowId, active: newActiveState });
					this.loading = false;

					if (this.isCurrentWorkflow) {
						if (newActiveState && window.localStorage.getItem(LOCAL_STORAGE_ACTIVATION_FLAG) !== 'true') {
							this.$store.dispatch('ui/openModal', WORKFLOW_ACTIVE_MODAL_KEY);
						}
						else {
							this.$store.dispatch('settings/fetchPromptsData');
						}
					}
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
