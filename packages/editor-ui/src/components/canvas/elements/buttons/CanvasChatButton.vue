<script lang="ts" setup>
export interface Props {
	outline?: boolean;
	label: string;
}
defineProps<Props>();
</script>
<template>
	<N8nButton
		:label="label"
		size="large"
		icon="comment"
		type="primary"
		:outline="outline"
		data-test-id="workflow-chat-button"
	/>
</template>
