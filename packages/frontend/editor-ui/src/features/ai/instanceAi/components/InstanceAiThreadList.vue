<script lang="ts" setup>
import { getRelativeDate } from '@/features/ai/chatHub/chat.utils';
import {
	N8nActionDropdown,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nScrollArea,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import {
	ComboboxContent,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxRoot,
} from 'reka-ui';
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_THREADS_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { clearPendingThreadHandoff } from '../composables/useInstanceAiHandoff';
import { useInstanceAiThreadHistory } from '../composables/useInstanceAiThreadHistory';
import { useToast } from '@n8n/composables/useToast';

const props = withDefaults(
	defineProps<{
		maxHeight?: string;
		/** Scope the history shown — applied to `history.threads` before grouping. */
		filter?: (thread: InstanceAiThreadSummary) => boolean;
		/** False → rows are buttons emitting `select` instead of `RouterLink`s, "View all" is hidden,
		 * and deleting the active thread emits `deleted(true)` instead of navigating. For an
		 * embedding host that has no thread route of its own. */
		navigate?: boolean;
		/** Falls back to the route param when omitted (the page's own use). */
		activeThreadId?: string;
		/** The assistant is actively building — rows stop being interactive so a click can't race it. */
		disabled?: boolean;
	}>(),
	{
		maxHeight: undefined,
		filter: undefined,
		navigate: true,
		activeThreadId: undefined,
		disabled: false,
	},
);

const emit = defineEmits<{
	close: [];
	select: [threadId: string];
	deleted: [wasActive: boolean];
}>();

const store = useInstanceAiStore();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const { history, search, listRef, sentinelRef, loadMore } = useInstanceAiThreadHistory();

const editingThreadId = ref<string | null>(null);
const editingTitle = ref('');
const renameInput = ref<HTMLInputElement | null>(null);
const comboboxRef = ref<{
	highlightFirstItem?: () => void;
}>();
const activeThreadId = computed(
	() =>
		props.activeThreadId ??
		(typeof route.params.threadId === 'string' ? route.params.threadId : undefined),
);

const threadActions: Array<ActionDropdownItem<'rename' | 'delete'>> = [
	{
		id: 'rename',
		label: i18n.baseText('instanceAi.sidebar.renameThread'),
		icon: 'pencil',
	},
	{
		id: 'delete',
		label: i18n.baseText('instanceAi.sidebar.deleteThread'),
		icon: 'trash-2',
	},
];

const dateGroupI18nMap: Record<string, string> = {
	Today: i18n.baseText('userActivity.today'),
	Yesterday: i18n.baseText('userActivity.yesterday'),
	'This week': i18n.baseText('instanceAi.sidebar.group.thisWeek'),
	Older: i18n.baseText('instanceAi.sidebar.group.older'),
};

const groupOrder = ['Today', 'Yesterday', 'This week', 'Older'] as const;

// Scoped to the embedding host's subject (e.g. one agent) before grouping —
// the underlying history stays the shared, server-paged list.
const filteredThreads = computed(() =>
	props.filter ? history.value.threads.filter(props.filter) : history.value.threads,
);

const groupedThreads = computed(() => {
	const now = new Date();
	const groups = new Map<string, typeof history.value.threads>();

	// Group by last activity, not creation date: a thread created weeks ago
	// but messaged today belongs under "Today", matching the backend ordering
	// (memory.service returns threads sorted by updatedAt desc) and the
	// chatHub sidebar's `groupConversationsByDate` behaviour.
	for (const thread of filteredThreads.value) {
		const group = getRelativeDate(now, thread.updatedAt ?? thread.createdAt);
		let threads = groups.get(group);
		if (!threads) {
			threads = [];
			groups.set(group, threads);
		}
		threads.push(thread);
	}

	return groupOrder.flatMap((groupName) => {
		const threads = groups.get(groupName) ?? [];
		return threads.length > 0 ? [{ label: dateGroupI18nMap[groupName] ?? groupName, threads }] : [];
	});
});

watch(
	() => history.value.threads.length,
	async (length, previousLength) => {
		await nextTick();
		// A search response replaces the rows (the count passes through 0). Highlight the
		// first match so Enter opens it. Pages that append rows keep the highlight where it is.
		if (previousLength === 0 && length > 0 && history.value.search) {
			comboboxRef.value?.highlightFirstItem?.();
		}
	},
	{ flush: 'post' },
);

async function handleDeleteThread(threadId: string) {
	const wasActive = threadId === activeThreadId.value;
	const deleted = await store.deleteThread(threadId);
	if (!deleted) return;
	clearPendingThreadHandoff(threadId);

	if (!wasActive) return;
	if (!props.navigate) {
		// No thread route of our own to land on — let the host decide.
		emit('deleted', true);
		return;
	}
	if (store.threads.length > 0) {
		void router.push({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: store.threads[0].id },
		});
	} else {
		void router.push({ name: INSTANCE_AI_VIEW });
	}
}

