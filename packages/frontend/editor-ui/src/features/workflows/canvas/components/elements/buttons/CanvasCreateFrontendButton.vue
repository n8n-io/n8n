<script setup lang="ts">
import { N8nButton, N8nTooltip } from '@n8n/design-system';

defineProps<{
	disabled?: boolean;
	disabledReason?: string;
}>();
defineEmits<{ click: [] }>();
</script>

<template>
	<N8nTooltip placement="top" :disabled="!disabled || !disabledReason" :content="disabledReason">
		<N8nButton
			:disabled="disabled"
			type="secondary"
			data-testid="canvas-create-frontend-button"
			@click="$emit('click')"
		>
			Frontend
		</N8nButton>
	</N8nTooltip>
</template>
