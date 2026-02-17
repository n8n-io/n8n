<script setup lang="ts">
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

defineProps<{
	label: string;
	icon: IconName | undefined;
	disabled: boolean;
	loading: boolean;
	tooltipText: string;
}>();

const emit = defineEmits<{
	click: [];
}>();

const onClick = async () => {
	emit('click');
};
</script>

<template>
	<N8nTooltip :disabled="!tooltipText" placement="top">
		<template #content>{{ tooltipText }}</template>
		<N8nButton
			data-test-id="trigger-execute-button"
			:label="label"
			:disabled="disabled"
			:loading="loading"
			:icon="icon"
			size="small"
			@click="onClick"
		/>
	</N8nTooltip>
</template>
