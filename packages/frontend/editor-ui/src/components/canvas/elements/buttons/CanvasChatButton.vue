<script lang="ts" setup>
export interface Props {
	type: 'primary' | 'tertiary';
	label: string;
}
defineProps<Props>();
</script>
<template>
	<N8nButton
		:label="label"
		size="large"
		icon="comment"
		:type="type"
		data-test-id="workflow-chat-button"
	/>
</template>
