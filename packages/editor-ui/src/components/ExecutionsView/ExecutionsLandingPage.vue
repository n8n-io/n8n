<template>
	<div :class="['workflow-executions-container', $style.container]">
		<div v-if="executionCount === 0" :class="[$style.messageContainer, $noExecutionsMessage]">
			<n8n-heading tag="h2" size="large" color="text-dark">
				{{ $locale.baseText('executionsLandingPage.emptyState.heading') }}
			</n8n-heading>
			<n8n-text>
				{{ $locale.baseText('executionsLandingPage.emptyState.message') }}
			</n8n-text>
			<n8n-button class="mt-l" type="tertiary">
				{{ $locale.baseText('nodeView.runButtonText.executeWorkflow') }}
			</n8n-button>
		</div>
		<div v-else :class="[$style.messageContainer, $executionListMessage]">
			<p :class="$style.icon">
				<font-awesome-icon icon="hand-point-left" />
			</p>
			<p :class="$style.message">
				{{ $locale.baseText('executionsLandingPage.clickExecutionMessage') }}
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import { IExecutionsSummary } from '@/Interface';
import Vue from 'vue';

export default Vue.extend({
	name: 'executions-landing-page',
	computed: {
		executionCount(): number {
			return (this.$store.getters.currentWorkflowExecutions as IExecutionsSummary[]).length;
		},
	},
});
</script>

<style module lang="scss">

.container {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 1;
	width: 100%;
	height: 100%;
	background-color: var(--color-background-light);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.messageContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	margin-top: 20%;
	color: var(--color-text-base);
}

.icon {
	font-size: 24px;
	color: var(--color-foreground-dark);
}

</style>
