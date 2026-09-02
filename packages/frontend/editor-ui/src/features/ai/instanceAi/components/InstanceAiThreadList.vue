<script lang="ts" setup>
import { getRelativeDate } from '@/features/ai/chatHub/chat.utils';
import {
	N8nActionDropdown,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nText,
	N8nScrollArea,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref } from 'vue';
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
			<N8nInput
				v-model="searchQuery"
				type="text"
				size="small"
				autofocus
				clearable
				autocomplete="off"
				:placeholder="i18n.baseText('instanceAi.threads.searchPlaceholder')"
				data-test-id="instance-ai-thread-search"
			>
				<template #prefix>
					<N8nIcon icon="search" size="small" />
				</template>
			</N8nInput>
		</form>

		<N8nScrollArea
			:class="$style.threadList"
			:max-height="props.maxHeight"
			:enable-vertical-scroll="false"
		>
			<template v-if="groupedThreads.length > 0">
				<div v-for="group in groupedThreads" :key="group.label" :class="$style.group">
					<N8nText :class="$style.groupLabel" tag="div" size="small" color="text-light">
						{{ group.label }}
					</N8nText>
					<div
						v-for="thread in group.threads"
						:key="thread.id"
						:class="[$style.threadItem, { [$style.active]: thread.id === activeThreadId }]"
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
							<RouterLink
								:to="{ name: INSTANCE_AI_THREAD_VIEW, params: { threadId: thread.id } }"
								:class="$style.threadLink"
								:title="thread.title"
								:active-class="$style.threadLinkActive"
								@click="handleThreadSelect(thread.id)"
								@dblclick.prevent="startRename(thread.id, thread.title)"
							>
								<span :class="$style.threadTitle">{{ thread.title }}</span>
							</RouterLink>
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
				</div>
			</template>
			<div v-else :class="$style.empty">
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText(
							searchQuery ? 'instanceAi.threads.noSearchResults' : 'instanceAi.sidebar.noThreads',
						)
					}}
				</N8nText>
			</div>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
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

.threadList {
	flex: 1;
	min-height: 0;
	padding: var(--spacing--2xs);
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
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.threadItem {
	display: flex;
	align-items: center;
	height: var(--height--md);
	border-radius: var(--radius);

	&:focus-within,
	&:has([aria-expanded='true']) {
		background-color: var(--background--hover);
	}

	// Gate hover to hover-capable devices so touch doesn't need a first tap to clear sticky hover
	@media (hover: hover) {
		&:hover {
			background-color: var(--background--hover);
		}
	}

	&.active {
		background-color: var(--background--hover);
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

.threadLinkActive {
	// Active background handled by .threadItem.active
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
	.threadItem:hover &,
	.active & {
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
