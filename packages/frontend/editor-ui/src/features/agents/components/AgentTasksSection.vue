<script setup lang="ts">
import type { AgentJsonTaskConfig, AgentTaskDto } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nSwitch2, N8nText, N8nTooltip } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { deleteAgentTask, getAgentTasks, runAgentTask } from '../composables/useAgentApi';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { AGENT_TASK_MODAL_KEY } from '../constants';
import { getNextScheduleOccurrence, parseCron } from '../utils/scheduleBuilder';

const props = withDefaults(
	defineProps<{
		projectId: string;
		agentId: string;
		disabled?: boolean;
		isPublished?: boolean;
		/** Membership + enabled state, the source of truth, from the agent config. */
		taskRefs?: AgentJsonTaskConfig[];
		reloadKey?: number;
	}>(),
	{ disabled: false, isPublished: false, taskRefs: () => [] },
);

const emit = defineEmits<{
	/** Toggle a task's enabled flag — handled by the parent as a config edit. */
	toggle: [payload: { id: string; enabled: boolean }];
	/** A body mutation landed (add/edit/delete); the parent re-syncs config + bodies. */
	changed: [];
}>();

type TaskRow = AgentTaskDto & { enabled: boolean };

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();
const toast = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const bodies = ref<AgentTaskDto[]>([]);
const loading = ref(false);
const errorMessage = ref('');
// Task ids with an in-flight manual run, so the row's play button can show a spinner.
const runningTaskIds = ref(new Set<string>());

/** Join config refs (membership + enabled) with the fetched bodies. */
const tasks = computed<TaskRow[]>(() => {
	const bodiesById = new Map(bodies.value.map((body) => [body.id, body]));
	return props.taskRefs
		.map((ref) => {
			const body = bodiesById.get(ref.id);
			return body ? { ...body, enabled: ref.enabled } : null;
		})
		.filter((task): task is TaskRow => task !== null);
});

const MAX_VISIBLE_TASKS = 5;
// Beyond 5 tasks the list scrolls; the cap is a CSS max-height (see `.scrollable`).
const isScrollable = computed(() => tasks.value.length > MAX_VISIBLE_TASKS);

function toErrorMessage(error: unknown, fallbackKey: BaseTextKey): string {
	return error instanceof Error && error.message ? error.message : i18n.baseText(fallbackKey);
}

async function reload() {
	loading.value = true;
	errorMessage.value = '';
	try {
		bodies.value = await getAgentTasks(rootStore.restApiContext, props.projectId, props.agentId);
	} catch (error) {
		errorMessage.value = toErrorMessage(error, 'agents.builder.tasks.loadError');
	} finally {
		loading.value = false;
	}
}

onMounted(reload);

// Reload the bodies when the parent signals a change (add/edit/delete, or a
// builder create_task).
watch(
	() => props.reloadKey,
	() => {
		void reload();
	},
);

function openModal(task: AgentTaskDto | null) {
	uiStore.openModalWithData({
		name: AGENT_TASK_MODAL_KEY,
		data: {
			projectId: props.projectId,
			agentId: props.agentId,
			task,
			isPublished: props.isPublished,
			onSaved: () => emit('changed'),
		},
	});
}

function onAdd() {
	openModal(null);
}

function onEdit(task: TaskRow) {
	openModal(task);
}

function onToggle(task: TaskRow, enabled: boolean) {
	emit('toggle', { id: task.id, enabled });
}

