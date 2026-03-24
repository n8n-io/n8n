<script lang="ts" setup>
import { computed, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiThreadSummary } from '@n8n/api-types';

const MAX_PREVIEW_LENGTH = 60;
const MAX_RECENT_THREADS = 10;

const props = defineProps<{
	currentThreadId: string;
	threads: InstanceAiThreadSummary[];
	currentLabel: string;
}>();

const emit = defineEmits<{
	select: [threadId: string, workflowId?: string];
}>();

const i18n = useI18n();
const isOpen = ref(false);
const pickerRef = ref<HTMLElement>();

onClickOutside(pickerRef, () => {
	isOpen.value = false;
});

const globalThread = computed(() => props.threads.find((thread) => !thread.workflowId));

const recentWorkflowThreads = computed(() =>
	props.threads
		.filter((thread) => thread.workflowId)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, MAX_RECENT_THREADS),
);

function truncatePreview(text: string | undefined): string {
	if (!text) return '';
	return text.length > MAX_PREVIEW_LENGTH ? `${text.slice(0, MAX_PREVIEW_LENGTH)}...` : text;
}

function toggleDropdown() {
	isOpen.value = !isOpen.value;
}

function selectThread(thread: InstanceAiThreadSummary) {
	emit('select', thread.id, thread.workflowId);
	isOpen.value = false;
}
</script>

<template>
	<div ref="pickerRef" :class="$style.wrapper" data-test-id="instance-ai-thread-picker">
		<button
			:class="$style.trigger"
			data-test-id="instance-ai-thread-picker-trigger"
			@click="toggleDropdown"
		>
			<N8nText tag="span" size="medium" bold :class="$style.triggerLabel">
				{{ currentLabel }}
			</N8nText>
			<N8nIcon
				icon="chevron-down"
				size="small"
				:class="[$style.chevron, { [$style.chevronOpen]: isOpen }]"
			/>
		</button>

		<Transition name="dropdown">
			<div v-if="isOpen" :class="$style.dropdown" data-test-id="instance-ai-thread-picker-dropdown">
				<!-- Global thread (pinned) -->
				<button
					v-if="globalThread"
					:class="[
						$style.threadEntry,
						{ [$style.threadEntryCurrent]: globalThread.id === currentThreadId },
					]"
					data-test-id="instance-ai-thread-picker-global"
					@click="selectThread(globalThread)"
				>
					<div :class="$style.threadEntryHeader">
						<N8nIcon icon="globe" size="small" :class="$style.globalIcon" />
						<N8nText tag="span" size="small" bold>
							{{ i18n.baseText('instanceAi.threadPicker.global') }}
						</N8nText>
					</div>
					<N8nText
						v-if="globalThread.lastMessagePreview"
						tag="span"
						size="small"
						color="text-light"
						:class="$style.preview"
					>
						{{ truncatePreview(globalThread.lastMessagePreview) }}
					</N8nText>
				</button>

				<!-- Separator -->
				<div v-if="globalThread && recentWorkflowThreads.length > 0" :class="$style.separator" />

				<!-- Workflow threads -->
				<button
					v-for="thread in recentWorkflowThreads"
					:key="thread.id"
					:class="[
						$style.threadEntry,
						{ [$style.threadEntryCurrent]: thread.id === currentThreadId },
					]"
					data-test-id="instance-ai-thread-picker-item"
					@click="selectThread(thread)"
				>
					<div :class="$style.threadEntryHeader">
						<N8nIcon icon="circle-dot" size="small" :class="$style.threadDot" />
						<N8nText tag="span" size="small" :class="$style.threadTitle">
							{{ thread.title }}
						</N8nText>
					</div>
					<N8nText
						v-if="thread.lastMessagePreview"
						tag="span"
						size="small"
						color="text-light"
						:class="$style.preview"
					>
						{{ truncatePreview(thread.lastMessagePreview) }}
					</N8nText>
				</button>
			</div>
		</Transition>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	display: flex;
	align-items: center;
	min-width: 0;
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: none;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;
	min-width: 0;
	color: var(--color--text);
	transition: background-color 0.1s ease;

	&:hover {
		background-color: var(--color--background--shade-1);
	}
}

.triggerLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chevron {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	transition: transform 0.15s ease;
}

.chevronOpen {
	transform: rotate(180deg);
}

.dropdown {
	position: absolute;
	top: 100%;
	left: 0;
	z-index: 10;
	min-width: 280px;
	max-width: 360px;
	max-height: 400px;
	overflow-y: auto;
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
	padding: var(--spacing--4xs);
	margin-top: var(--spacing--4xs);
}

.threadEntry {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: none;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;
	text-align: left;
	color: var(--color--text);
	transition: background-color 0.1s ease;

	&:hover {
		background-color: var(--color--background--shade-1);
	}
}

.threadEntryCurrent {
	background-color: var(--color--primary--tint-3);

	&:hover {
		background-color: var(--color--primary--tint-2);
	}
}

.threadEntryHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.globalIcon {
	flex-shrink: 0;
	color: var(--color--warning);
}

.threadDot {
	flex-shrink: 0;
	color: var(--color--text--tint-2);
}

.threadTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.preview {
	padding-left: calc(var(--spacing--3xs) + 14px);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--2xs);
}

.separator {
	height: 1px;
	background: var(--color--foreground);
	margin: var(--spacing--4xs) var(--spacing--xs);
}
</style>

<style lang="scss" scoped>
.dropdown-enter-active {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}

.dropdown-leave-active {
	transition:
		opacity 0.1s ease,
		transform 0.1s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
