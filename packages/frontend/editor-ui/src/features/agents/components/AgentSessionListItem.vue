<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	N8nDropdownMenu,
	N8nIconButton,
	N8nBadge,
	N8nText,
	N8nSpinner,
	N8nIcon,
	N8nTooltip,
	N8nButton,
} from '@n8n/design-system';
import type { DropdownMenuItemProps, IconColor, IconName } from '@n8n/design-system';
import type { AgentExecutionThread, AgentSessionStatus } from '../composables/useAgentThreadsApi';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { formatTokenCount } from '../utils/token-count';
import { useRelativeTimestamp } from '../utils/relative-time';
import { useThreadTitle } from '../utils/thread-title';
import { resolveToolNameForDisplay } from '../utils/toolDisplayName';

type OriginPresentation = { icon: IconName; label: string };
const props = defineProps<{
	row: {
		thread: AgentExecutionThread;
		depth: number;
		isLast: boolean;
		hasChildren: boolean;
		guides: boolean[];
	};
	projectId: string;
	agentId: string;
	actions: Array<DropdownMenuItemProps<string>>;
	reasoningLabel?: BaseTextKey;
	assistantAvailable: boolean;
	fixingThreadId: string | null;
}>();
const emit = defineEmits<{
	action: [actionId: string];
	'fix-with-assistant': [];
}>();
const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const formatRelativeDate = useRelativeTimestamp();

function formatDateTooltip(thread: AgentExecutionThread): string {
	const { date, time } = convertToDisplayDate(thread.updatedAt);
	const dateLabel = `${date} ${time.slice(0, 5)}`;
	if (!thread.status || thread.status === 'running') return dateLabel;
	return `${dateLabel} • ${formatDuration(thread.totalDuration)}`;
}

function getTotalTokens(thread: AgentExecutionThread): number {
	return thread.totalPromptTokens + thread.totalCompletionTokens;
}

function formatTokenTooltip(thread: AgentExecutionThread): string {
	return `${getTotalTokens(thread).toLocaleString()}t • $${thread.totalCost.toFixed(4)}`;
}

function getStatusIcon(status: AgentSessionStatus): IconName {
	switch (status) {
		case 'succeeded':
			return 'circle-check';
		case 'error':
			return 'circle-alert';
		case 'cancelled':
			return 'circle-x';
		case 'interrupted':
			return 'circle-pause';
		default:
			return 'circle';
	}
}

function getStatusIconColor(status: AgentSessionStatus): IconColor {
	switch (status) {
		case 'succeeded':
			return 'success';
		case 'error':
			return 'danger';
		case 'awaiting':
			return 'secondary';
		case 'cancelled':
		case 'interrupted':
			return 'text-xlight';
		default:
			return 'text-base';
	}
}

function statusLabel(status: AgentSessionStatus): string {
	switch (status) {
		case 'running':
			return i18n.baseText('agentSessions.status.running');
		case 'succeeded':
			return i18n.baseText('agentSessions.status.succeeded');
		case 'error':
			return i18n.baseText('agentSessions.status.error');
		case 'cancelled':
			return i18n.baseText('agentSessions.status.cancelled');
		case 'interrupted':
			return i18n.baseText('agentSessions.status.interrupted');
		case 'awaiting':
			return i18n.baseText('agentSessions.status.awaiting');
	}
}

function rowTitle(thread: AgentExecutionThread): string {
	const activity = thread.status === 'running' ? thread.latestActivity : null;
	if (!activity) return threadTitleOf(thread);

	if (activity.type === 'tool-call') {
		return (
			activity.displayName ||
			resolveToolNameForDisplay(activity.toolName, i18n) ||
			threadTitleOf(thread)
		);
	}

	return activity.type === 'reasoning'
		? i18n.baseText(props.reasoningLabel ?? 'ai.thinking.active')
		: i18n.baseText('agentSessions.activity.responding');
}

function originPresentation(thread: AgentExecutionThread): OriginPresentation {
	const rawSource = thread.source?.trim();
	const source = rawSource?.toLowerCase() || undefined;

	if (thread.parentThreadId || source === 'subagent' || source === 'sub-agent') {
		return { icon: 'bot', label: i18n.baseText('agentSessions.origin.subAgent') };
	}
	if (thread.taskId || source === 'task') {
		return { icon: 'clock', label: i18n.baseText('agentSessions.origin.schedule') };
	}

	switch (source) {
		case 'instance-ai':
			return {
				icon: 'n8n-assistant',
				label: i18n.baseText('agentSessions.origin.instanceAi'),
			};
		case 'mcp':
			return { icon: 'flask-conical', label: i18n.baseText('agentSessions.origin.mcp') };
		case 'workflow':
			return { icon: 'workflow', label: i18n.baseText('agentSessions.origin.workflow') };
		case 'n8n_chat_production':
			return { icon: 'message-square', label: i18n.baseText('agentSessions.origin.n8nChat') };
		case 'slack':
		case 'telegram':
		case 'linear':
		case 'discord':
		case 'teams':
			return { icon: source, label: source.charAt(0).toUpperCase() + source.slice(1) };
		case 'whatsapp':
			return { icon: source, label: 'WhatsApp' };
		case 'chat':
		case 'n8n_chat':
		case undefined:
			return { icon: 'flask-conical', label: i18n.baseText('agentSessions.origin.preview') };
		default:
			return {
				icon: 'plug',
				label: rawSource ? rawSource.charAt(0).toUpperCase() + rawSource.slice(1) : '',
			};
	}
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const seconds = ms / 1000;
	return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}
