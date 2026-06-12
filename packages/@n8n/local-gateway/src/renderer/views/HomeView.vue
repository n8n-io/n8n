<script setup lang="ts">
import { N8nButton, N8nIcon, N8nInput, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import HistoryView from './HistoryView.vue';
import TasksView from './TasksView.vue';
import ChatView from '../components/ChatView.vue';
import TaskComposer from '../components/TaskComposer.vue';

import { useTaskSearch } from '../assistant/use-task-search';

type Tab = 'tasks' | 'history' | 'chat';

const i18n = useI18n();
const activeTab = ref<Tab>('tasks');

// Chat is a real tab, but each selection starts a fresh thread (no resume). The
// thread is ensured server-side before ChatView opens it, so its snapshot fetch
// resolves instead of 404-ing on an unborn thread.
const chatThreadId = ref<string | null>(null);
const chatCreating = ref(false);
const chatError = ref(false);

async function startNewChat() {
	// Dedupe concurrent creates (rapid clicks / arrow-key roving) into one thread.
	if (chatCreating.value) return;
	chatCreating.value = true;
	chatError.value = false;
	chatThreadId.value = null;
	try {
		const result = await window.electronAPI.createChatThread();
		if (result.ok && result.threadId) {
			chatThreadId.value = result.threadId;
		} else {
			chatError.value = true;
			console.error('Failed to create chat thread', result.error);
		}
	} catch (error) {
		chatError.value = true;
		console.error('Failed to create chat thread', error);
	} finally {
		chatCreating.value = false;
	}
}

// Search is tasks-scoped: the field only shows on the Tasks tab, and the query
// is passed down to TasksView for client-side filtering.
const search = useTaskSearch();
const searchVisible = computed(() => search.open.value && activeTab.value === 'tasks');

/** Search lives in the shared tab bar but only filters Tasks. From any other
 *  tab (History, Chat), clicking it jumps to Tasks and opens the field; from
 *  Tasks it toggles. */
function onSearchIconClick() {
	if (activeTab.value !== 'tasks') {
		selectTab('tasks');
		search.openSearch();
		return;
	}
	search.toggle();
}

function onSearchKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') search.closeSearch();
}

// The composer owns the prompt → backend flow; a clicked recommendation routes
// its prompt through it so the feedback (thinking → doing → done) is identical
// to typing or tapping a suggestion chip.
const composer = ref<InstanceType<typeof TaskComposer> | null>(null);
function runPrompt(prompt: string) {
	composer.value?.submit(prompt);
}

const TABS: Array<{
	id: Tab;
	labelKey:
		| 'desktopAssistant.tabs.tasks'
		| 'desktopAssistant.tabs.history'
		| 'desktopAssistant.tabs.chat';
}> = [
	{ id: 'tasks', labelKey: 'desktopAssistant.tabs.tasks' },
	{ id: 'history', labelKey: 'desktopAssistant.tabs.history' },
	{ id: 'chat', labelKey: 'desktopAssistant.tabs.chat' },
];

// Refs to the tab buttons, so arrow keys can move focus along with selection
// (roving tabindex: only the active tab is in the tab order).
const tabRefs = ref<HTMLButtonElement[]>([]);

function selectTab(id: Tab) {
	activeTab.value = id;
	// Selecting Chat always begins a fresh conversation.
	if (id === 'chat') void startNewChat();
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
			<button
				type="button"
				:class="[$style.searchButton, { [$style.searchButtonActive]: searchVisible }]"
				:aria-label="i18n.baseText('desktopAssistant.search.ariaLabel')"
				:aria-expanded="searchVisible"
				@click="onSearchIconClick"
			>
				<N8nIcon icon="search" :size="16" />
			</button>
		</div>

		<div v-if="searchVisible" :class="$style.searchRow">
			<N8nInput
				v-model="search.query.value"
				size="small"
				autofocus
				:placeholder="i18n.baseText('desktopAssistant.search.placeholder')"
				@keydown="onSearchKeydown"
			>
				<template #prefix>
					<N8nIcon icon="search" :size="14" />
				</template>
				<template #suffix>
					<button
						type="button"
						:class="$style.clearButton"
						:aria-label="i18n.baseText('desktopAssistant.search.clearAriaLabel')"
						@click="search.closeSearch()"
					>
						<N8nIcon icon="x" :size="14" />
					</button>
				</template>
			</N8nInput>
		</div>

		<div
			id="da-tabpanel"
			:class="$style.content"
			role="tabpanel"
			:aria-labelledby="`da-tab-${activeTab}`"
			tabindex="0"
		>
			<TasksView
				v-if="activeTab === 'tasks'"
				:query="searchVisible ? search.query.value : ''"
				@executed="activeTab = 'history'"
				@run-prompt="runPrompt"
			/>
			<HistoryView v-else-if="activeTab === 'history'" />
			<template v-else>
				<div v-if="chatError" :class="$style.chatState" role="alert">
					<N8nText color="text-light" size="small">{{
						i18n.baseText('desktopAssistant.chat.error')
					}}</N8nText>
					<N8nButton variant="outline" size="small" @click="startNewChat">{{
						i18n.baseText('desktopAssistant.chat.retry')
					}}</N8nButton>
				</div>
				<div v-else-if="!chatThreadId" :class="$style.chatState" role="status" aria-live="polite">
					<N8nSpinner aria-hidden="true" />
					<N8nText color="text-light" size="small">{{
						i18n.baseText('desktopAssistant.chat.loading')
					}}</N8nText>
				</div>
				<ChatView v-else :thread-id="chatThreadId" />
			</template>
		</div>

		<!-- The composer is pinned below the scrollable list, only on the Tasks tab.
		     "Keep this" lands the user on the Tasks list, where the pending entry shows. -->
		<TaskComposer v-if="activeTab === 'tasks'" ref="composer" @kept="activeTab = 'tasks'" />
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

.searchButtonActive {
	background: var(--da-surface-2);
	color: var(--da-text);
}

.searchRow {
	padding: var(--spacing--4xs) var(--spacing--sm) var(--spacing--2xs);
}

.clearButton {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: none;
	background: transparent;
	color: var(--da-subtler);
	cursor: pointer;
	transition: color 0.12s;
}

.clearButton:hover {
	color: var(--da-text);
}

.clearButton:focus-visible {
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

/* Centered loading/error state shown while a chat thread is being created. */
.chatState {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--2xs);
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl) var(--spacing--md);
}
</style>
