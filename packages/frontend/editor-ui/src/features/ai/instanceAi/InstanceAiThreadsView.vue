<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nScrollArea,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { formatTimeAgo } from '@/app/utils/formatters/dateFormatter';
import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from './constants';
import { useInstanceAiStore } from './instanceAi.store';

const store = useInstanceAiStore();
const i18n = useI18n();
const router = useRouter();

const searchQuery = ref('');

useDocumentTitle().set(i18n.baseText('instanceAi.sidebar.chatHistory'));

const filteredThreads = computed(() => {
	const query = searchQuery.value.trim().toLocaleLowerCase();
	return query
		? store.threads.filter((thread) => thread.title.toLocaleLowerCase().includes(query))
		: store.threads;
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
						icon="arrow-left"
						icon-only
						:aria-label="i18n.baseText('instanceAi.threads.backToAssistant')"
						@click="router.push({ name: INSTANCE_AI_VIEW })"
					/>
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

			<N8nScrollArea :class="$style.threadList">
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
							<N8nText :class="$style.threadDate" size="medium" color="text-light">
								{{ formatTimeAgo(thread.updatedAt ?? thread.createdAt) }}
							</N8nText>
						</button>
					</div>
				</div>
				<div v-else :class="$style.empty">
					<N8nIcon icon="messages-square" size="xlarge" />
					<N8nText>
						{{
							i18n.baseText(
								searchQuery ? 'instanceAi.threads.noSearchResults' : 'instanceAi.sidebar.noThreads',
							)
						}}
					</N8nText>
				</div>
			</N8nScrollArea>
		</div>
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

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xl);
	color: var(--text-color--subtle);
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
