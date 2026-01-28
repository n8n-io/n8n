<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import type { SetupPanelTabs } from '@/features/setupPanel/types';
import type { TabOptions } from '@n8n/design-system';
import { N8nTabs } from '@n8n/design-system';

const i18n = useI18n();

const props = withDefaults(
	defineProps<{
		modelValue?: SetupPanelTabs;
		tabLabels?: {
			setup?: string;
			focus?: string;
		};
	}>(),
	{
		modelValue: 'setup',
		tabLabels: () => ({}),
	},
);

const emit = defineEmits<{
	'update:modelValue': [tab: SetupPanelTabs];
}>();

const tabs = computed<Array<TabOptions<SetupPanelTabs>>>(() => [
	{
		label: props.tabLabels?.setup ?? i18n.baseText('setupPanel.tabs.setup'),
		value: 'setup',
	},
	{
		label: props.tabLabels?.focus ?? i18n.baseText('setupPanel.tabs.focus'),
		value: 'focus',
	},
]);

const onTabSelected = (tab: SetupPanelTabs) => {
	emit('update:modelValue', tab);
};
</script>

<template>
	<div :class="$style.container" data-test-id="setup-panel-tabs">
		<N8nTabs
			:model-value="modelValue"
			:options="tabs"
			size="small"
			@update:model-value="onTabSelected"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	padding: var(--spacing--3xs);
}
</style>
