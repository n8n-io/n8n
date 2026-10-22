<script lang="ts" setup>
/**
 * The Browsers card in the sidebar: one row per running cloud browser task, with a small
 * read-only live view and a stop button. A finished task stays, with no browser, until its
 * result reaches the assistant.
 */
import { N8nButton, N8nHeading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject } from 'vue';

import {
	CloudBrowserLiveViewsKey,
	embeddedLiveViewUrl,
} from '../composables/useCloudBrowserLiveViews';
import { useCloudBrowserTasks, type CloudBrowserTask } from '../composables/useCloudBrowserTasks';
import { useThread } from '../instanceAi.store';

const i18n = useI18n();
const thread = useThread();
const tasks = useCloudBrowserTasks();
const liveViews = inject(CloudBrowserLiveViewsKey, undefined);

// A running task the instance no longer runs (for example after a restart) is not shown.
const rows = computed(() =>
	tasks.value.filter(
		(task) => task.state !== 'running' || liveViews?.get(task.taskId)?.status !== 'not-found',
	),
);

function dotClassOf(task: CloudBrowserTask): string {
	if (task.state === 'done') return 'dotDone';
	if (task.state === 'failed') return 'dotFailed';
	return 'dotRunning';
}

function liveViewUrlOf(task: CloudBrowserTask): string | undefined {
	const view = liveViews?.get(task.taskId);
	return view?.status === 'live' ? view.liveViewUrl : undefined;
}

function subtitleOf(task: CloudBrowserTask): string {
	if (task.state === 'done') return i18n.baseText('instanceAi.cloudBrowser.doneWaitingToSend');
	if (task.state === 'failed') return i18n.baseText('instanceAi.cloudBrowser.failedWaitingToSend');
	const status = liveViews?.get(task.taskId)?.status;
	if (status === 'live') return i18n.baseText('instanceAi.cloudBrowser.working');
	if (status === 'disconnected') return i18n.baseText('instanceAi.cloudBrowser.disconnected');
	return i18n.baseText('instanceAi.cloudBrowser.opening');
}
</script>

<template>
	<div v-if="rows.length > 0" :class="$style.group" data-test-id="instance-ai-cloud-browsers">
		<div :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading tag="h3" size="small" :class="$style.sectionTitle">
					{{ i18n.baseText('instanceAi.cloudBrowser.cardTitle') }}
				</N8nHeading>
			</div>

			<div
				v-for="task in rows"
				:key="task.taskId"
				:class="$style.row"
				data-test-id="instance-ai-cloud-browser-row"
			>
				<div :class="$style.header">
					<span :class="[$style.dot, $style[dotClassOf(task)]]" />
					<span :class="$style.text">
						<span :class="$style.name" :title="task.title">{{ task.title }}</span>
						<span :class="$style.subtitle" data-test-id="instance-ai-cloud-browser-status">
							{{ subtitleOf(task) }}
						</span>
					</span>
					<N8nButton
						v-if="task.state === 'running'"
						variant="ghost"
						icon-only
						icon="filled-square"
						icon-size="small"
						size="mini"
						:class="$style.stop"
						:aria-label="i18n.baseText('instanceAi.cloudBrowser.stop')"
						:title="i18n.baseText('instanceAi.cloudBrowser.stop')"
						data-test-id="instance-ai-cloud-browser-stop"
						@click="thread.cancelBackgroundTask(task.taskId)"
					/>
				</div>
				<div
					v-if="task.state === 'running'"
					:class="$style.thumbnail"
					data-test-id="instance-ai-cloud-browser-live-view"
				>
					<iframe
						v-if="liveViewUrlOf(task)"
						:src="embeddedLiveViewUrl(liveViewUrlOf(task) ?? '')"
						:class="$style.thumbnailFrame"
						tabindex="-1"
						aria-hidden="true"
						sandbox="allow-same-origin allow-scripts"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.group {
	margin-top: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--xs);
	overflow: hidden;
}

.section {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs);
	padding-top: calc(var(--spacing--2xs) + var(--spacing--3xs));
}

.sectionHeader {
	margin-bottom: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
}

.sectionTitle {
	color: var(--text-color--subtle);
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--2xs);
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.dot {
	flex-shrink: 0;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	margin-top: var(--spacing--3xs);
	border-radius: 50%;
}

.dotRunning {
	background: var(--color--text--tint-1);
	animation: browser-pulse 1.4s ease-in-out infinite;
}

.dotDone {
	background: var(--color--success);
}

.dotFailed {
	background: var(--color--danger);
}

@keyframes browser-pulse {
	50% {
		opacity: 0.35;
	}
}

.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.name {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--color--text--shade-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.subtitle {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	color: var(--color--text--tint-1);
}

.stop {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	background: transparent;

	&:hover {
		color: var(--color--primary);
		background: transparent;
	}
}

/* The live view laid out at 4x its box and scaled down, so the page renders at desktop size. */
.thumbnail {
	position: relative;
	width: 100%;
	aspect-ratio: 16 / 10;
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--shade-1);
}

.thumbnailFrame {
	width: 400%;
	height: 400%;
	border: 0;
	transform: scale(0.25);
	transform-origin: 0 0;
	pointer-events: none;
}
</style>
