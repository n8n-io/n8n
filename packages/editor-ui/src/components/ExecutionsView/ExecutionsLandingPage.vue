<template>
	<div :class="['workflow-executions-container', $style.container]">
		<div v-if="executionCount === 0" :class="[$style.messageContainer, $style.noExecutionsMessage]">
			<div v-if="!containsTrigger">
				<n8n-heading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ $locale.baseText('executionsLandingPage.emptyState.noTrigger.heading') }}
				</n8n-heading>
				<n8n-text size="medium">
					{{ $locale.baseText('executionsLandingPage.emptyState.message') }}
				</n8n-text>
				<n8n-button class="mt-l" type="tertiary" size="large" @click="onSetupFirstStep">
					{{ $locale.baseText('executionsLandingPage.emptyState.noTrigger.buttonText') }}
				</n8n-button>
			</div>
			<div v-else>
				<n8n-heading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ $locale.baseText('executionsLandingPage.emptyState.heading') }}
				</n8n-heading>
				<n8n-text size="medium">
					{{ $locale.baseText('executionsLandingPage.emptyState.message') }}
				</n8n-text>
				<executions-info-accordion />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import { IExecutionsSummary } from '@/Interface';
import Vue from 'vue';
import ExecutionsInfoAccordion from './ExecutionsInfoAccordion.vue';

export default Vue.extend({
	name: 'executions-landing-page',
	components: {
		ExecutionsInfoAccordion,
	},
	computed: {
		executionCount(): number {
			return (this.$store.getters['workflows/currentWorkflowExecutions'] as IExecutionsSummary[]).length;
		},
		containsTrigger(): boolean {
			return this.$store.getters.workflowTriggerNodes.length > 0;
		},
		currentWorkflowId(): string {
			return this.$store.getters.workflowId;
		},
	},
	methods: {
		onSetupFirstStep(event: MouseEvent): void {
			this.$store.commit('ui/setAddFirstStepOnLoad', true);
			const workflowRoute = this.getWorkflowRoute();
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