function openAllThreads() {
	emit('close');
	void router.push({ name: INSTANCE_AI_THREADS_VIEW });
}

function openNewThread() {
	emit('close');
	void router.push({ name: INSTANCE_AI_VIEW });
}

function setRenameInput(element: unknown) {
	renameInput.value = element instanceof HTMLInputElement ? element : null;
}

function startRename(threadId: string, currentTitle: string) {
	editingThreadId.value = threadId;
	editingTitle.value = currentTitle;
	void nextTick(() => {
		renameInput.value?.focus();
		renameInput.value?.select();
	});
}

async function confirmRename(threadId: string) {
	// Enter and the blur it causes both call this; leaving edit mode first keeps one request.
	if (editingThreadId.value !== threadId) return;
	editingThreadId.value = null;
	const title = editingTitle.value.trim();
	if (!title || title === history.value.threads.find((t) => t.id === threadId)?.title) return;
	try {
		await store.renameThread(threadId, title);
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.threads.renameError'));
	}
}

function cancelRename() {
	editingThreadId.value = null;
}

function handleThreadSelect(threadId: string) {
	// The `disabled` attribute already blocks real user interaction; this guards
	// the emit itself too, since a disabled element still receives a
	// programmatically dispatched click.
	if (props.disabled) return;
	emit('select', threadId);
}

function handleThreadAction(action: string, threadId: string) {
	// N8nActionDropdown has no `disabled` slot for a custom `#activator`, so the
	// trigger button below is disabled directly — this is the second guard for
	// whatever reaches here anyway (e.g. an already-open menu).
	if (props.disabled) return;
	if (action === 'delete') {
		void handleDeleteThread(threadId);
	} else if (action === 'rename') {
		const thread = history.value.threads.find((t) => t.id === threadId);
		if (thread) {
			startRename(threadId, thread.title);
		}
	}
}
</script>

