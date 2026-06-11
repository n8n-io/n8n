<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onMounted, ref } from 'vue';

import HistoryView from './HistoryView.vue';
import TasksView from './TasksView.vue';
import TaskComposer from '../components/TaskComposer.vue';

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

// Refs to the tab buttons, so arrow keys can move focus along with selection
// (roving tabindex: only the active tab is in the tab order).
const tabRefs = ref<HTMLButtonElement[]>([]);

function selectTab(id: Tab) {
	activeTab.value = id;
}

/** Left/Right arrow + Home/End move selection and focus between tabs. */
function onTabKeydown(event: KeyboardEvent, index: number) {
	const lastIndex = TABS.length - 1;
	let nextIndex: number | null = null;

	switch (event.key) {
		case 'ArrowRight':
			nextIndex = index === lastIndex ? 0 : index + 1;
			break;
		case 'ArrowLeft':
			nextIndex = index === 0 ? lastIndex : index - 1;
			break;
		case 'Home':
			nextIndex = 0;
			break;
		case 'End':
			nextIndex = lastIndex;
			break;
		default:
			return;
	}

	event.preventDefault();
	selectTab(TABS[nextIndex].id);
	tabRefs.value[nextIndex]?.focus();
}

onMounted(() => {
	// Home is re-mounted whenever a sub-screen (draft/setup/complex) returns here,
	// so anchoring focus on the active tab keeps keyboard users oriented instead
	// of leaving focus on a control that was just unmounted.
	const activeIndex = TABS.findIndex((tab) => tab.id === activeTab.value);
	tabRefs.value[activeIndex]?.focus();
});
</script>

<template>
	<main :class="$style.home">
		<div :class="$style.tabBar">
			<div
				:class="$style.tabs"
				role="tablist"
				:aria-label="i18n.baseText('desktopAssistant.tabs.ariaLabel')"
			>
				<button
					v-for="(tab, index) in TABS"
					:key="tab.id"
					ref="tabRefs"
					type="button"
					role="tab"
					:id="`da-tab-${tab.id}`"
					:aria-selected="activeTab === tab.id"
					aria-controls="da-tabpanel"
					:tabindex="activeTab === tab.id ? 0 : -1"
					:class="[$style.tab, { [$style.active]: activeTab === tab.id }]"
					@click="selectTab(tab.id)"
					@keydown="onTabKeydown($event, index)"
				>
					{{ i18n.baseText(tab.labelKey) }}
				</button>
			</div>
			<!-- Search is part of the target layout but not wired up yet. -->
			<button
				type="button"
				:class="$style.searchButton"
				:aria-label="i18n.baseText('desktopAssistant.search.ariaLabel')"
			>
				<N8nIcon icon="search" :size="16" />
			</button>
		</div>

		<div
			id="da-tabpanel"
			:class="$style.content"
			role="tabpanel"
			:aria-labelledby="`da-tab-${activeTab}`"
			tabindex="0"
		>
			<TasksView v-if="activeTab === 'tasks'" @executed="activeTab = 'history'" />
			<HistoryView v-else />
		</div>

		<!-- The composer is pinned below the scrollable list, only on the Tasks tab. -->
		<TaskComposer v-if="activeTab === 'tasks'" />
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
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs) var(--spacing--sm) var(--spacing--4xs);
}

.tabs {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.searchButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	margin-left: auto;
	border: none;
	border-radius: 7px;
	background: transparent;
	color: var(--da-subtler);
	cursor: pointer;
	transition:
		background 0.12s,
		color 0.12s;
}

.searchButton:hover {
	background: var(--da-surface-2);
	color: var(--da-text);
}

.searchButton:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.tab {
	padding: 5px 11px;
	font-size: 12px;
	font-weight: 500;
	color: var(--da-subtler);
	/* Transparent border on the base so toggling active doesn't shift layout. */
	border: 1px solid transparent;
	border-radius: var(--radius--full);
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

.tab:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.content {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	overflow-y: auto;
}

.content:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: calc(-1 * var(--da-focus-ring-offset));
}
</style>
