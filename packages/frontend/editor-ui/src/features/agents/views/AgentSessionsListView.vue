<script lang="ts" setup>
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import {
	AGENT_PREVIEW_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	CONTINUE_SESSION_ID_PARAM,
	EXECUTIONS_SECTION_KEY,
} from '@/features/agents/constants';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import type { AgentExecutionThread } from '@/features/agents/composables/useAgentThreadsApi';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
	N8nActionDropdown,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nTableBase,
	N8nTooltip,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { ElSkeletonItem } from 'element-plus';

type TraceTarget = { agentId: string; threadId: string };

const props = withDefaults(
	defineProps<{
		embedded?: boolean;
		projectId?: string;
		agentId?: string;
		openSessionInNewTab?: boolean;
		manageStoreLifecycle?: boolean;
	}>(),
	{
		embedded: false,
		projectId: undefined,
		agentId: undefined,
		openSessionInNewTab: false,
		manageStoreLifecycle: true,
	},
);

const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const message = useMessage();
const sessionsStore = useAgentSessionsStore();
let disposed = false;
let managesStoreLifecycle = false;

const projectId = computed(() => props.projectId ?? (route.params.projectId as string));
const agentId = computed(() => props.agentId ?? (route.params.agentId as string));

function onVisibilityChange() {
	// Refresh as soon as the user returns to the tab — auto-refresh is
	// throttled while the document is hidden, so a silent merge-refresh on
	// return closes the gap before the next interval tick without flashing
	// the load-more button or dropping paginated pages.
	if (document.visibilityState !== 'visible') return;
	if (!projectId.value || !agentId.value) return;
	void sessionsStore.refreshThreads(projectId.value, agentId.value);
}

onMounted(async () => {
	if (!props.manageStoreLifecycle) return;
	managesStoreLifecycle = true;
	document.addEventListener('visibilitychange', onVisibilityChange);

	if (projectId.value && agentId.value) {
		try {
			await sessionsStore.fetchThreads(projectId.value, agentId.value);
			if (disposed) return;
			sessionsStore.startAutoRefresh();
		} catch (error) {
			if (disposed) return;
			toast.showError(error, i18n.baseText('agentSessions.showError.load'));
		}
	}
});

onBeforeUnmount(() => {
	disposed = true;
	if (!managesStoreLifecycle) return;

	document.removeEventListener('visibilitychange', onVisibilityChange);
	sessionsStore.stopAutoRefresh();
});

function formatDate(fullDate: string) {
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const seconds = ms / 1000;
	return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}

function originLabel(thread: AgentExecutionThread): string {
	if (thread.parentThreadId) return i18n.baseText('agentSessions.origin.subAgent');
	if (thread.taskId) return i18n.baseText('agentSessions.origin.task');
	const source = thread.source?.trim();
	if (source === 'instance-ai') return i18n.baseText('agentSessions.origin.instanceAi');
	if (source === 'mcp') return i18n.baseText('agentSessions.origin.mcp');
	if (
		source &&
		source !== 'chat' &&
		source !== 'task' &&
		source !== 'subagent' &&
		source !== 'workflow'
	) {
		return source.charAt(0).toUpperCase() + source.slice(1);
	}
	return i18n.baseText('agentSessions.origin.agent');
}

function originIcon(thread: AgentExecutionThread): string {
	const source = thread.source?.trim();
	switch (source) {
		case 'chat':
			return 'zap';
		case 'task':
			return 'clock';
		case 'workflow':
			return 'workflow';
		case 'slack':
			return 'slack';
		case 'telegram':
			return 'telegram';
		case 'linear':
			return 'linear';
		case 'discord':
			return 'discord';
		case 'mcp':
			return 'plug';
		default:
			return 'zap';
	}
}

function rowActions(thread: AgentExecutionThread): Array<ActionDropdownItem<string>> {
	const actions: Array<ActionDropdownItem<string>> = [];

	if (thread.parentThreadId && thread.parentAgentId) {
		actions.push({
			id: 'goToParentRun',
			label: i18n.baseText('agentSessions.goToParentRun'),
			icon: 'arrow-up-right',
		});
	}

	actions.push({
		id: 'delete',
		label: i18n.baseText('generic.delete'),
		icon: 'trash-2',
		divided: actions.length > 0,
	});

	return actions;
}

function openConversation(threadId: string) {
	const target = {
		name: AGENT_PREVIEW_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
		query: {
			[CONTINUE_SESSION_ID_PARAM]: threadId,
			section: EXECUTIONS_SECTION_KEY,
		},
	};
	if (props.openSessionInNewTab) {
		window.open(router.resolve(target).href, '_blank');
		return;
	}
	void router.push(target);
}

function onViewTrace(target: TraceTarget) {
	const routeTarget = {
		name: AGENT_SESSION_DETAIL_VIEW,
		params: {
			projectId: projectId.value,
			agentId: target.agentId,
			threadId: target.threadId,
		},
	};
	if (props.openSessionInNewTab) {
		window.open(router.resolve(routeTarget).href, '_blank');
		return;
	}
	void router.push(routeTarget);
}