<template>
	<ComboboxRoot
		ref="comboboxRef"
		as-child
		:open="true"
		:ignore-filter="true"
		:reset-search-term-on-blur="false"
		:reset-search-term-on-select="false"
	>
		<div :class="$style.container" data-test-id="instance-ai-thread-list">
			<div :class="$style.header">
				<N8nText :class="$style.title" tag="div" size="medium" bold>
					{{ i18n.baseText('instanceAi.sidebar.chatHistory') }}
				</N8nText>
				<N8nButton
					v-if="navigate"
					variant="ghost"
					size="small"
					:class="$style.viewAll"
					data-test-id="instance-ai-view-all-threads"
					@click="openAllThreads"
				>
					{{ i18n.baseText('instanceAi.threads.viewAll') }}
				</N8nButton>
				<N8nTooltip
					v-if="navigate"
					:content="i18n.baseText('instanceAi.thread.new')"
					placement="bottom"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<N8nButton
						variant="ghost"
						size="small"
						icon-only
						:aria-label="i18n.baseText('instanceAi.thread.new')"
						data-test-id="instance-ai-new-thread"
						@click="openNewThread"
					>
						<template #icon>
							<N8nIcon
								icon="message-circle-plus"
								size="large"
								color="--icon-color--strong"
								:stroke-width="1.5"
							/>
						</template>
					</N8nButton>
				</N8nTooltip>
			</div>
			<form :class="$style.search" role="search" @submit.prevent>
				<div :class="$style.searchControl">
					<N8nIcon icon="search" size="small" :class="$style.searchIcon" />
					<ComboboxInput
						v-model="search"
						:class="$style.searchInput"
						:auto-focus="true"
						autocomplete="off"
						spellcheck="false"
						:placeholder="i18n.baseText('instanceAi.threads.searchPlaceholder')"
						data-test-id="instance-ai-thread-search"
					/>
					<N8nIconButton
						v-if="search"
						variant="ghost"
						size="xsmall"
						icon="x"
						:class="$style.clearSearch"
						:aria-label="i18n.baseText('generic.list.clearSelection')"
						@mousedown.prevent
						@click="search = ''"
					/>
				</div>
			</form>

			<ComboboxContent force-mount as-child>
				<div ref="listRef" :class="$style.comboboxContent">
					<N8nScrollArea
						:class="[$style.threadList, { [$style.hasMore]: history.hasMore }]"
						:max-height="props.maxHeight"
						type="auto"
					>
						<ComboboxGroup v-for="group in groupedThreads" :key="group.label" :class="$style.group">
							<ComboboxLabel :class="$style.groupLabel">
								<N8nText tag="span" size="small" color="text-light">
									{{ group.label }}
								</N8nText>
							</ComboboxLabel>
							<div
								v-for="thread in group.threads"
								:key="thread.id"
								:class="[$style.threadItem, { [$style.disabled]: disabled }]"
								data-test-id="instance-ai-thread-item"
							>
								<!-- Inline rename mode -->
								<div v-if="editingThreadId === thread.id" :class="$style.renameContainer">
									<input
										:ref="setRenameInput"
										v-model="editingTitle"
										:class="$style.renameInput"
										type="text"
										maxlength="255"
										:aria-label="i18n.baseText('instanceAi.threads.rename')"
										@keydown.enter="confirmRename(thread.id)"
										@keydown.escape="cancelRename"
										@blur="confirmRename(thread.id)"
									/>
								</div>
								<!-- Normal display mode -->
								<template v-else>
									<ComboboxItem as-child :value="thread.id" :text-value="thread.title">
										<RouterLink
											v-if="navigate"
											:to="{ name: INSTANCE_AI_THREAD_VIEW, params: { threadId: thread.id } }"
											:class="$style.threadLink"
											:title="thread.title"
											active-class=""
											exact-active-class=""
											@click="handleThreadSelect(thread.id)"
											@dblclick.prevent="startRename(thread.id, thread.title)"
										>
											<span :class="$style.threadTitle">{{ thread.title }}</span>
										</RouterLink>
										<!-- No thread route to land on (an embedding host) — emit `select` instead. -->
										<button
											v-else
											type="button"
											:class="[$style.threadLink, $style.threadLinkButton]"
											:title="thread.title"
											:disabled="disabled"
											@click="handleThreadSelect(thread.id)"
											@dblclick.prevent="startRename(thread.id, thread.title)"
										>
											<span :class="$style.threadTitle">{{ thread.title }}</span>
										</button>
									</ComboboxItem>
									<N8nActionDropdown
										:items="threadActions"
										:class="$style.actionDropdown"
										placement="bottom-start"
										:disabled="disabled"
										@select="handleThreadAction($event, thread.id)"
										@click.stop
									>
										<template #activator>
											<N8nIconButton
												variant="ghost"
												icon="ellipsis-vertical"
												:class="$style.actionTrigger"
												:disabled="disabled"
												:aria-label="i18n.baseText('instanceAi.threads.actions')"
											/>
										</template>
									</N8nActionDropdown>
								</template>
							</div>
						</ComboboxGroup>
						<div v-if="history.loading" :class="$style.status" role="status">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('instanceAi.threads.loading') }}
							</N8nText>
						</div>
						<div v-else-if="history.error" :class="$style.status" role="alert">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('instanceAi.threads.loadError') }}
							</N8nText>
							<N8nButton variant="ghost" size="xsmall" @click="loadMore">
								{{ i18n.baseText('generic.retry') }}
							</N8nButton>
						</div>
						<div v-else-if="history.hasMore" ref="sentinelRef" :class="$style.sentinel" />
						<div v-else-if="filteredThreads.length === 0" :class="$style.empty" role="status">
							<N8nText size="small" color="text-light">
								{{
									i18n.baseText(
										history.search
											? 'instanceAi.threads.noSearchResults'
											: 'instanceAi.sidebar.noThreads',
									)
								}}
							</N8nText>
						</div>
						<div v-if="history.hasMore" :class="$style.fadeSpacer" />
					</N8nScrollArea>
				</div>
			</ComboboxContent>
		</div>
	</ComboboxRoot>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/input' as input-mixin;

