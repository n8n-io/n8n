<script lang="ts" setup>
import { getRelativeDate } from '@/features/ai/chatHub/chat.utils';
import {
	N8nActionDropdown,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nScrollArea,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	ComboboxContent,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxRoot,
} from 'reka-ui';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_THREADS_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { clearPendingThreadHandoff } from '../composables/useInstanceAiHandoff';

const props = withDefaults(
	defineProps<{
		maxHeight?: string;
		maxThreads?: number;
		showActions?: boolean;
		showHeader?: boolean;
		showSearch?: boolean;
	}>(),
	{
		maxHeight: undefined,
		maxThreads: undefined,
		showActions: true,
		showHeader: true,
		showSearch: true,
	},
);

const emit = defineEmits<{
	close: [];
	select: [threadId: string];
}>();

const store = useInstanceAiStore();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();

const editingThreadId = ref<string | null>(null);
const editingTitle = ref('');
const searchQuery = ref('');
const renameInput = ref<HTMLInputElement | null>(null);
const threadListRef = ref<InstanceType<typeof N8nScrollArea>>();
const comboboxRef = ref<{
	highlightFirstItem?: () => void;
}>();
const hasOverflowBelow = ref(false);
let resizeObserver: ResizeObserver | null = null;
const activeThreadId = computed(() =>
	typeof route.params.threadId === 'string' ? route.params.threadId : undefined,
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

const visibleThreads = computed(() => {
	const query = searchQuery.value.trim().toLocaleLowerCase();
	const matches = query
		? store.threads.filter((thread) => thread.title.toLocaleLowerCase().includes(query))
		: store.threads;

	return props.maxThreads === undefined ? matches : matches.slice(0, props.maxThreads);
});

const groupedThreads = computed(() => {
	const now = new Date();
	const groups = new Map<string, typeof store.threads>();

	// Group by last activity, not creation date — a thread created weeks ago
	// but messaged today belongs under "Today", matching the backend ordering
	// (memory.service returns threads sorted by updatedAt desc) and the
	// chatHub sidebar's `groupConversationsByDate` behaviour.
	for (const thread of visibleThreads.value) {
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

function updateOverflowCue() {
	const position = threadListRef.value?.getScrollPosition();
	const element = threadListRef.value?.$el;
	if (!position || !(element instanceof HTMLElement)) {
		hasOverflowBelow.value = false;
		return;
	}

	hasOverflowBelow.value = position.top + element.clientHeight < position.height - 1;
}

watch(
	visibleThreads,
	async () => {
		await nextTick();
		updateOverflowCue();
		comboboxRef.value?.highlightFirstItem?.();
	},
	{ flush: 'post' },
);

onMounted(() => {
	void nextTick(() => {
		updateOverflowCue();
		const element = threadListRef.value?.$el;
		if (element instanceof HTMLElement) {
			resizeObserver = new ResizeObserver(updateOverflowCue);
			resizeObserver.observe(element);
		}
	});
});

onBeforeUnmount(() => resizeObserver?.disconnect());

async function handleDeleteThread(threadId: string) {
	const wasActive = threadId === activeThreadId.value;
	const deleted = await store.deleteThread(threadId);
	if (!deleted) return;
	clearPendingThreadHandoff(threadId);

	if (wasActive) {
		if (store.threads.length > 0) {
			void router.push({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: store.threads[0].id },
			});
		} else {
			void router.push({ name: INSTANCE_AI_VIEW });
		}
	}
}

function handleThreadSelect(threadId: string) {
	emit('select', threadId);
}

function openAllThreads() {
	emit('close');
	void router.push({ name: INSTANCE_AI_THREADS_VIEW });
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
	const title = editingTitle.value.trim();
	try {
		if (title && title !== store.threads.find((t) => t.id === threadId)?.title) {
			await store.renameThread(threadId, title);
		}
	} finally {
		editingThreadId.value = null;
	}
}

function cancelRename() {
	editingThreadId.value = null;
}

function handleThreadAction(action: string, threadId: string) {
	if (action === 'delete') {
		void handleDeleteThread(threadId);
	} else if (action === 'rename') {
		const thread = store.threads.find((t) => t.id === threadId);
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
			<div v-if="props.showHeader" :class="$style.header">
				<N8nText :class="$style.title" tag="div" size="medium" bold>
					{{ i18n.baseText('instanceAi.sidebar.chatHistory') }}
				</N8nText>
				<N8nButton
					variant="ghost"
					size="xsmall"
					:class="$style.viewAll"
					data-test-id="instance-ai-view-all-threads"
					@click="openAllThreads"
				>
					{{ i18n.baseText('instanceAi.threads.viewAll') }}
				</N8nButton>
			</div>
			<form v-if="props.showSearch" :class="$style.search" role="search" @submit.prevent>
				<div :class="$style.searchControl">
					<N8nIcon icon="search" size="small" :class="$style.searchIcon" />
					<ComboboxInput
						v-model="searchQuery"
						:class="$style.searchInput"
						:auto-focus="true"
						autocomplete="off"
						spellcheck="false"
						:placeholder="i18n.baseText('instanceAi.threads.searchPlaceholder')"
						data-test-id="instance-ai-thread-search"
					/>
					<button
						v-if="searchQuery"
						type="button"
						:class="$style.clearSearch"
						:aria-label="i18n.baseText('generic.list.clearSelection')"
						@mousedown.prevent
						@click="searchQuery = ''"
					>
						<N8nIcon icon="x" size="small" />
					</button>
				</div>
			</form>

			<ComboboxContent force-mount :class="$style.comboboxContent">
				<N8nScrollArea
					ref="threadListRef"
					:class="[$style.threadList, { [$style.hasOverflowBelow]: hasOverflowBelow }]"
					:max-height="props.maxHeight"
					type="auto"
					@scroll-capture="updateOverflowCue"
				>
					<template v-if="groupedThreads.length > 0">
						<ComboboxGroup v-for="group in groupedThreads" :key="group.label" :class="$style.group">
							<ComboboxLabel :class="$style.groupLabel">
								<N8nText tag="span" size="small" color="text-light">
									{{ group.label }}
								</N8nText>
							</ComboboxLabel>
							<div
								v-for="thread in group.threads"
								:key="thread.id"
								:class="$style.threadItem"
								data-test-id="instance-ai-thread-item"
							>
								<!-- Inline rename mode -->
								<div v-if="editingThreadId === thread.id" :class="$style.renameContainer">
									<input
										ref="renameInput"
										v-model="editingTitle"
										:class="$style.renameInput"
										type="text"
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
									</ComboboxItem>
									<N8nActionDropdown
										v-if="props.showActions"
										:items="threadActions"
										:class="$style.actionDropdown"
										placement="bottom-start"
										@select="handleThreadAction($event, thread.id)"
										@click.stop
									>
										<template #activator>
											<N8nIconButton
												variant="ghost"
												icon="ellipsis-vertical"
												:class="$style.actionTrigger"
												:aria-label="i18n.baseText('instanceAi.threads.actions')"
											/>
										</template>
									</N8nActionDropdown>
								</template>
							</div>
						</ComboboxGroup>
					</template>
					<div v-else :class="$style.empty" role="status">
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText(
									searchQuery
										? 'instanceAi.threads.noSearchResults'
										: 'instanceAi.sidebar.noThreads',
								)
							}}
						</N8nText>
					</div>
				</N8nScrollArea>
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
	padding: var(--spacing--2xs) var(--spacing--3xs) var(--spacing--2xs) var(--spacing--sm);
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

	font-weight: var(--font-weight--regular);
}

.search {
	padding: 0 var(--spacing--sm) var(--spacing--2xs);
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
	right: var(--input--padding);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	color: var(--color--text--tint-1);
	background: transparent;
	border: none;
	border-radius: var(--radius--sm);
	cursor: pointer;

	&:hover {
		color: var(--color--text--shade-1);
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
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
	padding: var(--spacing--2xs) var(--spacing--2xs) 0;

	&.hasOverflowBelow::after {
		content: '';
		position: absolute;
		inset: auto 0 0;
		height: var(--spacing--lg);
		background: linear-gradient(to bottom, transparent, var(--background--surface));
		pointer-events: none;
	}
}

.group {
	&:last-child {
		padding-bottom: var(--spacing--2xs);
	}

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

.threadIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
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

.empty {
	padding: var(--spacing--lg) var(--spacing--xs);
	text-align: center;
}
</style>
