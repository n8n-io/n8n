<template>
	<div :class="['workflow-executions-container', $style.container]">
		<div v-if="executionCount === 0" :class="[$style.messageContainer, $style.noExecutionsMessage]">
			<div v-if="!containsTrigger">
				<n8n-heading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ $locale.baseText('executionsLandingPage.emptyState.noTrigger.heading') }}
				</n8n-heading>
				<n8n-text size="small">
					{{ $locale.baseText('executionsLandingPage.emptyState.message') }}
				</n8n-text>
				<n8n-button class="mt-l" type="tertiary" @click="onSetupTriggerButtonClick">
					{{ $locale.baseText('executionsLandingPage.emptyState.noTrigger.buttonText') }}
				</n8n-button>
			</div>
			<div v-else>
				<n8n-heading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ $locale.baseText('executionsLandingPage.emptyState.heading') }}
				</n8n-heading>
				<n8n-text size="small">
					{{ $locale.baseText('executionsLandingPage.emptyState.message') }}
				</n8n-text>
				<n8n-button class="mt-l" type="tertiary" @click="onExecuteWorkflowButtonClick">
					{{ $locale.baseText('nodeView.runButtonText.executeWorkflow') }}
				</n8n-button>
				<executions-info-accordion />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import { IExecutionsSummary } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { getActivatableTriggerNodes } from '../helpers';
import { restApi } from '../mixins/restApi';
import ExecutionsInfoAccordion from './ExecutionsInfoAccordion.vue';

export default mixins(restApi).extend({
	name: 'executions-landing-page',
	components: {
		ExecutionsInfoAccordion,
	},
	computed: {
		executionCount(): number {
			return (this.$store.getters['workflows/currentWorkflowExecutions'] as IExecutionsSummary[]).length;
		},
		containsTrigger(): boolean {
			if (this.currentWorkflowId === '' || this.currentWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				return false;
			}
			const foundTriggers = getActivatableTriggerNodes(this.$store.getters.workflowTriggerNodes);
			return foundTriggers.length > 0;
		},
		currentWorkflowId(): string {
			return this.$store.getters.workflowId;
		},
	},
	methods: {
		onSetupTriggerButtonClick(event: MouseEvent): void {
			const workflowRoute = this.getWorkflowRoute();
			this.$router.push(workflowRoute);
		},
		onExecuteWorkflowButtonClick(event: MouseEvent): void {
			const workflowRoute = this.getWorkflowRoute();
			this.$store.commit('ui/setPendingExecuteButtonShake', true);
			this.$router.push(workflowRoute);
		},
		getWorkflowRoute(): { name: string, params: {}} {
			const workflowId = this.currentWorkflowId || this.$route.params.name;
			if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				return { name: VIEWS.NEW_WORKFLOW, params: {} };
			} else {
				return { name: VIEWS.WORKFLOW, params: { name: workflowId } };
			}
		},
	},
});
</script>

<style module lang="scss">

.container {
	width: 100%;
	height: 100%;
	flex: 1;
	background-color: var(--color-background-light);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.messageContainer {
	margin-top: var(--spacing-4xl);
	color: var(--color-text-base);

	div {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
}

.icon {
	font-size: 24px;
	color: var(--color-foreground-dark);
}
</style>
