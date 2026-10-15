<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AgentPlanWorkState } from '@n8n/api-types';
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core';
import type { RouteLocationRaw } from 'vue-router';
import { N8nAiActivityStepGroup, N8nIcon, N8nLink, N8nButton } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { AgentPlanItemStatus, AgentPlanView } from '../utils/agent-plan';
import { formatAgentElapsedTime } from '../utils/agent-elapsed-time';
import { TIME } from '@/app/constants/durations';

const props = defineProps<{
	plan: AgentPlanView;
	workState?: AgentPlanWorkState;
	traceRoute?: RouteLocationRaw;
	showStop?: boolean;
	canStop?: boolean;
	stopping?: boolean;
	stopped?: boolean;
	stoppedAt?: string;
	reportFailed?: boolean;
	stopFailed?: boolean;
}>();
const isStopped = computed(() =>
	props.workState?.taskStateAvailable ? props.workState.fullyStopped : props.stopped,
);
const expanded = defineModel<boolean>('expanded', { default: false });
watch(
	() => props.plan.planId,
	() => {
		expanded.value = false;
	},
);
const emit = defineEmits<{ stop: [event: MouseEvent] }>();
const i18n = useI18n();
const now = ref(Date.now());
const documentVisibility = useDocumentVisibility();
const startTime = computed(() => Date.parse(props.plan.startedAt ?? ''));
const { pause, resume } = useIntervalFn(
	() => {
		now.value = Date.now();
	},
	TIME.SECOND,
	{ immediate: false },
);
watch(
	() =>
		Number.isFinite(startTime.value) &&
		!props.plan.closed &&
		!isStopped.value &&
		documentVisibility.value === 'visible',
	(active) => {
		if (active) {
			now.value = Date.now();
			resume();
		} else pause();
	},
	{ immediate: true },
);
const elapsed = computed(() => {
	const endTime = props.plan.closed
		? Date.parse(props.plan.closedAt ?? '')
		: isStopped.value
			? Date.parse(props.workState?.stoppedAt ?? props.stoppedAt ?? '') || now.value
			: now.value;
	if (!Number.isFinite(startTime.value) || !Number.isFinite(endTime)) return null;
	return formatAgentElapsedTime(endTime - startTime.value);
});
const label = computed(() => {
	if (props.stopping) return i18n.baseText('agents.chat.tasks.stopping');
	if (props.stopFailed) return i18n.baseText('agents.chat.tasks.stopFailedTitle');
	if (isStopped.value) return i18n.baseText('agents.chat.tasks.stopped');
	return props.plan.closed
		? (props.plan.document.presentation?.detail ?? props.plan.document.title)
		: (props.plan.document.presentation?.label ??
				i18n.baseText('agents.chat.plan.title', {
					interpolate: { title: props.plan.document.title },
				}));
});
type PlanItem = AgentPlanView['document']['items'][number];
type DisplayStatus = AgentPlanItemStatus | 'stopped' | 'stopping' | 'unavailable';
function displayStatus(item: PlanItem): DisplayStatus {
	if (item.status !== 'pending' && item.status !== 'in_progress') return item.status;
	if (props.workState?.taskStateAvailable === false) return 'unavailable';
	if (props.workState && item.kind === 'group' && item.tasks.length) {
		const statuses = item.tasks.map(displayStatus);
		if (statuses.includes('stopping')) return 'stopping';
		if (statuses.includes('in_progress')) return 'in_progress';
		if (statuses.includes('pending')) return 'pending';
		if (statuses.includes('stopped')) return 'stopped';
		if (statuses.includes('failed')) return 'failed';
		if (statuses.includes('cancelled')) return 'cancelled';
		return 'done';
	}
	if (props.workState?.stoppingTaskIds.includes(item.id)) return 'stopping';
	if (props.workState?.stoppedTaskIds.includes(item.id) || (!props.workState && isStopped.value))
		return 'stopped';
	return item.status;
}
const isRunning = computed(
	() =>
		!props.plan.closed &&
		!isStopped.value &&
		props.plan.document.items
			.flatMap((item) => (item.kind === 'group' ? [item, ...item.tasks] : [item]))
			.some((item) => ['in_progress', 'stopping'].includes(displayStatus(item))),
);
const statusLabels: Record<DisplayStatus, BaseTextKey> = {
	pending: 'agents.chat.plan.status.pending',
	in_progress: 'agents.chat.plan.status.inProgress',
	done: 'agents.chat.plan.status.done',
	failed: 'agents.chat.plan.status.failed',
	cancelled: 'agents.chat.plan.status.canceled',
	stopped: 'agents.chat.tasks.stopped',
	stopping: 'agents.chat.tasks.stopping',
	unavailable: 'agents.chat.plan.status.unavailable',
};
const statusIcons = {
	pending: 'circle',
	in_progress: 'loader-circle',
	done: 'check',
	failed: 'x',
	cancelled: 'x',
	stopped: 'circle-pause',
	stopping: 'loader-circle',
	unavailable: 'circle-help',
} as const;
const summary = computed(() => {
	const tasks = props.plan.document.items.flatMap((item) =>
		item.kind === 'group' && item.tasks.length > 0 ? item.tasks : [item],
	);
	return i18n.baseText('agents.chat.plan.progress', {
		adjustToNumber: tasks.length,
		interpolate: {
			done: tasks.filter((task) => task.status === 'done').length,
			total: tasks.length,
		},
	});
});
</script>

