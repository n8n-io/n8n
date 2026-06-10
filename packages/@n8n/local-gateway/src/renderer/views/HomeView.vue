<script setup lang="ts">
import { N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

import HistoryView from './HistoryView.vue';
import TasksView from './TasksView.vue';

type Tab = 'tasks' | 'history';

const i18n = useI18n();
const activeTab = ref<Tab>('tasks');

const TABS: Array<{
	id: Tab;
	labelKey: 'desktopAssistant.tabs.tasks' | 'desktopAssistant.tabs.history';
}> = [
	{ id: 'tasks', labelKey: 'desktopAssistant.tabs.tasks' },
	{ id: 'history', labelKey: 'desktopAssistant.tabs.history' },
];
</script>

<template>
	<main :class="$style.home">
		<div :class="$style.tabBar">
			<div :class="$style.tabs">
				<button
					v-for="tab in TABS"
					:key="tab.id"
					type="button"
					:class="[$style.tab, { [$style.active]: activeTab === tab.id }]"
					@click="activeTab = tab.id"
				>
					<N8nText size="small" :bold="true">{{ i18n.baseText(tab.labelKey) }}</N8nText>
				</button>
			</div>
			<!-- Search is part of the target layout but not wired up yet. -->
			<N8nIconButton
				icon="search"
				variant="ghost"
				size="large"
				:aria-label="i18n.baseText('desktopAssistant.search.ariaLabel')"
			/>
		</div>

		<div :class="$style.content">
			<TasksView v-if="activeTab === 'tasks'" />
			<HistoryView v-else />
		</div>
	</main>
</template>

<style module>
.home {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.tabBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--2xs);
}

.tabs {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.tab {
	padding: 5px 11px;
	font-size: 12px;
	font-weight: 500;
	color: var(--da-subtler);
	/* Transparent border on the base so toggling active doesn't shift layout. */
	border: 1px solid transparent;
	border-radius: 20px;
	background: transparent;
	cursor: pointer;
	font-family: inherit;
	transition:
		background 0.12s,
		color 0.12s;
}

.tab:hover {
	color: var(--da-text);
	background: var(--da-surface-2);
}

.tab.active {
	color: var(--da-text);
	background: var(--da-surface-2);
	border-color: var(--da-border);
}

.content {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	overflow-y: auto;
}
</style>
