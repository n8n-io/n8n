<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	N8nActionDropdown,
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nText,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { formatTimeAgo } from '@/app/utils/formatters/dateFormatter';
import { useAgentsN8nChatFlag } from '@/features/agents/composables/useAgentsN8nChatFlag';
import RecentChatIcon from '@/features/agents/n8nChatPage/components/RecentChatIcon.vue';
import { useMergedChatHistory } from '@/features/agents/n8nChatPage/useMergedChatHistory';
import {
	chatItemRoute,
	chatItemTitle,
	type RecentChatItem,
} from '@/features/agents/n8nChatPage/mergeRecentChats';
import { clearPendingThreadHandoff } from './composables/useInstanceAiHandoff';
import { INSTANCE_AI_VIEW } from './constants';
import { useInstanceAiStore } from './instanceAi.store';

const store = useInstanceAiStore();
const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const isAgentsN8nChatFlag = useAgentsN8nChatFlag();

useDocumentTitle().set(i18n.baseText('instanceAi.sidebar.chatHistory'));

const {
	items: mergedThreads,
	hasMore,
	history,
	isLoading,
	error,
	search,
	listRef,
	sentinelRef,
	loadMore,
} = useMergedChatHistory();
const editingThreadId = ref<string | null>(null);
const editingTitle = ref('');
const renameInput = ref<HTMLInputElement | null>(null);

const threadActions: Array<ActionDropdownItem<'rename' | 'delete'>> = [
	{ id: 'rename', label: i18n.baseText('instanceAi.sidebar.renameThread'), icon: 'pencil' },
	{ id: 'delete', label: i18n.baseText('instanceAi.sidebar.deleteThread'), icon: 'trash-2' },
];

function itemTitle(item: RecentChatItem): string {
	return chatItemTitle(item, i18n);
}

const itemRoute = chatItemRoute;

function startRename(thread: InstanceAiThreadSummary) {
	editingThreadId.value = thread.id;
	editingTitle.value = thread.title;
	// Focus once here: a function ref runs on every render and re-selects the text on each key.
	void nextTick(() => {
		renameInput.value?.focus();
		renameInput.value?.select();
	});
}

function setRenameInput(element: unknown) {
	renameInput.value = element instanceof HTMLInputElement ? element : null;
}

