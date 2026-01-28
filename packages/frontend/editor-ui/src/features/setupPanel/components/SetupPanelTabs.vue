<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { ref, computed } from 'vue';
import type { SetupPanelTabs } from '@/features/setupPanel/types';
import type { TabOptions } from '@n8n/design-system';
import { N8nTabs } from '@n8n/design-system';

const i18n = useI18n();

const props = defineProps<{
	tabLabels?: {
		setup?: string;
		focus?: string;
	};
}>();

const emit = defineEmits<{
	tabSelected: [tab: SetupPanelTabs];
}>();

const selectedTab = ref<SetupPanelTabs>('setup');

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
	selectedTab.value = tab;
	emit('tabSelected', tab);
};
</script>

<template>
	<div :class="$style.container" data-test-id="setup-panel-tabs">
		<N8nTabs
			:model-value="selectedTab"
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
