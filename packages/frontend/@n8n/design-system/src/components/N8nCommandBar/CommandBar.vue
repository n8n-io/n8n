<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';

import N8nCommandBarItem from './CommandBarItem.vue';
import type {
	CommandBarItem,
	CommandBarSection,
	CommandBarSelectOptions,
	CommandBarTab,
} from './types';
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import { N8nDialog, N8nDialogClose } from '../N8nDialog';
import N8nIcon from '../N8nIcon';
import { N8nKeyboardShortcut } from '../N8nKeyboardShortcut';
import N8nLoading from '../N8nLoading';
import N8nSpinner from '../N8nSpinner';

interface CommandBarProps {
	sections: CommandBarSection[];
	tabs?: CommandBarTab[];
	placeholder?: string;
	breadcrumb?: string;
	isLoading?: boolean;
	hasMore?: boolean;
}

type CommandBarRow =
	| { type: 'header'; key: string; title: string }
	| { type: 'item'; key: string; item: CommandBarItem }
	| { type: 'skeleton'; key: string; index: number };

type CommandBarItemRow = Extract<CommandBarRow, { type: 'item' }>;

defineOptions({ name: 'N8nCommandBar' });

const props = withDefaults(defineProps<CommandBarProps>(), {
	tabs: () => [],
	placeholder: undefined,
	breadcrumb: undefined,
	isLoading: false,
	hasMore: false,
});

const emit = defineEmits<{
	select: [item: CommandBarItem, options: CommandBarSelectOptions];
	back: [];
	loadMore: [];
}>();

const isOpen = defineModel<boolean>('open', { default: false });
const query = defineModel<string>('query', { default: '' });
const activeTab = defineModel<string>('activeTab', { default: '' });

const SKELETON_ROWS_PER_SECTION = 2;
const LOAD_MORE_DISTANCE = 200;

const { t } = useI18n();
const listId = useId();

const inputRef = ref<HTMLInputElement>();
const listRef = ref<HTMLElement>();
const selectedKey = ref<string | null>(null);

const rows = computed(() => {
	const result: CommandBarRow[] = [];
	for (const section of props.sections) {
		const showSkeleton = section.isLoading === true && section.items.length === 0;
		if (section.items.length === 0 && !showSkeleton) continue;

		if (section.title) {
			result.push({ type: 'header', key: `header:${section.id}`, title: section.title });
		}
		for (const item of section.items) {
			result.push({ type: 'item', key: `${section.id}:${item.id}`, item });
		}
		if (showSkeleton) {
			for (let index = 0; index < SKELETON_ROWS_PER_SECTION; index++) {
				result.push({ type: 'skeleton', key: `skeleton:${section.id}:${index}`, index });
			}
		}
	}
	return result;
});

const itemRows = computed(() =>
	rows.value.filter((row): row is CommandBarItemRow => row.type === 'item'),
);
const rowIndexByKey = computed(() => new Map(itemRows.value.map((row, index) => [row.key, index])));

const selectedIndex = computed(
	() => (selectedKey.value === null ? undefined : rowIndexByKey.value.get(selectedKey.value)) ?? 0,
);
const selectedRow = computed<CommandBarItemRow | undefined>(
	() => itemRows.value[selectedIndex.value],
);
const selectedItem = computed(() => selectedRow.value?.item);

const showTabs = computed(() => props.tabs.length > 0 && !props.breadcrumb);
const activeTabIndex = computed(() => props.tabs.findIndex((tab) => tab.id === activeTab.value));
const isFilteredByTab = computed(() => showTabs.value && activeTabIndex.value > 0);
const isEmpty = computed(() => rows.value.length === 0 && !props.isLoading);
const emptyText = computed(() =>
	isFilteredByTab.value
		? t('commandBar.noResultsIn', { type: props.tabs[activeTabIndex.value].label })
		: t('commandBar.noResults'),
);

