<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { N8nSegmentControl } from '@n8n/design-system';

type Props = {
	isBuildMode: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	toggle: [value: boolean];
}>();

const i18n = useI18n();

const options = computed(() => [
	{ label: i18n.baseText('aiAssistant.tabs.ask'), value: false },
	{ label: i18n.baseText('aiAssistant.tabs.build'), value: true },
]);

function toggle(value: boolean) {
	emit('toggle', value);
}
</script>

<template>
	<N8nSegmentControl
		size="small"
		:model-value="props.isBuildMode"
		:options="options"
		@update:model-value="toggle"
	/>
</template>
