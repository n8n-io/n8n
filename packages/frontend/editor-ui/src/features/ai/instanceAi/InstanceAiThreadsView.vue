<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';
import { useRouter } from 'vue-router';
import {
	N8nButton,
	N8nActionDropdown,
	N8nDialog,
	N8nDialogFooter,
	N8nIconButton,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nScrollArea,
	N8nText,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { formatTimeAgo } from '@/app/utils/formatters/dateFormatter';
import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from './constants';
import { useInstanceAiStore } from './instanceAi.store';
import { clearPendingThreadHandoff } from './composables/useInstanceAiHandoff';

const store = useInstanceAiStore();
const i18n = useI18n();
const router = useRouter();

const searchQuery = ref('');
const threadIds = ref<string[]>([]);
const loading = ref(false);
const loadError = ref(false);
const hasMore = ref(true);
const loadMoreRef = ref<HTMLElement>();
const scrollArea = ref<InstanceType<typeof N8nScrollArea>>();
let nextPage = 0;
let requestVersion = 0;
const searchPending = ref(false);

async function loadMore() {
	if (loading.value || !hasMore.value || searchPending.value) return;
	const version = requestVersion;
	loading.value = true;
	loadError.value = false;
	try {
		const result = await store.loadThreadPage(
			{
				page: nextPage,
				limit: 30,
				search: searchQuery.value.trim(),
			},
			() => version === requestVersion,
		);
		if (version !== requestVersion) return;
		threadIds.value = [
			...new Set([...threadIds.value, ...result.threads.map((thread) => thread.id)]),
		];
		nextPage = result.page + 1;
		hasMore.value = result.hasMore;
	} catch {
		if (version === requestVersion) loadError.value = true;
	} finally {
		if (version === requestVersion) loading.value = false;
	}
}

function resetHistory() {
	requestVersion++;
	nextPage = 0;
	threadIds.value = [];
	loading.value = false;
	loadError.value = false;
	hasMore.value = true;
	void nextTick(() => scrollArea.value?.scrollToTop());
}

watch(
	searchQuery,
	(_query, _previous, onCleanup) => {
		resetHistory();
		searchPending.value = true;
		const timeout = setTimeout(() => {
			searchPending.value = false;
			void loadMore();
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		onCleanup(() => clearTimeout(timeout));
	},
	{ flush: 'sync' },
);

useIntersectionObserver(loadMoreRef, ([entry]) => {
	if (entry?.isIntersecting && !loadError.value) void loadMore();
});

function onScroll(event: Event) {
	const viewport = event.target;
	if (
		viewport instanceof HTMLElement &&
		!loadError.value &&
		viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < viewport.clientHeight / 2
	) {
		void loadMore();
	}
}

onMounted(() => {
	void loadMore();
});
onBeforeUnmount(() => {
	requestVersion++;
});
const renameOpen = ref(false);
const renamingThreadId = ref<string>();
const renameTitle = ref('');
const saving = ref(false);
const renameError = ref(false);
function selectRenameTitle(event: FocusEvent) {
	if (event.target instanceof HTMLInputElement) event.target.select();
}
const threadActions: Array<ActionDropdownItem<'rename' | 'delete'>> = [
	{ id: 'rename', label: i18n.baseText('instanceAi.sidebar.renameThread'), icon: 'pencil' },
	{ id: 'delete', label: i18n.baseText('instanceAi.sidebar.deleteThread'), icon: 'trash-2' },
];

async function handleThreadAction(action: string, threadId: string) {
	if (action === 'delete') {
		if (await store.deleteThread(threadId)) {
			clearPendingThreadHandoff(threadId);
			resetHistory();
			void loadMore();
		}
	} else if (action === 'rename') {
		const thread = store.threads.find((item) => item.id === threadId);
		if (!thread) return;
		renamingThreadId.value = threadId;
		renameTitle.value = thread.title;
		renameError.value = false;
		renameOpen.value = true;
	}
}

async function saveRename() {
	const title = renameTitle.value.trim();
	if (!title || !renamingThreadId.value || saving.value) return;
	const thread = store.threads.find((item) => item.id === renamingThreadId.value);
	if (!thread) return;
	const previousTitle = thread.title;
	saving.value = true;
	renameError.value = false;
	try {
		await store.renameThread(thread.id, title);
		renameOpen.value = false;
		if (searchQuery.value.trim()) {
			resetHistory();
			void loadMore();
		}
	} catch {
		thread.title = previousTitle;
		renameError.value = true;
	} finally {
		saving.value = false;
	}
}

useDocumentTitle().set(i18n.baseText('instanceAi.sidebar.chatHistory'));

const filteredThreads = computed(() => {
	const loadedIds = new Set(threadIds.value);
	return store.threads.filter((thread) => loadedIds.has(thread.id));
});

function openThread(threadId: string) {
	void router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
}
</script>

<template>
	<PageViewLayout full-width data-test-id="instance-ai-threads-view">
		<div :class="$style.content">
			<header :class="$style.pageHeader">
				<div :class="$style.titleGroup">
					<N8nButton
						variant="ghost"
						size="medium"
						icon-only
						:aria-label="i18n.baseText('instanceAi.threads.backToAssistant')"
						@click="router.push({ name: INSTANCE_AI_VIEW })"
					>
						<template #icon>
							<N8nIcon icon="arrow-left" size="medium" :stroke-width="2.5" />
						</template>
					</N8nButton>
					<N8nHeading tag="h1" size="xlarge" bold>
						{{ i18n.baseText('instanceAi.sidebar.chatHistory') }}
					</N8nHeading>
				</div>
				<div :class="$style.pageActions">
					<form :class="$style.search" role="search" @submit.prevent>
						<N8nInput
							v-model="searchQuery"
							type="text"
							size="small"
							clearable
							autocomplete="off"
							:placeholder="i18n.baseText('instanceAi.threads.searchPlaceholder')"
							data-test-id="instance-ai-threads-search"
						>
							<template #prefix>
								<N8nIcon icon="search" size="small" />
							</template>
						</N8nInput>
					</form>
					<N8nButton
						variant="solid"
						size="small"
						icon="plus"
						@click="router.push({ name: INSTANCE_AI_VIEW })"
					>
						{{ i18n.baseText('instanceAi.thread.new') }}
					</N8nButton>
				</div>
			</header>

			<N8nScrollArea ref="scrollArea" :class="$style.threadList" @scroll-capture="onScroll">
				<div v-if="filteredThreads.length > 0" :class="$style.rows">
					<div
						v-for="thread in filteredThreads"
						:key="thread.id"
						:class="$style.threadRow"
						data-test-id="instance-ai-history-thread"
					>
						<button type="button" :class="$style.threadButton" @click="openThread(thread.id)">
							<N8nIcon icon="message-circle" size="medium" />
							<N8nText tag="span" size="medium" :class="$style.threadTitle">
								{{ thread.title }}
							</N8nText>
						</button>
						<div :class="$style.rowTrailing">
							<N8nText :class="$style.threadDate" size="medium" color="text-light">
								{{ formatTimeAgo(thread.updatedAt ?? thread.createdAt) }}
							</N8nText>
							<N8nActionDropdown
								:items="threadActions"
								:class="$style.rowActions"
								placement="bottom-end"
								@select="handleThreadAction($event, thread.id)"
							>
								<template #activator>
									<N8nIconButton
										variant="ghost"
										icon="ellipsis-vertical"
										:aria-label="i18n.baseText('instanceAi.threads.actions')"
									/>
								</template>
							</N8nActionDropdown>
						</div>
					</div>
				</div>
				<div v-else-if="!loading && !loadError && !hasMore" :class="$style.empty">
					<N8nIcon icon="messages-square" size="xlarge" />
					<N8nText>
						{{
							i18n.baseText(
								searchQuery ? 'instanceAi.threads.noSearchResults' : 'instanceAi.sidebar.noThreads',
							)
						}}
					</N8nText>
				</div>
				<div v-if="loading || searchPending" :class="$style.loadMore" role="status">
					<N8nText color="text-light">{{ i18n.baseText('instanceAi.threads.loading') }}</N8nText>
				</div>
				<div v-else-if="loadError" :class="$style.loadMore" role="alert">
					<N8nText>{{ i18n.baseText('instanceAi.threads.loadError') }}</N8nText>
					<N8nButton variant="outline" @click="loadMore">{{
						i18n.baseText('generic.retry')
					}}</N8nButton>
				</div>
				<div v-else-if="hasMore" ref="loadMoreRef" :class="$style.loadMore">
					<N8nButton variant="ghost" @click="loadMore">{{
						i18n.baseText('instanceAi.threads.loadMore')
					}}</N8nButton>
				</div>
			</N8nScrollArea>
		</div>
		<N8nDialog
			:open="renameOpen"
			size="small"
			:show-close-button="false"
			:header="i18n.baseText('instanceAi.threads.renameChat')"
			@update:open="!saving && (renameOpen = $event)"
		>
			<form :class="$style.renameForm" @submit.prevent="saveRename">
				<N8nInput
					v-model="renameTitle"
					autofocus
					:disabled="saving"
					:aria-label="i18n.baseText('instanceAi.threads.renameChat')"
					@focus="selectRenameTitle"
				/>
				<N8nText v-if="renameError" role="alert" color="danger">{{
					i18n.baseText('instanceAi.threads.renameError')
				}}</N8nText>
				<N8nDialogFooter>
					<N8nButton variant="outline" :disabled="saving" @click="renameOpen = false">{{
						i18n.baseText('generic.cancel')
					}}</N8nButton>
					<N8nButton type="submit" :loading="saving" :disabled="saving || !renameTitle.trim()">{{
						i18n.baseText('generic.save')
					}}</N8nButton>
				</N8nDialogFooter>
			</form>
		</N8nDialog>
	</PageViewLayout>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.content {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	max-width: calc(var(--content-container--width) - var(--spacing--4xl));
	margin-inline: auto;
	min-height: 0;
}

.pageHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--lg);
}

.titleGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.pageActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.search {
	width: var(--spacing--5xl);
}

.threadList {
	flex: 1;
	min-height: 0;
	margin-top: var(--spacing--sm);
}

.rows {
	border-top: var(--border);
}

.threadRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--2xl);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
}

