<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { refDebounced } from '@vueuse/core';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';
import type { ChatHistoryItem } from '@/features/ai/shared/components/ChatHistoryDropdown.vue';
import ChatHistoryDropdown from '@/features/ai/shared/components/ChatHistoryDropdown.vue';
import ChatHistoryDropdownTrigger from '@/features/ai/shared/components/ChatHistoryDropdownTrigger.vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';

import { usePagedN8nChatThreads } from '../usePagedN8nChatThreads';
import { useAgentN8nChatThreadsStore } from '../n8nChatThreads.store';
import { agentThreadActions } from '../mergeRecentChats';
import { AGENT_N8N_CHAT_HISTORY_PAGE_SIZE, AGENT_N8N_CHAT_VIEW } from '../../constants';

const props = defineProps<{
	agentId: string;
	/** The open thread's title, shown on the trigger instead of "Chat history". */
	title?: string;
}>();

const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const threadsStore = useAgentN8nChatThreadsStore();

const NEW_CHAT_ITEM_ID = '__new-chat__';

const open = ref(false);

const currentThreadId = computed(() =>
	typeof route.params.agentThreadId === 'string' ? route.params.agentThreadId : undefined,
);

const threadActions = agentThreadActions(i18n);

// Debounced like the Assistant's own thread-history search, so typing doesn't fire a
// request per keystroke.
const search = ref('');
const debouncedSearch = refDebounced(search, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

const paged = usePagedN8nChatThreads({
	agentId: () => props.agentId,
	search: () => debouncedSearch.value.trim() || undefined,
	pageSize: AGENT_N8N_CHAT_HISTORY_PAGE_SIZE,
});

async function handleDeleteThread(thread: AgentN8nChatThreadSummary): Promise<void> {
	if (!(await threadsStore.deleteThread(thread))) return;
	// Mirrors the Assistant: deleting the open thread lands on a new chat for the same agent.
	// Read the route after the await: the user may have moved to another thread meanwhile.
	if (thread.id !== currentThreadId.value) return;
	void router.push({ name: AGENT_N8N_CHAT_VIEW, params: { agentId: props.agentId } });
}

function handleAction(action: string, itemId: string): void {
	if (action !== 'delete') return;
	const thread = paged.items.value.find((t) => t.id === itemId);
	if (thread) void handleDeleteThread(thread);
}

function handleOpenChange(isOpen: boolean): void {
	open.value = isOpen;
	// Reopening keeps the shown items and refreshes the first page in the background
	// (replaced once it lands) — only a first-ever open has nothing to show meanwhile.
	if (isOpen) {
		paged.reset();
		paged.loadNext();
	}
}

function handleSelect(itemId: string): void {
	if (itemId === NEW_CHAT_ITEM_ID) {
		void router.push({ name: AGENT_N8N_CHAT_VIEW, params: { agentId: props.agentId } });
		return;
	}
	void router.push({
		name: AGENT_N8N_CHAT_VIEW,
		params: { agentId: props.agentId, agentThreadId: itemId },
	});
}

// Retry and "load more" are the same action: fetch the next page. An error never
// advances the cursor, so retrying re-requests the page that just failed.
function loadMore(): void {
	paged.loadNext();
}

const newChatItem: ChatHistoryItem = {
	id: NEW_CHAT_ITEM_ID,
	label: i18n.baseText('instanceAi.thread.new'),
	testId: 'agent-n8n-chat-history-new',
};

const items = computed<ChatHistoryItem[]>(() =>
	paged.items.value.map((thread) => ({
		id: thread.id,
		label: thread.title ?? i18n.baseText('commandBar.instanceAi.newThread'),
		checked: thread.id === currentThreadId.value,
		testId: 'agent-n8n-chat-history-item',
		data: { updatedAt: thread.updatedAt, actions: threadActions },
	})),
);

// Searched server-side (see `paged` above), so `items` is already the matching page.
function handleSearch(query: string): void {
	search.value = query;
}

// Only the first, item-less load has nothing to show while it's in flight —
// a background refresh (reopen) keeps the previous list visible instead.
const showLoadingState = computed(() => paged.isLoading.value && paged.items.value.length === 0);
// On error the footer below carries the one message and its retry button —
// the body stays blank instead of repeating it.
const emptyText = computed(() =>
	paged.error.value ? '' : i18n.baseText('instanceAi.sidebar.noThreads'),
);
const showRetry = computed(() => paged.error.value);
const showLoadMore = computed(
	() =>
		!paged.error.value &&
		paged.hasMore.value &&
		!paged.isLoading.value &&
		paged.items.value.length > 0,
);
</script>

<template>
	<ChatHistoryDropdown
		:model-value="open"
		:items="items"
		:leading-item="newChatItem"
		:loading="showLoadingState"
		:empty-text="emptyText"
		:search-placeholder="i18n.baseText('generic.search')"
		content-test-id="agent-n8n-chat-history-list"
		:action-button-label="i18n.baseText('agentSessions.actions')"
		@update:model-value="handleOpenChange"
		@search="handleSearch"
		@select="handleSelect"
		@action="handleAction"
	>
		<template #trigger>
			<ChatHistoryDropdownTrigger
				:title="props.title"
				data-test-id="agent-n8n-chat-history-toggle"
			/>
		</template>

		<template #footer>
			<div v-if="showRetry || showLoadMore" :class="$style.footer">
				<template v-if="showRetry">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.threads.loadError') }}
					</N8nText>
					<N8nButton
						variant="ghost"
						size="xsmall"
						data-test-id="agent-n8n-chat-history-retry"
						@click="loadMore"
					>
						{{ i18n.baseText('generic.retry') }}
					</N8nButton>
				</template>
				<N8nButton
					v-else
					variant="ghost"
					size="xsmall"
					data-test-id="agent-n8n-chat-history-load-more"
					@click="loadMore"
				>
					{{ i18n.baseText('agentSessions.loadMore') }}
				</N8nButton>
			</div>
		</template>
	</ChatHistoryDropdown>
</template>

<style lang="scss" module>
.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	border-top: var(--border);
	padding: var(--spacing--2xs) var(--spacing--xs);
}
</style>