</script>

<template>
	<li
		:class="$style.listRow"
		:data-status="row.thread.status"
		:data-depth="row.depth"
		data-test-id="agent-session-list-item"
	>
		<RouterLink
			:class="$style.sessionLink"
			:to="{
				name: AGENT_SESSION_DETAIL_VIEW,
				params: { projectId, agentId, threadId: row.thread.id },
			}"
		>
			<div :class="$style.listStart">
				<div
					v-if="row.depth > 0"
					:class="$style.rail"
					aria-hidden="true"
					data-test-id="agent-session-rail"
				>
					<svg
						v-for="(continues, level) in row.guides"
						:key="level"
						:class="$style.railCell"
						:data-continues="continues"
						data-test-id="agent-session-rail-guide"
						viewBox="0 0 24 40"
						preserveAspectRatio="none"
					>
						<path v-if="continues" d="M12 0 V40" />
					</svg>
					<svg
						:class="$style.railCell"
						:data-branch="row.isLast ? 'last' : 'middle'"
						data-test-id="agent-session-rail-branch"
						viewBox="0 0 24 40"
						preserveAspectRatio="none"
					>
						<path
							:d="row.isLast ? 'M12 0 V14 Q12 20 18 20 H24' : 'M12 0 V40 M12 14 Q12 20 18 20 H24'"
						/>
					</svg>
				</div>
				<div :class="$style.listIconContainer">
					<svg
						v-if="row.hasChildren"
						:class="$style.railStub"
						data-test-id="agent-session-rail-stub"
						viewBox="0 0 24 10"
						preserveAspectRatio="none"
						aria-hidden="true"
					>
						<path d="M12 0 V10" />
					</svg>
					<N8nSpinner
						v-if="row.thread.status === 'running'"
						:aria-label="statusLabel(row.thread.status)"
						size="medium"
						data-testid="agent-session-status-indicator"
					/>
					<N8nIcon
						v-else-if="row.thread.status"
						:icon="getStatusIcon(row.thread.status)"
						:color="getStatusIconColor(row.thread.status)"
						:aria-label="statusLabel(row.thread.status)"
						size="medium"
						data-testid="agent-session-status-indicator"
					/>
				</div>
				<div v-if="row.thread.status === 'running'" :class="$style.activityLabel">
					<Transition
						type="transition"
						:enter-active-class="$style.labelEnterActive"
						:leave-active-class="$style.labelLeaveActive"
						:enter-from-class="$style.labelEnterFrom"
						:leave-to-class="$style.labelLeaveTo"
					>
						<N8nText
							:key="rowTitle(row.thread)"
							step="sm"
							color="text-dark"
							:class="[$style.activityWord, $style.shimmer]"
							bold
						>
							{{ rowTitle(row.thread) }}
						</N8nText>
					</Transition>
				</div>
				<N8nText v-else step="sm" color="text-dark" bold data-test-id="agent-session-title">
					{{ threadTitleOf(row.thread) }}
				</N8nText>
			</div>
			<div v-if="row.thread.status !== 'running'" :class="$style.listEnd">
				<N8nBadge
					:leading-icon="originPresentation(row.thread).icon"
					data-test-id="agent-session-origin-pill"
				>
					{{ originPresentation(row.thread).label }}
				</N8nBadge>
				<N8nTooltip :content="formatDateTooltip(row.thread)" placement="top">
					<N8nText step="sm" bold color="text-light" data-test-id="agent-session-updated-at">
						{{ formatRelativeDate(row.thread.updatedAt) }}
					</N8nText>
				</N8nTooltip>
				<N8nTooltip :content="formatTokenTooltip(row.thread)" placement="top">
					<N8nText step="sm" bold color="text-light" data-test-id="agent-session-token-usage">
						{{ formatTokenCount(getTotalTokens(row.thread)) }}
					</N8nText>
				</N8nTooltip>
			</div>
		</RouterLink>
		<div v-if="row.thread.status !== 'running'" :class="$style.actionGroup">
			<div
				v-if="assistantAvailable && row.thread.status === 'error'"
				:class="$style.fixButtonGroup"
			>
				<N8nButton
					:class="$style.groupButtonLeft"
					size="small"
					variant="ghost"
					icon="n8n-assistant"
					:loading="fixingThreadId === row.thread.id"
					:disabled="fixingThreadId !== null"
					data-test-id="agent-session-fix-with-assistant"
					@click="emit('fix-with-assistant')"
				>
					{{ i18n.baseText('agentSessions.fixWithAssistant') }}
				</N8nButton>
				<N8nDropdownMenu placement="bottom-end" :items="actions" @select="emit('action', $event)">
					<template #trigger>
						<N8nIconButton
							:class="$style.groupButtonRight"
							icon="chevron-down"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('agentSessions.actions')"
							data-test-id="agent-session-actions"
						/>
					</template>
				</N8nDropdownMenu>
			</div>
			<N8nDropdownMenu
				v-else
				placement="bottom-end"
				:items="actions"
				@select="emit('action', $event)"
			>
				<template #trigger>
					<N8nIconButton
						icon="ellipsis"
						variant="ghost"
						size="small"
						:aria-label="i18n.baseText('agentSessions.actions')"
						data-test-id="agent-session-actions"
					/>
				</template>
			</N8nDropdownMenu>
		</div>
	</li>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;
