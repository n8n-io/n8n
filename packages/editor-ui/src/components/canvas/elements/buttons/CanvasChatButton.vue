<script lang="ts" setup>
export interface Props {
	outline?: boolean;
}

defineProps<Props>();
</script>
<template>
	<N8nButton
		label="Chat"
		size="large"
		icon="comment"
		type="primary"
		:outline="outline"
		data-test-id="workflow-chat-button"
	/>
</template>
