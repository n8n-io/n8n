<script lang="ts" setup>
import { N8nButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem, DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useEventListener } from '@vueuse/core';
import { computed, nextTick, ref, useId, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_THREADS_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { clearPendingThreadHandoff } from '../composables/useInstanceAiHandoff';
import { useInstanceAiThreadHistory } from '../composables/useInstanceAiThreadHistory';
import { useToast } from '@n8n/composables/useToast';
import ChatHistoryDropdown, {
	type ChatHistoryItemData,
} from '@/features/ai/shared/components/ChatHistoryDropdown.vue';

const props = withDefaults(
	defineProps<{
		maxHeight?: string;
		/** Scope the history shown — applied to `history.threads` before grouping. */
		filter?: (thread: InstanceAiThreadSummary) => boolean;
		/** False → selecting a row emits `select` without routing, "View all" is hidden,
		 * and deleting the active thread emits `deleted(true)` instead of navigating. Use this for an
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
const { history, search, sentinelRef, loadMore } = useInstanceAiThreadHistory();

const menuOpen = ref(false);
const menuContentId = useId();
const historyDropdownRef = ref<{ highlightFirstItem: () => void } | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const editingThreadId = ref<string | null>(null);
const editingTitle = ref('');
const renameInput = ref<HTMLInputElement | null>(null);
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

// Scope the server-paged history to the embedding host's subject, such as one agent.
const filteredThreads = computed(() =>
	props.filter ? history.value.threads.filter(props.filter) : history.value.threads,
);

const menuItems = computed<Array<DropdownMenuItemProps<string, ChatHistoryItemData>>>(() =>
	filteredThreads.value.map((thread) => ({
		id: thread.id,
		label: thread.title,
		disabled: props.disabled,
		testId: 'instance-ai-thread-item',
		data: {
			updatedAt: thread.updatedAt ?? thread.createdAt,
			actions: threadActions,
		},
	})),
);

const lastVisibleThreadId = computed(() => filteredThreads.value.at(-1)?.id);
let restoreTriggerFocus = false;

watch(
	[() => history.value.threads.length, () => history.value.search],
	([threadCount, searchTerm], [previousThreadCount]) => {
		if (!searchTerm || previousThreadCount !== 0 || threadCount === 0) return;
		void nextTick(() => historyDropdownRef.value?.highlightFirstItem());
	},
);

function handleMenuOpenChange(open: boolean) {
	menuOpen.value = open;
	if (open) {
		restoreTriggerFocus = false;
		return;
	}
	if (!restoreTriggerFocus) return;

	restoreTriggerFocus = false;
	void nextTick(() => triggerRef.value?.querySelector('button')?.focus());
}

function closeMenu() {
	restoreTriggerFocus = true;
	handleMenuOpenChange(false);
}

useEventListener(
	document,
	'keydown',
	(event: KeyboardEvent) => {
		if (!menuOpen.value || !(event.target instanceof HTMLElement)) return;
		const menu = event.target.closest<HTMLElement>('[data-menu-content]');
		if (menu?.id !== menuContentId) return;

		if (event.target === renameInput.value && (event.key === 'Enter' || event.key === 'Escape')) {
			event.preventDefault();
			event.stopPropagation();
			const threadId = editingThreadId.value;
			if (event.key === 'Enter' && threadId) void confirmRename(threadId);
			else cancelRename();
			void nextTick(() => menu.querySelector<HTMLInputElement>('input[type="text"]')?.focus());
			return;
		}

		if (event.key === 'Escape') restoreTriggerFocus = true;
	},
	{ capture: true },
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
	closeMenu();
	emit('close');
	void router.push({ name: INSTANCE_AI_THREADS_VIEW });
}

function setRenameInput(element: unknown) {
	renameInput.value = element instanceof HTMLInputElement ? element : null;
}

function startRename(threadId: string) {
	if (props.disabled) return;
	const currentTitle = history.value.threads.find((thread) => thread.id === threadId)?.title;
	if (!currentTitle) return;
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
	if (props.disabled) return;
	restoreTriggerFocus = true;
	emit('select', threadId);
	if (props.navigate) {
		void router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
	}
}

function handleThreadAction(action: string, threadId: string) {
	if (props.disabled) return;
	if (action === 'delete') {
		void handleDeleteThread(threadId);
	} else if (action === 'rename') {
		startRename(threadId);
	}
}
</script>

<template>
	<ChatHistoryDropdown
		ref="historyDropdownRef"
		:model-value="menuOpen"
		:items="menuItems"
		:loading="history.loading && filteredThreads.length === 0"
		:max-height="props.maxHeight"
		:search-placeholder="i18n.baseText('instanceAi.threads.searchPlaceholder')"
		:action-button-label="i18n.baseText('instanceAi.threads.actions')"
		:editing-item-id="editingThreadId ?? undefined"
		:actions-disabled="disabled"
		item-double-click-enabled
		:content-id="menuContentId"
		content-test-id="instance-ai-thread-list"
		@search="search = $event"
		@select="handleThreadSelect"
		@action="handleThreadAction"
		@item-dblclick="startRename"
		@update:model-value="handleMenuOpenChange"
	>
		<template v-if="$slots.trigger" #trigger>
			<span ref="triggerRef"><slot name="trigger" /></span>
		</template>

		<template #loading>
			<div :class="$style.status" role="status">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.threads.loading') }}
				</N8nText>
			</div>
		</template>

		<template #empty>
			<div
				:class="$style.empty"
				:role="history.error ? 'alert' : 'status'"
				data-test-id="instance-ai-thread-list-empty"
			>
				<template v-if="history.error">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.threads.loadError') }}
					</N8nText>
					<N8nButton variant="ghost" size="xsmall" @click="loadMore">
						{{ i18n.baseText('generic.retry') }}
					</N8nButton>
				</template>
				<div
					v-else-if="history.hasMore && !history.loading && !history.error"
					ref="sentinelRef"
					:class="$style.sentinel"
					data-test-id="instance-ai-thread-sentinel"
				/>
				<N8nText v-else size="small" color="text-light">
					{{
						i18n.baseText(
							history.search
								? 'instanceAi.threads.noSearchResults'
								: 'instanceAi.sidebar.noThreads',
						)
					}}
				</N8nText>
			</div>
		</template>

		<template #item-edit="{ item, ui }">
			<div :class="[$style.renameContainer, ui.class]" @pointerdown.stop @click.stop>
				<input
					:ref="setRenameInput"
					v-model="editingTitle"
					:class="$style.renameInput"
					type="text"
					maxlength="255"
					:aria-label="i18n.baseText('instanceAi.threads.rename')"
					@blur="confirmRename(item.id)"
				/>
			</div>
		</template>

		<template #item-trailing="{ item }">
			<div
				v-if="
					item.id === lastVisibleThreadId && history.hasMore && !history.loading && !history.error
				"
				ref="sentinelRef"
				:class="$style.sentinel"
				data-test-id="instance-ai-thread-sentinel"
			/>
		</template>

		<template #footer>
			<div
				v-if="filteredThreads.length > 0 && (history.loading || history.error || navigate)"
				:class="$style.footer"
			>
				<div
					v-if="filteredThreads.length > 0 && history.loading"
					:class="$style.status"
					role="status"
				>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.threads.loading') }}
					</N8nText>
				</div>
				<div
					v-else-if="filteredThreads.length > 0 && history.error"
					:class="$style.status"
					role="alert"
				>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.threads.loadError') }}
					</N8nText>
					<N8nButton variant="ghost" size="xsmall" @click="loadMore">
						{{ i18n.baseText('generic.retry') }}
					</N8nButton>
				</div>
				<N8nButton
					v-if="navigate"
					variant="ghost"
					icon="list"
					data-test-id="instance-ai-view-all-threads"
					:class="$style.viewAll"
					@click="openAllThreads"
				>
					{{ i18n.baseText('instanceAi.threads.viewAll') }}
				</N8nButton>
			</div>
		</template>
	</ChatHistoryDropdown>
</template>

<style lang="scss" module>
.renameContainer {
	flex: 1;
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
}

.status,
.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
}

.empty {
	flex-direction: column;
	text-align: center;
}

.sentinel {
	height: var(--spacing--5xs);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	border-top: var(--border);
	padding: var(--spacing--4xs);
}

.footer .status {
	flex: 1;
}

.viewAll {
	flex: 1;
	width: 100%;
	justify-content: flex-start;
}
</style>
