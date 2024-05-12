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
import { useWorkflowActive } from '@/composables/useWorkflowActivate';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { defineComponent } from 'vue';
import { getActivatableTriggerNodes } from '@/utils/nodeTypesUtils';
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';

export default defineComponent({
	name: 'WorkflowActivator',
	props: ['workflowActive', 'workflowId'],
	async setup(props) {
		const workflowActive = useWorkflowActive();
		const toast = useToast();
		const i18 = useI18n();
		const workflowsStore = useWorkflowsStore();

		//computed

		const nodesIssuesExist = computed(() => workflowsStore.nodesIssuesExist);

		const isWorkflowActive = computed(() => {
			const activeWorkflows = workflowsStore.activeWorkflows;
			return activeWorkflows.includes(props.workflowId);
		});

		const couldNotBeStarted = computed(() => {
			return props.workflowActive === true && isWorkflowActive.value !== props.workflowActive;
		});

		const isCurrentWorkflow = computed(
			() => workflowsStore.workflowId === workflowsStore.workflowId,
		);

		const getActiveColor = computed(() => {
			if (couldNotBeStarted.value) {
				return '#ff4949';
			}
			return '#13ce66';
		});

		const disabled = computed(() => {
			const isNewWorkflow = !props.workflowId;
			if (isNewWorkflow || isCurrentWorkflow.value) {
				return !props.workflowActive && !containsTrigger.value;
			}

			return false;
		});

		const containsTrigger = computed(() => {
			const foundTriggers = getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes);
			return foundTriggers.length > 0;
		});

		//methods

		const activeChanged = async (newActiveState: boolean) => {
			return await workflowActive.updateWorkflowActivation(props.workflowId, newActiveState);
		};

		const displayActivationError = async () => {
			let errorMessage: string;
			try {
				const errorData = await workflowsStore.getActivationError(props.workflowId);

				if (errorData === undefined) {
					errorMessage = i18.baseText(
						'workflowActivator.showMessage.displayActivationError.message.errorDataUndefined',
					);
				} else {
					errorMessage = i18.baseText(
						'workflowActivator.showMessage.displayActivationError.message.errorDataNotUndefined',
						{ interpolate: { message: errorData } },
					);
				}
			} catch (error) {
				errorMessage = i18.baseText(
					'workflowActivator.showMessage.displayActivationError.message.catchBlock',
				);
			}

			toast.showMessage({
				title: i18.baseText('workflowActivator.showMessage.displayActivationError.title'),
				message: errorMessage,
				type: 'warning',
				duration: 0,
				dangerouslyUseHTMLString: true,
			});
		};

		return {
			nodesIssuesExist,
			isWorkflowActive,
			couldNotBeStarted,
			getActiveColor,
			isCurrentWorkflow,
			containsTrigger,
			disabled,
			activeChanged,
			displayActivationError,
			...{ updatingWorkflowActivation: workflowActive.updatingWorkflowActivation },
		};
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