function scrollSelectionIntoView() {
	void nextTick(() => {
		const list = listRef.value;
		if (!list) return;
		if (selectedIndex.value === 0) {
			list.scrollTop = 0;
			return;
		}
		const key = selectedRow.value?.key;
		if (!key) return;
		list.querySelector(`[data-row-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'nearest' });
	});
}

function moveSelection(delta: number) {
	const count = itemRows.value.length;
	if (count === 0) return;
	const nextIndex = Math.min(Math.max(selectedIndex.value + delta, 0), count - 1);
	selectedKey.value = itemRows.value[nextIndex].key;
	scrollSelectionIntoView();
}

function switchTab(delta: number) {
	const count = props.tabs.length;
	const nextIndex = (Math.max(activeTabIndex.value, 0) + delta + count) % count;
	activeTab.value = props.tabs[nextIndex].id;
}

function selectItem(item: CommandBarItem, options: CommandBarSelectOptions) {
	if (item.disabled) return;
	emit('select', item, options);
}

function isCaretAt(position: 'start' | 'end') {
	const input = inputRef.value;
	if (!input || input.selectionStart !== input.selectionEnd) return false;
	return position === 'start'
		? input.selectionStart === 0
		: input.selectionEnd === input.value.length;
}

function onInputKeydown(event: KeyboardEvent) {
	event.stopPropagation();
	if (event.isComposing) return;

	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault();
			moveSelection(1);
			break;
		case 'ArrowUp':
			event.preventDefault();
			moveSelection(-1);
			break;
		case 'Enter': {
			event.preventDefault();
			const item = selectedItem.value;
			if (item) selectItem(item, { newTab: event.metaKey || event.ctrlKey });
			break;
		}
		case 'Tab':
			event.preventDefault();
			if (showTabs.value) switchTab(event.shiftKey ? -1 : 1);
			break;
		case 'ArrowLeft':
			if (props.breadcrumb && !query.value) {
				event.preventDefault();
				emit('back');
			} else if (showTabs.value && isCaretAt('start')) {
				event.preventDefault();
				switchTab(-1);
			}
			break;
		case 'ArrowRight':
			if (showTabs.value && isCaretAt('end')) {
				event.preventDefault();
				switchTab(1);
			}
			break;
		case 'Backspace':
			if (props.breadcrumb && !query.value) {
				event.preventDefault();
				emit('back');
			}
			break;
		case 'Escape':
			event.preventDefault();
			if (props.breadcrumb) {
				emit('back');
			} else {
				isOpen.value = false;
			}
			break;
	}
}

function onEscapeKeyDown(event: KeyboardEvent) {
	if (props.breadcrumb) {
		event.preventDefault();
		emit('back');
	}
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	inputRef.value?.focus();
}

function maybeLoadMore() {
	const list = listRef.value;
	if (!list || !props.hasMore || props.isLoading) return;
	if (list.scrollTop + list.clientHeight >= list.scrollHeight - LOAD_MORE_DISTANCE) {
		emit('loadMore');
	}
}

function onGlobalKeydown(event: KeyboardEvent) {
	if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
		event.preventDefault();
		isOpen.value = !isOpen.value;
	}
}

watch(isOpen, async (open) => {
	if (!open) return;
	selectedKey.value = null;
	await nextTick();
	inputRef.value?.focus();
});

watch([query, activeTab, () => props.breadcrumb], () => {
	selectedKey.value = null;
	if (listRef.value) listRef.value.scrollTop = 0;
});

watch(
	() => [rows.value.length, props.hasMore, props.isLoading],
	async () => {
		await nextTick();
		maybeLoadMore();
	},
);

onMounted(() => {
	document.addEventListener('keydown', onGlobalKeydown, { capture: true });
});

onBeforeUnmount(() => {
	document.removeEventListener('keydown', onGlobalKeydown, { capture: true });
});
</script>

<template>
	<N8nDialog
		v-model:open="isOpen"
		size="2xlarge"
		:show-close-button="false"
		:aria-label="t('commandBar.ariaLabel')"
		:container-class="$style.dialog"
		@escape-key-down="onEscapeKeyDown"
		@open-auto-focus="onOpenAutoFocus"
	>
		<div :class="$style.commandBar" data-test-id="command-bar">
			<div :class="$style.header">
				<button
					v-if="breadcrumb"
					type="button"
					tabindex="-1"
					:class="$style.breadcrumb"
					:aria-label="t('commandBar.back')"
					data-test-id="command-bar-breadcrumb"
					@mousedown.prevent
					@click="emit('back')"
				>
					<N8nIcon icon="chevron-left" size="small" />
					<span :class="$style.breadcrumbText">{{ breadcrumb }}</span>
				</button>
				<input
					ref="inputRef"
					v-model="query"
					type="text"
					role="combobox"
					autocomplete="off"
					spellcheck="false"
					aria-autocomplete="list"
					aria-expanded="true"
					:aria-controls="listId"
					:aria-activedescendant="selectedRow?.key"
					:placeholder="placeholder ?? t('commandBar.placeholder')"
					:class="$style.input"
					@keydown="onInputKeydown"
				/>
				<N8nSpinner
					v-if="isLoading"
					size="medium"
					:class="$style.spinner"
					data-test-id="command-bar-input-spinner"
					aria-hidden="true"
				/>
				<N8nDialogClose as-child>
					<button
						type="button"
						tabindex="-1"
						:class="$style.iconButton"
						:aria-label="t('commandBar.close')"
						data-test-id="command-bar-close"
					>
						<N8nIcon icon="x" size="large" />
					</button>
				</N8nDialogClose>
			</div>

			<div v-if="showTabs" role="tablist" :class="$style.tabs">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					type="button"
					role="tab"
					tabindex="-1"
					:aria-selected="tab.id === activeTab"
					:class="[$style.tab, { [$style.activeTab]: tab.id === activeTab }]"
					:data-test-id="`command-bar-tab-${tab.id}`"
					@mousedown.prevent
					@click="activeTab = tab.id"
				>
					{{ tab.label }}
				</button>
			</div>

			<div
				:id="listId"
				ref="listRef"
				role="listbox"
				:class="$style.list"
				data-test-id="command-bar-items-list"
				@scroll="maybeLoadMore"
			>
				<template v-for="row in rows" :key="row.key">
					<div v-if="row.type === 'header'" role="presentation" :class="$style.sectionHeader">
						{{ row.title }}
					</div>
					<N8nCommandBarItem
						v-else-if="row.type === 'item'"
						:item="row.item"
						:row-key="row.key"
						:is-selected="row.key === selectedRow?.key"
						:query="query"
						@select="selectItem"
						@hover="selectedKey = $event"
					/>
					<div
						v-else
						role="presentation"
						:class="$style.skeletonRow"
						data-test-id="command-bar-skeleton"
					>
						<span :class="$style.skeletonIcon"><N8nLoading variant="custom" /></span>
						<span :class="[$style.skeletonText, $style[`skeletonWidth${row.index}`]]">
							<N8nLoading variant="custom" />
						</span>
					</div>
				</template>

				<div v-if="isEmpty" :class="$style.empty" data-test-id="command-bar-empty">
					<span>{{ emptyText }}</span>
					<N8nButton
						v-if="isFilteredByTab"
						variant="subtle"
						size="small"
						data-test-id="command-bar-search-all"
						@mousedown.prevent
						@click="activeTab = tabs[0].id"
					>
						{{ t('commandBar.searchAll') }}
					</N8nButton>
				</div>
			</div>

			<div :class="$style.footer" aria-hidden="true">
				<span :class="$style.hint">
					{{ breadcrumb ? t('commandBar.back') : t('commandBar.close') }}
					<N8nKeyboardShortcut :keys="['Esc']" />
				</span>
				<span v-if="showTabs" :class="$style.hint">
					{{ t('commandBar.changeType') }}
					<N8nKeyboardShortcut :keys="['←', '→']" />
				</span>
				<span v-if="selectedItem?.href" :class="$style.hint">
					{{ t('commandBar.openInNewTab') }}
					<N8nKeyboardShortcut meta-key :keys="['↵']" />
				</span>
			</div>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.dialog {
	--n8n-dialog-content--padding: 0;
	overflow: hidden;
}

.commandBar {
	display: flex;
	flex-direction: column;
	height: min(34rem, calc(100dvh - var(--spacing--3xl)));
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--xs) var(--spacing--md);
}

.input {
	flex: 1;
	min-width: 0;
	height: var(--spacing--xl);
	padding: 0;
	border: none;
	outline: none;
	background: transparent;
	color: var(--text-color);
	font-family: var(--font-family);
	font-size: var(--font-size--md);

	&::placeholder {
		color: var(--text-color--subtler);
	}
}

.spinner {
	color: var(--icon-color);
}

.breadcrumb {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
	max-width: 40%;
	height: var(--spacing--lg);
	padding: 0 var(--spacing--2xs) 0 var(--spacing--3xs);
	border: none;
	border-radius: var(--radius--3xs);
	background-color: var(--background--active);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--regular);
	cursor: pointer;
}

.breadcrumbText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.iconButton {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	padding: 0;
	border: none;
	border-radius: var(--radius--xs);
	background: none;
	color: var(--text-color--subtle);
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
		color: var(--text-color);
	}
}

.tabs {
	display: flex;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--md) var(--spacing--xs);
	overflow-x: auto;
	scrollbar-width: none;
	border-bottom: var(--border);
}

.tab {
	flex-shrink: 0;
	height: calc(var(--spacing--lg) + var(--spacing--4xs));
	padding: 0 var(--spacing--xs);
	border: none;
	border-radius: var(--radius--xs);
	background: none;
	color: var(--text-color--subtle);
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}
}

.activeTab {
	background-color: var(--background--active);
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
}

.list {
	flex: 1;
	min-height: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	scroll-padding-block: var(--spacing--2xs);
	overflow-y: auto;
	scrollbar-width: thin;
}

.sectionHeader {
	display: flex;
	align-items: flex-end;
	height: var(--spacing--xl);
	padding: 0 var(--spacing--xs) var(--spacing--3xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	user-select: none;
}

.skeletonRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	height: var(--command-bar-item--height);
	padding: 0 var(--spacing--xs);
}

.skeletonIcon {
	flex-shrink: 0;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	overflow: hidden;
	border-radius: var(--radius--3xs);
}

.skeletonText {
	height: var(--spacing--xs);
	overflow: hidden;
	border-radius: var(--radius--3xs);
}

.skeletonWidth0 {
	width: 45%;
}

.skeletonWidth1 {
	width: 60%;
}

.skeletonWidth2 {
	width: 35%;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	height: 100%;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--lg);
	padding: var(--spacing--xs) var(--spacing--md);
	overflow: hidden;
	border-top: var(--border);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}

.hint {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
