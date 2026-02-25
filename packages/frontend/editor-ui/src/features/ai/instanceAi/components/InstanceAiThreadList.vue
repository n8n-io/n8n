<script lang="ts" setup>
import { N8nButton, N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';

const store = useInstanceAiStore();
const i18n = useI18n();

function handleNewThread() {
	store.newThread();
}

function handleSelectThread(threadId: string) {
	store.switchThread(threadId);
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nButton
				:label="i18n.baseText('instanceAi.thread.new')"
				type="secondary"
				size="small"
				icon="plus"
				block
				@click="handleNewThread"
			/>
		</div>
		<div :class="$style.threadList">
			<button
				v-for="thread in store.threads"
				:key="thread.id"
				:class="[$style.threadItem, thread.id === store.currentThreadId ? $style.activeThread : '']"
				@click="handleSelectThread(thread.id)"
			>
				<N8nIcon icon="message-square" size="small" :class="$style.threadIcon" />
				<N8nText size="small" :class="$style.threadTitle">{{ thread.title }}</N8nText>
			</button>
			<div v-if="store.threads.length === 0" :class="$style.empty">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.sidebar.noThreads') }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	border-right: var(--border);
	background: var(--color--background);
}

.header {
	padding: var(--spacing--xs);
	border-bottom: var(--border);
}

.threadList {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--4xs);
}

.threadItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: none;
	background: transparent;
	cursor: pointer;
	text-align: left;
	border-radius: var(--radius);
	font-family: var(--font-family);
	color: var(--color--text);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.activeThread {
	background: var(--color--primary--tint-3);

	&:hover {
		background: var(--color--primary--tint-2);
	}
}

.threadIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-2);
}

.threadTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty {
	padding: var(--spacing--lg) var(--spacing--xs);
	text-align: center;
}
</style>
