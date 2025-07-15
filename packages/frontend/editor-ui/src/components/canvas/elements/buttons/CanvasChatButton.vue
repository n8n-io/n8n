<script lang="ts" setup>
import { type ButtonProps } from '@n8n/design-system';

export type Props = Pick<ButtonProps, 'label' | 'type'>;

defineProps<Props>();
</script>
<template>
	<N8nButton
		size="medium"
		text
		icon="message-circle"
		:type="type"
		data-test-id="workflow-chat-button"
	/>
</template>
