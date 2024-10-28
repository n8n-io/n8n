<template>
	<div class="workflow-activator">
		<div :class="$style.activeStatusText" data-test-id="workflow-activator-status">
			<n8n-text
				v-if="workflowActive"
				:color="couldNotBeStarted ? 'danger' : 'success'"
				size="small"
				bold
			>
				{{ $locale.baseText('workflowActivator.active') }}
			</n8n-text>
			<n8n-text v-else color="text-base" size="small" bold>
				{{ $locale.baseText('workflowActivator.inactive') }}
			</n8n-text>
		</div>
		<n8n-tooltip :disabled="!disabled" placement="bottom">
			<template #content>
				<div>
					{{ $locale.baseText('workflowActivator.thisWorkflowHasNoTriggerNodes') }}
				</div>
			</template>
			<el-switch
				v-loading="updatingWorkflowActivation"
				:model-value="workflowActive"
				:title="
					workflowActive
						? $locale.baseText('workflowActivator.deactivateWorkflow')
						: $locale.baseText('workflowActivator.activateWorkflow')
				"
				:disabled="disabled || updatingWorkflowActivation"
				:active-color="getActiveColor"
				inactive-color="#8899AA"
				data-test-id="workflow-activate-switch"
				@update:model-value="activeChanged"
			>
			</el-switch>
		</n8n-tooltip>

		<div v-if="couldNotBeStarted" class="could-not-be-started">
			<n8n-tooltip placement="top">
				<template #content>
					<div
						@click="displayActivationError"
						v-html="$locale.baseText('workflowActivator.theWorkflowIsSetToBeActiveBut')"
					></div>
				</template>
				<font-awesome-icon icon="exclamation-triangle" @click="displayActivationError" />
			</n8n-tooltip>
		</div>
	</div>
</template>

<script lang="ts">
import { useToast } from '@/composables/useToast';
import { useWorkflowActivate } from '@/composables/useWorkflowActivate';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';
import { getActivatableTriggerNodes } from '@/utils/nodeTypesUtils';

export default defineComponent({
	name: 'WorkflowActivator',
	props: ['workflowActive', 'workflowId'],
	setup() {
		return {
			...useToast(),
			...useWorkflowActivate(),
		};
	},
	computed: {
		...mapStores(useUIStore, useWorkflowsStore),
		nodesIssuesExist(): boolean {
			return this.workflowsStore.nodesIssuesExist;
		},
		isWorkflowActive(): boolean {
			const activeWorkflows = this.workflowsStore.activeWorkflows;
			return activeWorkflows.includes(this.workflowId);
		},
		couldNotBeStarted(): boolean {
			return this.workflowActive === true && this.isWorkflowActive !== this.workflowActive;
		},
		getActiveColor(): string {
			if (this.couldNotBeStarted) {
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
		async activeChanged(newActiveState: boolean) {
			return await this.updateWorkflowActivation(this.workflowId, newActiveState);
		},
		async displayActivationError() {
			let errorMessage: string;
			try {
				const errorData = await this.workflowsStore.getActivationError(this.workflowId);

				if (errorData === undefined) {
					errorMessage = this.$locale.baseText(
						'workflowActivator.showMessage.displayActivationError.message.errorDataUndefined',
					);
				} else {
					errorMessage = this.$locale.baseText(
						'workflowActivator.showMessage.displayActivationError.message.errorDataNotUndefined',
						{ interpolate: { message: errorData } },
					);
				}
			} catch (error) {
				errorMessage = this.$locale.baseText(
					'workflowActivator.showMessage.displayActivationError.message.catchBlock',
				);
			}

			this.showMessage({
				title: this.$locale.baseText('workflowActivator.showMessage.displayActivationError.title'),
				message: errorMessage,
				type: 'warning',
				duration: 0,
				dangerouslyUseHTMLString: true,
			});
		},
	},
});
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
	color: var(--color-text-danger);
	margin-left: 0.5em;
}
</style>