@use '@n8n/design-system/css/mixins/motion' as motion;

.listRow {
	/** Gap between the rail, status icon and title. The rail geometry depends on it. */
	--n8n-agent-session-list-start-gap: var(--spacing--2xs);
	/** Rails extend over this border so lines join across rows. */
	--n8n-agent-session-list-row-border-width: 1px;

	display: flex;
	align-items: stretch;
	border: var(--n8n-agent-session-list-row-border-width) solid transparent;
	border-radius: var(--radius);

	&:hover:not(:has(.actionGroup:hover)) {
		background-color: var(--background--hover);
	}

	&:has(.sessionLink:focus) {
		@include focus.focus-ring-with-border;
	}
}

.sessionLink {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	min-width: 0;
	padding-inline-start: var(--spacing--xs);
	height: var(--height--2xl);
	color: inherit;
	text-decoration: none;
	outline: 0;
}

.listStart,
.listEnd {
	display: flex;
	align-items: center;
	gap: var(--n8n-agent-session-list-start-gap, var(--spacing--2xs));
}

.listStart {
	min-width: 0;
	align-self: stretch;
}

.listEnd {
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--sm);
	font-variant-numeric: tabular-nums;
}

/**
 * Each rail cell is one indent step wide: icon width plus the row gap.
 * Half-gap negative margins put the cell centre line under the parent's status icon.
 */
.rail {
	--rail-cell-width: calc(var(--height--2xs) + var(--n8n-agent-session-list-start-gap));

	display: flex;
	align-self: stretch;
	flex-shrink: 0;
	margin-inline: calc(var(--n8n-agent-session-list-start-gap) / -2);
	margin-block: calc(-1 * var(--n8n-agent-session-list-row-border-width));
}

.railCell,
.railStub {
	fill: none;
	stroke: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	stroke-width: 1px;
	overflow: visible;

	path {
		vector-effect: non-scaling-stroke;
	}
}

.railCell {
	width: var(--rail-cell-width);
	height: 100%;
}

.railStub {
	position: absolute;
	top: 100%;
	left: 0;
	width: 100%;
	height: calc(
		(var(--height--2xl) - var(--height--2xs)) / 2 + var(--n8n-agent-session-list-row-border-width)
	);
}

.listIconContainer {
	position: relative;
	flex-shrink: 0;
	display: grid;
	place-items: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
}

.actionGroup {
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	padding-inline: var(--spacing--3xs);
	min-width: var(--height--xl);
	flex-shrink: 0;
}

.fixButtonGroup {
	display: inline-flex;
	align-items: center;
	border-radius: var(--radius--full);
	background-color: var(--color--primary);
	margin-inline-start: var(--spacing--3xs);

	:global(button) {
		--button--color: var(--text-color--inverse);
		--button--color--background-hover: color-mix(
			in srgb,
			var(--color--primary),
			light-dark(var(--color--neutral-white), var(--color--neutral-black)) 10%
		);
		--button--color--background-active: color-mix(
			in srgb,
			var(--color--primary),
			light-dark(var(--color--neutral-white), var(--color--neutral-black)) 12%
		);
	}
}

.groupButtonLeft {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.groupButtonRight {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-left: var(--border);
	border-left-color: color-mix(in srgb, var(--text-color--inverse) 20%, transparent);
}

.activityLabel {
	display: grid;
	overflow-y: hidden;
}

.activityWord {
	grid-area: 1 / 1;
}

.labelEnterActive,
.labelLeaveActive {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out),
		filter var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.labelEnterFrom,
.labelLeaveTo {
	opacity: 0;
	filter: blur(var(--spacing--3xs));
}

.labelEnterFrom {
	transform: translateY(var(--spacing--2xs));
}

.labelLeaveTo {
	transform: translateY(calc(-1 * var(--spacing--2xs)));
}

.shimmer {
	--animation--shimmer--background: var(--text-color);
	--animation--shimmer--foreground: var(--text-color--subtler);
	--animation--shimmer--duration: calc(var(--duration--slowest) * 2);
	@include motion.shimmer;
}
</style>
