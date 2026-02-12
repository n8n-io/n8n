<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { N8nRadioButtons, N8nTooltip } from '@n8n/design-system';

type Props = {
	isBuildMode: boolean;
	disabled?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
});

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
	<N8nTooltip
		:content="i18n.baseText('aiAssistant.tabs.builder.disabled.tooltip')"
		:disabled="!props.disabled"
	>
		<N8nRadioButtons
			size="small"
			:model-value="props.isBuildMode"
			:options="options"
			:disabled="props.disabled"
			@update:model-value="toggle"
		/>
	</N8nTooltip>
</template>