<template>
	<div :class="$style.plan" data-testid="agent-chat-plan">
		<N8nAiActivityStepGroup
			v-model:open="expanded"
			:key="plan.planId"
			:label="label"
			:title="
				stopping || isStopped || stopFailed || plan.closed || plan.document.presentation
					? label
					: plan.document.title
			"
			full-width
			content-position="below"
		>
			<template #prefix>
				<N8nIcon
					:icon="isStopped ? 'circle-pause' : isRunning ? 'loader-circle' : 'list-checks'"
					:spin="isRunning"
					:class="{ [$style.running]: isRunning }"
					size="small"
					aria-hidden="true"
					data-testid="agent-chat-plan-indicator"
				/>
			</template>
			<template v-if="elapsed !== null" #header-trailing>
				<span :class="$style.timer" aria-live="off" data-testid="agent-chat-plan-timer">{{
					elapsed
				}}</span>
			</template>
			<div
				:class="$style.details"
				role="region"
				:aria-label="plan.document.title"
				tabindex="0"
				data-testid="agent-chat-plan-details"
			>
				<ul
					:class="$style.items"
					:aria-label="plan.document.title"
					data-testid="agent-chat-plan-items"
				>
					<li v-for="item in plan.document.items" :key="item.id">
						<div :class="[$style.row, { [$style.group]: item.kind === 'group' }]">
							<span
								role="img"
								:aria-label="i18n.baseText(statusLabels[displayStatus(item)])"
								:title="i18n.baseText(statusLabels[displayStatus(item)])"
								:data-status="displayStatus(item)"
								:class="$style.status"
							>
								<N8nIcon
									:icon="statusIcons[displayStatus(item)]"
									:spin="['in_progress', 'stopping'].includes(displayStatus(item))"
									size="small"
									aria-hidden="true"
								/>
							</span>
							<span :class="$style.itemTitle" :title="item.title">{{ item.title }}</span>
							<span
								v-if="displayStatus(item) === 'stopped'"
								:class="$style.stoppedLabel"
								aria-hidden="true"
							>
								{{ i18n.baseText('agents.chat.tasks.stopped') }}
							</span>
						</div>
						<ul v-if="item.kind === 'group'" :class="$style.children">
							<li v-for="task in item.tasks" :key="task.id" :class="$style.row">
								<span
									role="img"
									:aria-label="i18n.baseText(statusLabels[displayStatus(task)])"
									:title="i18n.baseText(statusLabels[displayStatus(task)])"
									:data-status="displayStatus(task)"
									:class="$style.status"
								>
									<N8nIcon
										:icon="statusIcons[displayStatus(task)]"
										:spin="['in_progress', 'stopping'].includes(displayStatus(task))"
										size="small"
										aria-hidden="true"
									/>
								</span>
								<span :class="$style.itemTitle" :title="task.title">{{ task.title }}</span>
								<span
									v-if="displayStatus(task) === 'stopped'"
									:class="$style.stoppedLabel"
									aria-hidden="true"
								>
									{{ i18n.baseText('agents.chat.tasks.stopped') }}
								</span>
							</li>
						</ul>
					</li>
				</ul>
			</div>
			<p
				v-if="!plan.closed && !stopping && !isStopped && plan.document.presentation?.detail"
				:class="$style.detail"
				:title="plan.document.presentation.detail"
			>
				{{ plan.document.presentation.detail }}
			</p>
			<div :class="$style.footer">
				<N8nLink
					v-if="traceRoute"
					:to="traceRoute"
					theme="text"
					size="small"
					underline
					data-testid="agent-chat-plan-trace"
				>
					<span :class="$style.traceLabel">
						<N8nIcon icon="arrow-right" size="small" aria-hidden="true" />
						{{ i18n.baseText('agents.chat.plan.viewTrace') }}
					</span>
				</N8nLink>
				<N8nButton
					v-if="showStop || canStop || stopping"
					variant="ghost"
					size="small"
					:disabled="stopping || !canStop"
					data-testid="agent-chat-plan-stop"
					@click="emit('stop', $event)"
				>
					{{
						i18n.baseText(
							stopping
								? 'agents.chat.tasks.stopping'
								: stopFailed
									? 'agents.chat.tasks.retry'
									: 'agents.chat.tasks.stopAll',
						)
					}}
				</N8nButton>
				<span :class="$style.summary" data-testid="agent-chat-plan-summary">{{ summary }}</span>
			</div>
			<p v-if="stopFailed" :class="$style.detail" role="status">
				{{ i18n.baseText('agents.chat.backgroundTasks.stopError') }}
			</p>
			<p v-if="workState?.taskStateAvailable === false" :class="$style.detail" role="status">
				{{ i18n.baseText('agents.chat.plan.taskStateUnavailable') }}
			</p>
			<p v-if="reportFailed" :class="$style.detail" role="status">
				{{ i18n.baseText('agents.chat.tasks.reportFailed') }}
			</p>
		</N8nAiActivityStepGroup>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.plan {
	margin: calc(-1 * var(--spacing--2xs)) calc(-1 * var(--spacing--2xs)) 0;
	border-bottom: var(--border);
	min-width: 0;
	--ai-activity-step--height: auto;
	--ai-activity-step--min-height: var(--height--xl);
	--ai-activity-step--padding: var(--spacing--xs) var(--spacing--sm);
	--ai-activity-step--color: var(--text-color);
}

