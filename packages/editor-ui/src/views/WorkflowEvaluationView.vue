<script setup lang="ts">
import { VIEWS } from '@/constants';
import { useRouter } from 'vue-router';

console.log('WorkflowEvaluationView');

const router = useRouter();
function onClickEmptyStateButton() {
	console.log('onClickEmptyStateButton');
	void router.push({ name: VIEWS.NEW_WORKFLOW_EVALUATION });
}

const actionBoxConfig = {
	calloutText: '',
	calloutTheme: '',
	hideButton: false,
};
</script>
<template>
	<div :class="$style.container">
		<h1>Tests</h1>
		<n8n-action-box
			:heading="'Get confidence your workflow is working as expected'"
			:description="'Tests run your workflow and compare the results to expected ones. Create your first test from a past execution. More info'"
			:button-text="'Choose Executions(s)'"
			:callout-text="actionBoxConfig.calloutText"
			@click:button="onClickEmptyStateButton"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	padding: var(--spacing-xl) var(--spacing-l);
	display: flex;
	justify-content: center;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-xl);
	height: 100%;
}
</style>
