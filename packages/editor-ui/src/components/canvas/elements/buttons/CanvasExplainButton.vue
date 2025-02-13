<script lang="ts" setup>
export interface Props {
	type: 'primary' | 'tertiary';
	label: string;
	loading: boolean;
}
defineProps<Props>();
</script>
<template>
	<N8nButton
		:loading="loading"
		:disabled="loading"
		label="Explain"
		size="large"
		icon="sparkles"
		data-test-id="workflow-chat-button"
	/>
</template>
