<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

defineProps<{
	isBuildMode: boolean;
}>();

const emit = defineEmits<{
	toggle: [value: boolean];
}>();

const i18n = useI18n();

const options = computed(() => [
	{ label: i18n.baseText('aiAssistant.assistant'), value: false },
	{ label: i18n.baseText('aiAssistant.builder.name'), value: true },
]);

function toggle(value: boolean) {
	emit('toggle', value);
}
</script>

<template>
	<n8n-radio-buttons
		size="small"
		:model-value="isBuildMode"
		:options="options"
		@update:model-value="toggle"
	/>
</template>
