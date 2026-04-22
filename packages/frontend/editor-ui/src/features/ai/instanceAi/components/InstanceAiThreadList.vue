<script lang="ts" setup>
import { getRelativeDate } from '@/features/ai/chatHub/chat.utils';
import {
	N8nActionDropdown,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nScrollArea,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';

const store = useInstanceAiStore();
const i18n = useI18n();
const router = useRouter();

const editingThreadId = ref<string | null>(null);
const editingTitle = ref('');

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

const groupedThreads = computed(() => {
	const now = new Date();
	const groups = new Map<string, typeof store.threads>();

	for (const thread of store.threads) {
		const group = getRelativeDate(now, thread.createdAt);
		if (!groups.has(group)) {
			groups.set(group, []);
		}
		groups.get(group)!.push(thread);
	}

	return groupOrder.flatMap((groupName) => {
		const threads = groups.get(groupName) ?? [];
		return threads.length > 0 ? [{ label: dateGroupI18nMap[groupName] ?? groupName, threads }] : [];
	});
});

function handleNewThread() {
	if (!store.hasMessages) return;
	store.newThread();
	void router.push({ name: INSTANCE_AI_VIEW });
}

async function handleDeleteThread(threadId: string) {
	const { wasActive } = await store.deleteThread(threadId);
	if (wasActive) {
		if (store.threads.length > 0) {
			void router.push({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: store.currentThreadId },
			});
		} else {
			void router.push({ name: INSTANCE_AI_VIEW });
		}
	}
}

function startRename(threadId: string, currentTitle: string) {
	editingThreadId.value = threadId;
	editingTitle.value = currentTitle;
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
		<!-- New chat button -->
		<button
			:class="$style.newChatButton"
			data-test-id="instance-ai-new-thread-button"
			@click="handleNewThread"
		>
			<div :class="$style.newChatIcon">
				<N8nIcon icon="plus" size="medium" />
			</div>
			{{ i18n.baseText('instanceAi.thread.new') }}
		</button>

		<!-- Thread list -->
		<N8nScrollArea :class="$style.threadList">
			<template v-if="groupedThreads.length > 0">
				<div v-for="group in groupedThreads" :key="group.label" :class="$style.group">
					<N8nText :class="$style.groupLabel" tag="div" size="small" color="text-light">
						{{ group.label }}
					</N8nText>
					<div
						v-for="thread in group.threads"
						:key="thread.id"
						:class="[$style.threadItem, { [$style.active]: thread.id === store.currentThreadId }]"
						data-test-id="instance-ai-thread-item"
					>
						<!-- Inline rename mode -->
						<div v-if="editingThreadId === thread.id" :class="$style.renameContainer">
							<input
								v-model="editingTitle"
								:class="$style.renameInput"
								type="text"
								autofocus
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
								@dblclick.prevent="startRename(thread.id, thread.title)"
							>
								<span :class="$style.threadTitle">{{ thread.title }}</span>
							</RouterLink>
							<N8nActionDropdown
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
									/>
								</template>
							</N8nActionDropdown>
						</template>
					</div>
				</div>
			</template>
			<div v-else :class="$style.empty">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.sidebar.noThreads') }}
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
}

.newChatButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	width: 100%;

	&:hover {
		background: var(--color--background--light-1);
	}
}

.newChatIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: var(--color--primary);
	color: white;
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
	height: 32px;
	border-radius: var(--radius);
	transition: background-color 0.1s ease;

	&:hover,
	&:focus-within,
	&:has([aria-expanded='true']) {
		background-color: var(--color--background--light-1);
	}

	&.active {
		background-color: var(--color--background--light-1);
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
	color: var(--color--text) !important;
	text-decoration: none !important;
	outline: none;
	cursor: pointer;

	&:hover,
	&:focus,
	&:visited {
		color: var(--color--text) !important;
		text-decoration: none !important;
	}

	&:active {
		color: var(--color--text--shade-1) !important;
		text-decoration: none !important;
	}
}

.threadLinkActive {
	// Active background handled by .threadItem.active
}

.threadIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.threadTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--shade-1);
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
	color: var(--color--text);
	background: var(--color--background--light-2);
	border: var(--border);
	border-color: var(--color--primary);
	border-radius: var(--radius);
	outline: none;

	&:focus {
		border-color: var(--color--primary);
	}
}

.empty {
	padding: var(--spacing--lg) var(--spacing--xs);
	text-align: center;
}
</style>