async function onAction(actionId: string, thread: AgentExecutionThread) {
	if (actionId === 'goToParentRun') {
		if (!thread.parentAgentId || !thread.parentThreadId) return;
		onViewTrace({
			agentId: thread.parentAgentId,
			threadId: thread.parentThreadId,
		});
		return;
	}

	if (actionId !== 'delete') return;

	const confirmed = await message.confirm(
		i18n.baseText('agentSessions.deleteConfirm.message'),
		i18n.baseText('agentSessions.deleteConfirm.headline'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('agentSessions.deleteConfirm.confirmButtonText'),
			cancelButtonText: '',
		},
	);

	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await sessionsStore.deleteThread(projectId.value, agentId.value, thread.id);
		toast.showMessage({
			title: i18n.baseText('agentSessions.showMessage.deleted'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.delete'));
	}
}

async function loadMore() {
	try {
		await sessionsStore.loadMore(projectId.value, agentId.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	}
}
</script>

<template>
	<div :class="[$style.wrapper, { [$style.embedded]: props.embedded }]">
		<div :class="$style.tableContainer">
			<N8nTableBase>
				<tbody>
					<tr
						v-for="thread in sessionsStore.threads"
						:key="thread.id"
						:class="$style.clickableRow"
						data-test-id="agent-session-list-item"
						@click="openConversation(thread.id)"
					>
						<td :class="$style.titleCell">
							<button
								type="button"
								:class="$style.sessionOpen"
								data-test-id="agent-session-open"
								@click.stop="openConversation(thread.id)"
							>
								<span :class="$style.sessionTitle" data-test-id="agent-session-title">
									{{ threadTitleOf(thread) }}
								</span>
							</button>
						</td>
						<td :class="$style.originCell" data-test-id="agent-session-origin">
							<span :class="$style.originPill" data-test-id="agent-session-origin-pill">
								<N8nIcon :icon="originIcon(thread)" size="large" />
								<span>{{ originLabel(thread) }}</span>
							</span>
						</td>
						<td :class="$style.dateCell" data-test-id="agent-session-updated-at">
							{{ formatDate(thread.updatedAt) }}
						</td>
						<td :class="$style.tokenCell" data-test-id="agent-session-token-usage">
							{{ (thread.totalPromptTokens + thread.totalCompletionTokens).toLocaleString() }}t
						</td>
						<td :class="$style.durationCell" data-test-id="agent-session-duration">
							{{ formatDuration(thread.totalDuration) }}
						</td>
						<td :class="$style.actionCell" @click.stop>
							<div :class="$style.actionGroup">
								<N8nTooltip :content="i18n.baseText('agentSessions.viewTrace')">
									<N8nIconButton
										icon="list-tree"
										icon-size="medium"
										size="xsmall"
										variant="ghost"
										:aria-label="i18n.baseText('agentSessions.viewTrace')"
										data-test-id="agent-session-view-trace"
										@click="onViewTrace({ agentId, threadId: thread.id })"
									/>
								</N8nTooltip>
								<N8nActionDropdown
									:items="rowActions(thread)"
									activator-icon="ellipsis"
									data-test-id="agent-session-actions"
									@select="onAction($event, thread)"
								/>
							</div>
						</td>
					</tr>
					<template v-if="sessionsStore.loading && !sessionsStore.threads.length">
						<tr v-for="item in 5" :key="item">
							<td v-for="col in 6" :key="col">
								<ElSkeletonItem />
							</td>
						</tr>
					</template>
					<tr
						v-if="!sessionsStore.loading && !sessionsStore.threads.length"
						:class="$style.lastRow"
					>
						<td :colspan="6" style="text-align: center; padding: var(--spacing--lg)">
							<template v-if="!sessionsStore.threads.length && !sessionsStore.loading">
								<span data-test-id="agent-sessions-empty">
									{{ i18n.baseText('agentSessions.empty') }}
								</span>
							</template>
						</td>
					</tr>
					<tr :class="$style.lastRow" v-if="sessionsStore.nextCursor">
						<td :colspan="6">
							<N8nButton
								icon="refresh-cw"
								variant="ghost"
								:title="i18n.baseText('agentSessions.loadMore')"
								:label="i18n.baseText('agentSessions.loadMore')"
								:loading="sessionsStore.loading"
								data-test-id="agent-sessions-load-more"
								@click="loadMore()"
							/>
						</td>
					</tr>
				</tbody>
			</N8nTableBase>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	height: 100%;
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.embedded {
	height: auto;
	padding: 0;
	overflow-y: visible;
}

.tableContainer {
	width: 100%;
	overflow-x: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.titleCell {
	width: 46%;
}

.sessionTitle {
	display: block;
	max-width: 100%;
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sessionOpen {
	@include focus.focus-visible-ring-offset;

	display: block;
	width: 100%;
	padding: 0;
	border: 0;
	color: inherit;
	background: transparent;
	font: inherit;
	text-align: left;
	appearance: none;
	cursor: pointer;
}

.originCell,
.dateCell,
.tokenCell,
.durationCell {
	width: 1%;
	white-space: nowrap;
}

.originPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	white-space: nowrap;
}

.dateCell,
.tokenCell,
.durationCell {
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.actionCell {
	width: 1%;
	min-width: var(--spacing--2xl);
	color: var(--text-color--subtler);
	white-space: nowrap;
}

.actionGroup {
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
}

.clickableRow {
	cursor: pointer;

	td {
		color: var(--text-color--subtler);
	}

	.actionCell {
		text-align: right;
	}

	&:hover {
		background-color: var(--background--hover);
	}
}

.lastRow {
	td {
		text-align: center;
	}

	td button {
		margin: 0 auto;
	}

	&:hover {
		background-color: var(--background--surface) !important;
	}
}
</style>