// Run the task now against the draft config, regardless of publish/enabled state.
async function onRun(task: TaskRow) {
	if (runningTaskIds.value.has(task.id)) return;
	runningTaskIds.value.add(task.id);
	try {
		await runAgentTask(rootStore.restApiContext, props.projectId, props.agentId, task.id);
		toast.showMessage({
			title: i18n.baseText('agents.builder.tasks.executeStarted'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.tasks.executeError'));
	} finally {
		runningTaskIds.value.delete(task.id);
	}
}

async function onDelete(task: TaskRow) {
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.builder.tasks.deleteConfirm.title'),
		description: i18n.baseText('agents.builder.tasks.deleteConfirm.description'),
		confirmButtonText: i18n.baseText('agents.builder.tasks.deleteConfirm.confirm'),
		cancelButtonText: i18n.baseText('agents.builder.tasks.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await deleteAgentTask(rootStore.restApiContext, props.projectId, props.agentId, task.id);
		emit('changed');
	} catch (error) {
		errorMessage.value = toErrorMessage(error, 'agents.builder.tasks.deleteError');
	}
}

function formatTimeOfDay(hour: number, minuteValue: number): string {
	return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
		new Date(2024, 0, 1, hour, minuteValue),
	);
}

function dayName(dayOfWeek: number): string {
	// 2024-01-07 is a Sunday, so dayOfWeek 0..6 maps to Sun..Sat.
	return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
		new Date(Date.UTC(2024, 0, 7 + dayOfWeek)),
	);
}

function scheduleSummary(task: TaskRow): string {
	const parts = parseCron(task.cronExpression);
	if (!parts) return task.cronExpression;

	const time = formatTimeOfDay(parts.hour, parts.minute);
	switch (parts.frequency) {
		case 'hourly':
			return i18n.baseText('agents.builder.tasks.schedule.summary.hourly', {
				interpolate: { minute: String(parts.minute) },
			});
		case 'daily':
			return i18n.baseText('agents.builder.tasks.schedule.summary.daily', {
				interpolate: { time },
			});
		case 'weekly':
			return i18n.baseText('agents.builder.tasks.schedule.summary.weekly', {
				interpolate: { day: dayName(parts.dayOfWeek), time },
			});
		case 'monthly':
			return i18n.baseText('agents.builder.tasks.schedule.summary.monthly', {
				interpolate: { day: String(parts.dayOfMonth), time },
			});
	}
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat(undefined, {
		timeZone: rootStore.timezone,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}

function runSummary(task: TaskRow): string {
	const parts: string[] = [];
	// Next run is derived from the schedule + enabled state (the config ref).
	const nextRun = task.enabled
		? getNextScheduleOccurrence(task.cronExpression, rootStore.timezone)
		: null;
	if (nextRun) {
		parts.push(
			i18n.baseText('agents.builder.tasks.nextRun', {
				interpolate: { time: formatDate(nextRun) },
			}),
		);
	}
	if (task.lastRunAt) {
		const statusKey =
			task.lastRunStatus === 'error'
				? 'agents.builder.tasks.status.error'
				: 'agents.builder.tasks.status.success';
		parts.push(
			i18n.baseText('agents.builder.tasks.lastRun', {
				interpolate: {
					time: `${formatDate(new Date(task.lastRunAt))} (${i18n.baseText(statusKey)})`,
				},
			}),
		);
	}
	return parts.length > 0 ? parts.join(' · ') : i18n.baseText('agents.builder.tasks.neverRun');
}
</script>

<template>
	<div
		:class="[$style.section, disabled && $style.disabled]"
		:inert="disabled || undefined"
		data-testid="agent-tasks-section"
	>
		<div :class="$style.header">
			<div :class="$style.headerText">
				<N8nText bold>{{ i18n.baseText('agents.builder.tasks.title') }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.tasks.description') }}
				</N8nText>
			</div>
			<N8nTooltip :content="i18n.baseText('agents.builder.tasks.add')" placement="top">
				<N8nButton
					variant="ghost"
					size="small"
					icon-only
					:disabled="disabled"
					:aria-label="i18n.baseText('agents.builder.tasks.add')"
					data-testid="agent-tasks-add"
					@click="onAdd"
				>
					<template #icon><N8nIcon icon="plus" :size="16" /></template>
				</N8nButton>
			</N8nTooltip>
		</div>

		<div
			v-if="tasks.length === 0 && !loading"
			:class="$style.empty"
			data-testid="agent-tasks-empty"
		>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.tasks.empty') }}
			</N8nText>
		</div>

		<ul v-else :class="[$style.list, isScrollable && $style.scrollable]">
			<li
				v-for="task in tasks"
				:key="task.id"
				:class="$style.row"
				role="button"
				tabindex="0"
				data-testid="agent-task-row"
				@click="onEdit(task)"
				@keydown.enter="onEdit(task)"
				@keydown.space.prevent="onEdit(task)"
			>
				<div :class="$style.rowMain">
					<N8nText bold>{{ task.name }}</N8nText>
					<N8nText size="small" color="text-light">{{ scheduleSummary(task) }}</N8nText>
					<N8nText size="small" color="text-light">{{ runSummary(task) }}</N8nText>
				</div>
				<div :class="$style.rowActions" @click.stop>
					<N8nTooltip
						:content="i18n.baseText('agents.builder.tasks.publishHint')"
						:disabled="isPublished"
						placement="top"
					>
						<N8nSwitch2
							:model-value="task.enabled"
							:disabled="disabled"
							data-testid="agent-task-toggle"
							@update:model-value="(value) => onToggle(task, Boolean(value))"
						/>
					</N8nTooltip>
					<N8nTooltip :content="i18n.baseText('agents.builder.tasks.execute')" placement="top">
						<N8nButton
							variant="ghost"
							size="small"
							icon-only
							:loading="runningTaskIds.has(task.id)"
							:disabled="disabled"
							:aria-label="i18n.baseText('agents.builder.tasks.execute')"
							data-testid="agent-task-run"
							@click="onRun(task)"
						>
							<template #icon><N8nIcon icon="play" :size="16" /></template>
						</N8nButton>
					</N8nTooltip>
					<N8nTooltip :content="i18n.baseText('agents.builder.tasks.delete')" placement="top">
						<N8nButton
							variant="ghost"
							size="small"
							icon-only
							:disabled="disabled"
							data-testid="agent-task-delete"
							@click="onDelete(task)"
						>
							<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
						</N8nButton>
					</N8nTooltip>
				</div>
			</li>
		</ul>

		<N8nText v-if="errorMessage" size="small" :class="$style.error">{{ errorMessage }}</N8nText>
	</div>
</template>

<style module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.disabled {
	opacity: 0.5;
	pointer-events: none;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

/* Applied once there are more than 5 tasks: cap at ~5 rows, then scroll. The cap
   is an approximation (a row grows taller when a long name/summary wraps) — exact
   5-row precision isn't required. Derived from the row anatomy: 3 text lines (one
   medium + two small at line-height lg), the row's vertical padding and border,
   plus the inter-row gap. scrollbar-gutter keeps row widths stable so wrapping
   doesn't shift when the scrollbar appears. */
.scrollable {
	--task-row-height: calc(
		(var(--font-size--sm) + 2 * var(--font-size--2xs)) * var(--line-height--lg) + 2 *
			var(--spacing--5xs) + 2 * var(--spacing--xs) + 2px
	);

	max-height: calc(5 * var(--task-row-height) + 4 * var(--spacing--2xs));
	overflow-y: auto;
	scrollbar-gutter: stable;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	cursor: pointer;
	transition: border-color 0.15s ease;
}

.row:hover,
.row:focus-visible {
	border-color: var(--color--primary);
	outline: none;
}

.rowMain {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.rowActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.error {
	color: var(--color--danger);
}
</style>
