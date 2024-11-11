<script setup lang="ts">
console.log('New WorkflowEvaluationView');

function onClickEmptyStateButton() {
	console.log('onClickEmptyStateButton');
}
</script>
<template>
	<div :class="$style.container">
		<h1>New Evaluation</h1>
		Fill in
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