.container {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	width: 100%;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	min-height: var(--height--xl);
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color);
}

.viewAll {
	--button--color: var(--text-color--subtle);

	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
}

.search {
	padding: 0 var(--spacing--sm);
}

.searchControl {
	@include input-mixin.size-variables('small');
	@include input-mixin.theme-variables;
	@include focus.focus-within-ring;

	position: relative;
	display: flex;
	align-items: center;
	width: 100%;
	min-height: var(--input--height);
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow:
		var(--input--shadow),
		inset var(--input--border--shadow);

	&:hover:not(:focus-within) {
		box-shadow:
			var(--input--shadow--hover),
			inset var(--input--border--shadow--hover);
	}

	&:focus-within {
		box-shadow:
			var(--input--shadow--focus),
			inset var(--input--border--shadow--focus);
	}
}

.searchIcon {
	position: absolute;
	left: var(--input--padding);
	color: var(--color--text--shade-1);
	opacity: 0.7;
	pointer-events: none;
}

.searchInput {
	width: 100%;
	min-width: 0;
	min-height: var(--input--height);
	padding: 0 calc(var(--input--padding) + var(--spacing--sm) + var(--spacing--3xs));
	font-family: inherit;
	font-size: var(--input--font-size);
	color: var(--input--color--text);
	background: transparent;
	border: none;
	outline: none;

	&::placeholder {
		color: var(--input--placeholder--color);
	}
}

.clearSearch {
	position: absolute;
	right: var(--spacing--4xs);
}

.comboboxContent {
	position: relative;
	display: flex;
	flex: 1;
	min-height: 0;
}

.threadList {
	flex: 1;
	min-height: 0;
	padding: var(--spacing--2xs);

	// The spacer is as tall as the fade, so the fade covers no row when the next page loads.
	&.hasMore::after {
		content: '';
		position: absolute;
		inset: auto 0 0;
		height: var(--spacing--lg);
		background: linear-gradient(to bottom, transparent, var(--background--surface));
		pointer-events: none;
	}
}

.fadeSpacer {
	height: var(--spacing--lg);
}

.group {
	&:not(:first-child) {
		margin-top: var(--spacing--xs);
	}
}

.groupLabel {
	padding: var(--spacing--4xs) var(--spacing--xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.threadItem {
	display: flex;
	align-items: center;
	height: var(--height--md);
	border-radius: var(--radius);

	&:focus-within,
	&:has([aria-expanded='true']),
	&:has([data-highlighted]) {
		background-color: var(--background--hover);
	}

	// Gate hover to hover-capable devices so touch doesn't need a first tap to clear sticky hover
	@media (hover: hover) {
		&:hover {
			background-color: var(--background--hover);
		}
	}

	&.disabled {
		pointer-events: none;
		opacity: var(--opacity--disabled, 0.5);
	}
}

.threadLink {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex: 1;
	min-width: 0;
	height: 100%;
	padding: 0 var(--spacing--xs);
	color: var(--text-color) !important;
	text-decoration: none !important;
	outline: none;
	cursor: pointer;

	&:hover,
	&:focus,
	&:visited {
		color: var(--text-color) !important;
		text-decoration: none !important;
	}

	&:active {
		color: var(--text-color) !important;
		text-decoration: none !important;
	}
}

.threadLinkButton {
	width: 100%;
	background: none;
	border: none;
	font: inherit;
	text-align: left;
}

.threadTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--text-color);
}

.actionDropdown {
	opacity: 0;
	flex-shrink: 0;
	width: 0;
	overflow: hidden;

	.threadItem:has([aria-expanded='true']) &,
	.threadItem:has(:focus) &,
	.threadItem:hover & {
		width: auto;
		opacity: 1;
	}
}

.actionTrigger {
	box-shadow: none !important;
	outline: none !important;
}

.renameContainer {
	flex: 1;
	padding: var(--spacing--4xs) var(--spacing--xs);
}

.renameInput {
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--text-color);
	background: var(--background--surface);
	border: var(--border);
	border-color: var(--border-color--strong);
	border-radius: var(--radius);
	outline: none;

	&:focus {
		border-color: var(--border-color--strong);
	}
}

.status {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
}

.sentinel {
	height: 1px;
}

.empty {
	padding: var(--spacing--lg) var(--spacing--xs);
	text-align: center;
}
</style>