@media (hover: hover) {
	.rows:has(.threadRow:first-child:hover) {
		border-top-color: transparent;
	}

	.threadRow:has(+ .threadRow:hover) {
		border-bottom-color: transparent;
	}

	.threadRow:hover {
		border-bottom-color: transparent;
		border-radius: var(--radius--xs);
		background: var(--background--hover);
	}
}

.threadButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	align-self: stretch;
	min-width: 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--text-color);
	cursor: pointer;
	text-align: left;

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.threadTitle {
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
}

.threadDate {
	flex-shrink: 0;
	margin-left: auto;
}

.rowTrailing {
	display: grid;
	align-items: center;
	justify-items: end;
	min-width: var(--height--md);

	> * {
		grid-area: 1 / 1;
	}
}

.rowActions {
	opacity: 0;
	pointer-events: none;
}

.threadRow:focus-within,
.threadRow:has([aria-expanded='true']) {
	.rowActions {
		opacity: 1;
		pointer-events: auto;
	}
	.threadDate {
		visibility: hidden;
	}
}

@media (hover: hover) {
	.threadRow:hover {
		.rowActions {
			opacity: 1;
			pointer-events: auto;
		}
		.threadDate {
			visibility: hidden;
		}
	}
}

@media (hover: none) {
	.rowActions {
		opacity: 1;
		pointer-events: auto;
	}
	.threadDate {
		visibility: hidden;
	}
}

.renameForm {
	margin-top: var(--spacing--md);
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xl);
	color: var(--text-color--subtle);
}

.loadMore {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
}

@media (max-width: 48rem) {
	.pageHeader {
		align-items: flex-start;
		flex-direction: column;
	}

	.pageActions,
	.search {
		width: 100%;
	}
}
</style>
