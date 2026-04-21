<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import type { FocusSidebarTabs } from '@/features/setupPanel/types';
import type { TabOptions } from '@n8n/design-system';
import { N8nIcon, N8nTabs } from '@n8n/design-system';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';

const i18n = useI18n();
const focusPanelStore = useFocusPanelStore();

const props = withDefaults(
	defineProps<{
		modelValue?: FocusSidebarTabs;
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
	'update:modelValue': [tab: FocusSidebarTabs];
}>();

const tabs = computed<Array<TabOptions<FocusSidebarTabs>>>(() => [
	{
		label: props.tabLabels?.setup ?? i18n.baseText('setupPanel.tabs.setup'),
		value: 'setup',
	},
	{
		label: props.tabLabels?.focus ?? i18n.baseText('setupPanel.tabs.focus'),
		value: 'focus',
	},
]);

const onTabSelected = (tab: FocusSidebarTabs) => {
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
		<button
			data-test-id="setup-panel-close"
			:class="$style['close-button']"
			@click="focusPanelStore.closeFocusPanel()"
		>
			<N8nIcon icon="x" size="small" />
		</button>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: center;
	padding-top: var(--spacing--xs);
	position: relative;

	&::after {
		content: '';
		position: absolute;
		bottom: 1px;
		left: 0;
		right: 0;
		height: var(--border-width);
		background-color: var(--color--foreground);
		z-index: 1;
	}
}

.close-button {
	display: flex;
	align-items: center;
	justify-content: center;
	position: absolute;
	right: var(--spacing--xs);
	top: 50%;
	transform: translateY(-50%);
	padding: var(--spacing--4xs);
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	border-radius: var(--radius);
	z-index: 2;

	&:hover {
		color: var(--color--text);
	}
}
</style>