async function confirmRename(thread: InstanceAiThreadSummary) {
	// Enter removes the input, which can also fire blur. Rename once.
	if (editingThreadId.value !== thread.id) return;
	editingThreadId.value = null;
	const title = editingTitle.value.trim();
	if (!title || title === thread.title) return;
	try {
		await store.renameThread(thread.id, title);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('instanceAi.threads.renameSuccess'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.threads.renameError'));
	}
}

async function handleThreadAction(action: string, thread: InstanceAiThreadSummary) {
	if (action === 'rename') startRename(thread);
	if (action === 'delete' && (await store.deleteThread(thread.id))) {
		clearPendingThreadHandoff(thread.id);
	}
}
</script>

<template>
	<PageViewLayout full-width data-test-id="instance-ai-threads-view">
		<div :class="$style.page">
			<div :class="$style.header">
				<N8nIconButton
					icon="arrow-left"
					variant="ghost"
					:aria-label="i18n.baseText('instanceAi.threads.backToAssistant')"
					@click="router.push({ name: INSTANCE_AI_VIEW })"
				/>
				<N8nHeading :class="$style.heading" tag="h1" size="xlarge" bold>
					{{ i18n.baseText('instanceAi.sidebar.chatHistory') }}
				</N8nHeading>
				<N8nInput
					v-model="search"
					:class="$style.search"
					size="small"
					clearable
					:maxlength="500"
					:placeholder="i18n.baseText('instanceAi.threads.searchPlaceholder')"
					data-test-id="instance-ai-threads-search"
				>
					<template #prefix>
						<N8nIcon icon="search" size="small" />
					</template>
				</N8nInput>
				<N8nButton size="small" icon="plus" @click="router.push({ name: INSTANCE_AI_VIEW })">
					{{ i18n.baseText('instanceAi.thread.new') }}
				</N8nButton>
			</div>

			<div ref="listRef" :class="$style.list">
				<div
					v-for="item in mergedThreads"
					:key="item.thread.id"
					:class="$style.row"
					data-test-id="instance-ai-history-thread"
				>
					<input
						v-if="item.kind === 'assistant' && editingThreadId === item.thread.id"
						:ref="setRenameInput"
						v-model="editingTitle"
						:class="$style.renameInput"
						type="text"
						maxlength="255"
						@keydown.enter="confirmRename(item.thread)"
						@keydown.escape="editingThreadId = null"
						@blur="confirmRename(item.thread)"
					/>
					<template v-else>
						<RouterLink
							:to="itemRoute(item)"
							:class="$style.link"
							:title="itemTitle(item)"
							@dblclick.prevent="item.kind === 'assistant' && startRename(item.thread)"
						>
							<template v-if="isAgentsN8nChatFlag">
								<RecentChatIcon :class="$style.icon" :item="item" :size="20" />
							</template>
							<N8nIcon v-else :class="$style.icon" icon="message-circle" size="medium" />
							<N8nText :class="$style.title" size="medium">{{ itemTitle(item) }}</N8nText>
						</RouterLink>
						<N8nText size="small" color="text-light">{{
							formatTimeAgo(item.thread.updatedAt)
						}}</N8nText>
						<N8nActionDropdown
							v-if="item.kind === 'assistant'"
							:items="threadActions"
							:class="$style.actions"
							placement="bottom-end"
							@select="handleThreadAction($event, item.thread)"
						>
							<template #activator>
								<N8nIconButton
									variant="ghost"
									icon="ellipsis-vertical"
									:aria-label="i18n.baseText('instanceAi.threads.actions')"
								/>
							</template>
						</N8nActionDropdown>
					</template>
				</div>

				<div v-if="isLoading" :class="$style.status" role="status">
					<N8nText color="text-light">{{ i18n.baseText('instanceAi.threads.loading') }}</N8nText>
				</div>
				<div v-else-if="error" :class="$style.status" role="alert">
					<N8nText>{{ i18n.baseText('instanceAi.threads.loadError') }}</N8nText>
					<N8nButton
						variant="outline"
						size="small"
						data-test-id="instance-ai-threads-retry"
						@click="loadMore"
					>
						{{ i18n.baseText('generic.retry') }}
					</N8nButton>
				</div>
				<div v-else-if="hasMore" ref="sentinelRef" :class="$style.sentinel" />
				<div v-else-if="mergedThreads.length === 0" :class="$style.status">
					<N8nText color="text-light">
						{{
							i18n.baseText(
								history.search
									? 'instanceAi.threads.noSearchResults'
									: 'instanceAi.sidebar.noThreads',
							)
						}}
					</N8nText>
				</div>
			</div>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	width: 100%;
	max-width: var(--content-container--width);
	margin: 0 auto;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-bottom: var(--spacing--sm);
}

.heading {
	flex: 1;
	min-width: 0;
}

.search {
	width: 240px;
}

.list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);

	&:hover,
	&:focus-within,
	&:has([aria-expanded='true']) {
		background-color: var(--color--background--light-1);

		.actions {
			opacity: 1;
		}
	}
}

.link {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
	color: var(--color--text) !important;
	text-decoration: none !important;
}

.icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	flex-shrink: 0;
	opacity: 0;

	// Touch devices have no hover: keep the menu button visible.
	@media (hover: none) {
		opacity: 1;
	}
}

.renameInput {
	flex: 1;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
	background: var(--color--background--light-2);
	border: var(--border);
	border-color: var(--color--primary);
	border-radius: var(--radius);
	outline: none;
}

.status {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
}

.sentinel {
	height: 1px;
}
</style>
