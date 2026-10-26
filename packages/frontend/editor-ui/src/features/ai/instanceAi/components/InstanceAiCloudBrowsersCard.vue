<script lang="ts" setup>
/**
 * The Browsers card in the sidebar: one row per running cloud browser task, with a small
 * read-only live view that opens the browser tab, and a stop button. A finished task stays, with
 * no browser, until its result reaches the assistant.
 */
import { N8nHeading, N8nIcon, N8nIconButton, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject } from 'vue';

import {
	CloudBrowserLiveViewsKey,
	embeddedLiveViewUrl,
} from '../composables/useCloudBrowserLiveViews';
import { CloudBrowserTasksKey, type CloudBrowserTask } from '../composables/useCloudBrowserTasks';
import { useThread } from '../instanceAi.store';

const i18n = useI18n();
const thread = useThread();
const tasks = inject(
	CloudBrowserTasksKey,
	computed(() => []),
);
const liveViews = inject(CloudBrowserLiveViewsKey, undefined);
const openCloudBrowserTab = inject<((taskId: string) => void) | undefined>(
	'openCloudBrowserTab',
	undefined,
);

// The same icons as the Tasks section of the panel.
const stateIcons: Record<
	CloudBrowserTask['state'],
	{ icon: IconName; spin: boolean; className: string }
> = {
	running: { icon: 'spinner', spin: true, className: 'runningIcon' },
	done: { icon: 'circle-check', spin: false, className: 'doneIcon' },
	failed: { icon: 'circle-x', spin: false, className: 'failedIcon' },
};

// A running task the instance no longer runs (for example after a restart) is not shown.
const rows = computed(() =>
	tasks.value
		.filter(
			(task) => task.state !== 'running' || liveViews?.get(task.taskId)?.status !== 'not-found',
		)
		.map((task) => {
			const view = liveViews?.get(task.taskId);
			return {
				task,
				stateIcon: stateIcons[task.state],
				subtitle: subtitleOf(task),
				liveViewUrl:
					task.state === 'running' && view?.status === 'live'
						? embeddedLiveViewUrl(view.liveViewUrl)
						: undefined,
				windowId: view?.status === 'live' ? view.windowId : undefined,
			};
		}),
);

function subtitleOf(task: CloudBrowserTask): string {
	if (task.state === 'done') return i18n.baseText('instanceAi.cloudBrowser.doneWaitingToSend');
	if (task.state === 'failed') return i18n.baseText('instanceAi.cloudBrowser.failedWaitingToSend');
	if (task.userAction) return i18n.baseText('instanceAi.cloudBrowser.needsYou');
	const view = liveViews?.get(task.taskId);
	if (view?.status === 'live') {
		return view.userInControl
			? i18n.baseText('instanceAi.cloudBrowser.youHaveControl')
			: i18n.baseText('instanceAi.cloudBrowser.working');
	}
	if (view?.status === 'disconnected') return i18n.baseText('instanceAi.cloudBrowser.disconnected');
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
				v-for="{ task, stateIcon, subtitle, liveViewUrl, windowId } in rows"
				:key="task.taskId"
				:class="$style.row"
				data-test-id="instance-ai-cloud-browser-row"
			>
				<div :class="$style.header">
					<span :class="$style.titleLine" aria-hidden="true">
						<N8nIcon
							:icon="stateIcon.icon"
							:spin="stateIcon.spin"
							:class="$style[stateIcon.className]"
							size="small"
						/>
					</span>
					<span :class="$style.text">
						<span :class="$style.name" :title="task.title">{{ task.title }}</span>
						<span :class="$style.subtitle" data-test-id="instance-ai-cloud-browser-status">
							{{ subtitle }}
						</span>
					</span>
					<span v-if="task.state === 'running'" :class="$style.titleLine">
						<N8nIconButton
							icon="filled-square"
							variant="ghost"
							size="xsmall"
							:aria-label="i18n.baseText('instanceAi.cloudBrowser.stop')"
							:title="i18n.baseText('instanceAi.cloudBrowser.stop')"
							data-test-id="instance-ai-cloud-browser-stop"
							@click="thread.cancelBackgroundTask(task.taskId)"
						/>
					</span>
				</div>
				<div
					v-if="task.state === 'running'"
					:class="$style.thumbnail"
					data-test-id="instance-ai-cloud-browser-live-view"
				>
					<iframe
						v-if="liveViewUrl"
						:src="liveViewUrl"
						:class="$style.thumbnailFrame"
						:data-cloud-browser-task-id="task.taskId"
						:data-cloud-browser-window-id="windowId"
						tabindex="-1"
						aria-hidden="true"
						sandbox="allow-same-origin allow-scripts"
					/>
					<!-- Next to the frame, not around it: a button cannot hold an iframe. -->
					<button
						type="button"
						:class="$style.thumbnailOverlay"
						data-test-id="instance-ai-cloud-browser-open"
						@click="openCloudBrowserTab?.(task.taskId)"
					>
						<span :class="$style.openButton">
							{{ i18n.baseText('instanceAi.cloudBrowser.openBrowser') }}
						</span>
					</button>
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

/*
 * One title line tall, so the icon and the stop button are centered on the title, not on the top
 * of its line. The button is taller than the line and overflows the box evenly.
 */
.titleLine {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	height: calc(var(--font-size--sm) * var(--line-height--lg));
}

.runningIcon {
	color: var(--color--primary);
}

.doneIcon {
	color: var(--color--success);
}

.failedIcon {
	color: var(--color--danger);
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

.thumbnailOverlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: 0;
	background: var(--color--black-alpha-300);
	font: inherit;
	opacity: 0;
	cursor: pointer;
	transition: opacity 0.15s ease;

	&:hover,
	&:focus-visible {
		opacity: 1;
	}
}

.openButton {
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-radius: var(--radius);
	background: var(--color--primary);
	color: var(--color--background--light-3);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}
</style>
