<template>
	<div class="workflow-activator">
		<div :class="$style.activeStatusText" data-test-id="workflow-activator-status">
			<n8n-text v-if="workflowActive" :color="couldNotBeStarted ? 'danger' : 'success'" size="small" bold>
				{{ $locale.baseText('workflowActivator.active') }}
			</n8n-text>
			<n8n-text v-else color="text-base" size="small" bold>
				{{ $locale.baseText('workflowActivator.inactive') }}
			</n8n-text>
		</div>
		<n8n-tooltip :disabled="!disabled" placement="bottom">
			<div slot="content">{{ $locale.baseText('workflowActivator.thisWorkflowHasNoTriggerNodes') }}</div>
			<el-switch
				v-loading="updatingWorkflowActivation"
				:value="workflowActive"
				@change="activeChanged"
			  :title="workflowActive ? $locale.baseText('workflowActivator.deactivateWorkflow') : $locale.baseText('workflowActivator.activateWorkflow')"
				:disabled="disabled || updatingWorkflowActivation"
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

import { showMessage } from '@/components/mixins/showMessage';
import { workflowActivate } from '@/components/mixins/workflowActivate';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { getActivatableTriggerNodes } from './helpers';

export default mixins(
	showMessage,
	workflowActivate,
)
	.extend(
		{
			name: 'WorkflowActivator',
			props: [
				'workflowActive',
				'workflowId',
			],
			computed: {
				...mapStores(
					useUIStore,
					useWorkflowsStore,
				),
				getStateIsDirty (): boolean {
					return this.uiStore.stateIsDirty;
				},
				nodesIssuesExist (): boolean {
					return this.workflowsStore.nodesIssuesExist;
				},
				isWorkflowActive (): boolean {
					const activeWorkflows =  this.workflowsStore.activeWorkflows;
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
					return this.workflowsStore.workflowId === this.workflowId;
				},
				disabled(): boolean {
					const isNewWorkflow = !this.workflowId;
					if (isNewWorkflow || this.isCurrentWorkflow) {
						return !this.workflowActive && !this.containsTrigger;
					}

					return false;
				},
				containsTrigger(): boolean {
					const foundTriggers = getActivatableTriggerNodes(this.workflowsStore.workflowTriggerNodes);
					return foundTriggers.length > 0;
				},
			},
			methods: {
				async activeChanged (newActiveState: boolean) {
					return await this.updateWorkflowActivation(this.workflowId, newActiveState);
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

<style lang="scss" module>
.activeStatusText {
	width: 64px; // Required to avoid jumping when changing active state
	padding-right: var(--spacing-2xs);
	box-sizing: border-box;
	display: inline-block;
	text-align: right;
}
</style>

<style lang="scss" scoped>
.workflow-activator {
	display: inline-flex;
	flex-wrap: nowrap;
	align-items: center;
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
