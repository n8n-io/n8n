<script lang="ts" setup>
import { N8nRadioButtons } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	modelValue: 'head' | 'live' | undefined;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: 'head' | 'live'];
}>();

const i18n = useI18n();

const options = [
	{ label: i18n.baseText('branchSync.choice.head'), value: 'head' },
	{ label: i18n.baseText('branchSync.choice.live'), value: 'live' },
];
</script>

<template>
	<N8nRadioButtons
		:model-value="modelValue"
		:options="options"
		size="small"
		data-test-id="branch-sync-conflict-choice"
		@update:model-value="emit('update:modelValue', $event as 'head' | 'live')"
	/>
</template>