.summary {
	flex: 0 0 auto;
	width: auto;
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;
	color: var(--text-color--subtle);
	margin-inline-start: auto;
}

.timer {
	font-variant-numeric: tabular-nums;
	font-size: var(--font-size--xs);
	color: var(--text-color--subtler);
	flex-shrink: 0;
}

.details {
	padding: var(--spacing--2xs) var(--spacing--sm) 0;
	max-height: 20vh;
	overflow-y: auto;
	overscroll-behavior: contain;
	border-top: var(--border);
	border-top-style: dashed;
	overflow-wrap: anywhere;
}

.items {
	list-style: none;
	margin: 0;
	padding: 0;
}

.detail {
	margin: var(--spacing--2xs) 0 0;
	padding-inline: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--text-color--subtle);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	overflow: hidden;
}

.itemTitle {
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.stoppedLabel {
	margin-inline-start: auto;
	flex-shrink: 0;
	font-weight: var(--font-weight--regular);
	color: var(--text-color--subtler);
}

.footer {
	flex-wrap: wrap;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
}

.traceLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.running {
	color: var(--color--primary);
}

.children {
	list-style: none;
	margin: 0;
	padding: 0 0 0 var(--spacing--lg);
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding-block: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
	min-width: 0;
}

.group {
	font-weight: var(--font-weight--bold);
}

.status {
	display: inline-flex;
	align-items: center;
	height: calc(var(--font-size--2xs) * var(--line-height--lg));
	flex-shrink: 0;
	color: var(--color--foreground--shade-2);
	--animation--spin--duration: var(--duration--slow);

	&[data-status='in_progress'] {
		color: var(--color--primary);
	}
	&[data-status='done'] {
		color: var(--color--success);
		@include motion.fade-in;
	}
	&[data-status='failed'] {
		color: var(--color--danger);
	}
}
</style>
