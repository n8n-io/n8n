<script lang="ts" setup>
/**
 * PROTOTYPE (cloud browser): a strip above the chat input, shown only when a background
 * task needs the user (a hand-off or an approval), or its result waits to reach the
 * assistant. Running tasks are in the sidebar's Browsers card. It is where the user looks,
 * so it does not depend on the assistant mentioning the task.
 */
import { N8nButton, N8nIcon, N8nIconButton, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import {
	useCloudBrowserAgents,
	type CloudBrowserAgent,
	type CloudBrowserStatus,
} from '../composables/useCloudBrowserAgents';
import { useCloudBrowserLinkHandler } from '../cloudBrowserLink';
import { useThread } from '../instanceAi.store';

interface BarItem {
	key: string;
	icon: IconName;
	iconClass: string;
	title: string;
	detail?: string;
	browser: CloudBrowserAgent;
	kind: 'needs-user' | 'needs-approval' | 'queued';
	sendNow?: boolean;
}

const i18n = useI18n();
const thread = useThread();
const cloudBrowsers = useCloudBrowserAgents();
const dismissed = ref(new Set<string>());
const pending = ref(new Set<string>());
const onLiveViewClick = useCloudBrowserLinkHandler();

const outcomeIcon: Partial<Record<CloudBrowserStatus, { icon: IconName; iconClass: string }>> = {
	completed: { icon: 'check', iconClass: 'doneIcon' },
	failed: { icon: 'circle-x', iconClass: 'failedIcon' },
	blocked: { icon: 'triangle-alert', iconClass: 'failedIcon' },
	denied: { icon: 'x', iconClass: 'mutedIcon' },
};

function outcomeLabel(status: CloudBrowserStatus): string {
	if (status === 'failed') return i18n.baseText('instanceAi.artifactsPanel.cloudBrowsers.failed');
	if (status === 'blocked') return i18n.baseText('instanceAi.artifactsPanel.cloudBrowsers.blocked');
	if (status === 'denied') return i18n.baseText('instanceAi.artifactsPanel.cloudBrowsers.denied');
	return i18n.baseText('instanceAi.artifactsPanel.cloudBrowsers.completed');
}

const items = computed<BarItem[]>(() => {
	const result: BarItem[] = [];
	for (const browser of cloudBrowsers.value) {
		if (browser.status === 'needs-user' && browser.handOff) {
			result.push({
				key: `${browser.agentId}:needs-user`,
				icon: 'user-round',
				iconClass: 'needsUserIcon',
				title: i18n.baseText('instanceAi.backgroundTaskBar.needsUser'),
				detail: browser.handOff.reason,
				browser,
				kind: 'needs-user',
			});
		} else if (browser.status === 'needs-approval') {
			result.push({
				key: `${browser.agentId}:needs-approval`,
				icon: 'shield',
				iconClass: 'needsUserIcon',
				title: i18n.baseText('instanceAi.backgroundTaskBar.needsApproval'),
				browser,
				kind: 'needs-approval',
			});
		}
	}
	// A finished task whose result has not reached the assistant yet.
	for (const queued of thread.backgroundInbox ?? []) {
		if (queued.kind !== 'finished') continue;
		const browser = cloudBrowsers.value.find((b) => b.taskId === queued.taskId);
		if (!browser) continue;
		const icon = outcomeIcon[browser.status] ?? outcomeIcon.completed!;
		result.push({
			key: `${browser.agentId}:queued`,
			...icon,
			title: i18n.baseText('instanceAi.backgroundTaskBar.finished', {
				interpolate: { outcome: outcomeLabel(browser.status) },
			}),
			detail: queued.sendNow
				? i18n.baseText('instanceAi.backgroundTaskBar.sending')
				: i18n.baseText('instanceAi.backgroundTaskBar.queued'),
			browser,
			kind: 'queued',
			sendNow: queued.sendNow,
		});
	}
	return result.filter((item) => !dismissed.value.has(item.key));
});

async function withPending(key: string, action: () => Promise<void>) {
	if (pending.value.has(key)) return;
	pending.value.add(key);
	try {
		await action();
	} finally {
		pending.value.delete(key);
	}
}

function handBack(item: BarItem) {
	const taskId = item.browser.taskId;
	if (!taskId) return;
	void withPending(item.key, async () => {
		await thread.sendTaskCorrection(
			taskId,
			'The user finished the step in the Live View. Check the page and continue.',
		);
	});
}

function sendNow(item: BarItem) {
	void withPending(item.key, async () => {
		await thread.sendBackgroundEventsNow(item.browser.taskId);
	});
}

function dismiss(item: BarItem) {
	dismissed.value = new Set([...dismissed.value, item.key]);
}
</script>

<template>
	<div v-if="items.length > 0" :class="$style.bar" data-test-id="instance-ai-background-task-bar">
		<div
			v-for="item in items"
			:key="item.key"
			:class="$style.row"
			data-test-id="instance-ai-background-task-bar-item"
		>
			<N8nIcon :icon="item.icon" size="medium" :class="$style[item.iconClass]" />
			<span :class="$style.text">
				<span :class="$style.title">{{ item.title }}</span>
				<span :class="$style.detail" :title="item.browser.goal">
					{{ item.detail ?? item.browser.goal }}
				</span>
			</span>
			<template v-if="item.kind === 'needs-user' && item.browser.handOff">
				<a
					:href="item.browser.handOff.liveViewUrl"
					target="_blank"
					rel="noopener noreferrer"
					:class="$style.link"
					data-test-id="instance-ai-background-task-bar-live-view"
					@click="onLiveViewClick"
				>
					{{ i18n.baseText('instanceAi.backgroundTaskBar.openLiveView') }}
					<N8nIcon icon="external-link" size="xsmall" />
				</a>
				<N8nButton
					variant="outline"
					size="mini"
					:loading="pending.has(item.key)"
					data-test-id="instance-ai-background-task-bar-done"
					@click="handBack(item)"
				>
					{{ i18n.baseText('instanceAi.artifactsPanel.cloudBrowsers.done') }}
				</N8nButton>
			</template>
			<template v-else-if="item.kind === 'queued'">
				<N8nButton
					v-if="!item.sendNow"
					variant="outline"
					size="mini"
					:loading="pending.has(item.key)"
					data-test-id="instance-ai-background-task-bar-send-now"
					@click="sendNow(item)"
				>
					{{ i18n.baseText('instanceAi.backgroundTaskBar.sendNow') }}
				</N8nButton>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="mini"
					:aria-label="i18n.baseText('instanceAi.backgroundTaskBar.dismiss')"
					:title="i18n.baseText('instanceAi.backgroundTaskBar.dismiss')"
					data-test-id="instance-ai-background-task-bar-dismiss"
					@click="dismiss(item)"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.bar {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--xs);
	font-size: var(--font-size--2xs);
}

.text {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.title {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.detail {
	color: var(--color--text--tint-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.link {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--primary);
	white-space: nowrap;
}

.needsUserIcon {
	color: var(--color--warning);
}

.doneIcon {
	color: var(--color--success);
}

.failedIcon {
	color: var(--color--danger);
}

.mutedIcon {
	color: var(--color--text--tint-1);
}
</style>
