<script setup lang="ts">
defineEmits(['create-test']);
</script>

<template>
	<div>
		<div :class="$style.header">
			<h1>Tests</h1>
			<n8n-button type="primary" label="Create new test" @click="$emit('create-test')" />
		</div>
		<n8n-action-box
			heading="Get confidence your workflow is working as expected"
			description="Tests run your workflow and compare the results to expected ones. Create your first test from a past execution. More info"
			button-text="Choose Execution(s)"
			@click:button="$emit('create-test')"
		/>
	</div>
</template>

<style module lang="scss">
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing-xl);

	h1 {
		margin: 0;
	}
}
</style>
