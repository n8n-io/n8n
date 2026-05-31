<script setup lang="ts">
import type { AgentTaskDto } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nSwitch2, N8nText, N8nTooltip } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onMounted, ref, watch } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { deleteAgentTask, getAgentTasks, updateAgentTask } from '../composables/useAgentApi';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { AGENT_TASK_MODAL_KEY } from '../constants';
import { parseCron } from '../utils/scheduleBuilder';

const props = withDefaults(
	defineProps<{
		projectId: string;
		agentId: string;
		disabled?: boolean;
		isPublished?: boolean;
		reloadKey?: number;
	}>(),
	{ disabled: false, isPublished: false },
);

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const tasks = ref<AgentTaskDto[]>([]);
const loading = ref(false);
const errorMessage = ref('');

function toErrorMessage(error: unknown, fallbackKey: BaseTextKey): string {
	return error instanceof Error && error.message ? error.message : i18n.baseText(fallbackKey);
}

async function reload() {
	loading.value = true;
	errorMessage.value = '';
	try {
		tasks.value = await getAgentTasks(rootStore.restApiContext, props.projectId, props.agentId);
	} catch (error) {
		errorMessage.value = toErrorMessage(error, 'agents.builder.tasks.loadError');
	} finally {
		loading.value = false;
	}
}

onMounted(reload);

// Reload when the builder signals a change (e.g. it created a task via create_task).
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
			onSaved: reload,
		},
	});
}

function onAdd() {
	openModal(null);
}

function onEdit(task: AgentTaskDto) {
	openModal(task);
}

async function onToggle(task: AgentTaskDto, enabled: boolean) {
	try {
		await updateAgentTask(rootStore.restApiContext, props.projectId, props.agentId, task.id, {
			enabled,
		});
		await reload();
	} catch (error) {
		errorMessage.value = toErrorMessage(error, 'agents.builder.tasks.saveError');
	}
}

async function onDelete(task: AgentTaskDto) {
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.builder.tasks.deleteConfirm.title'),
		description: i18n.baseText('agents.builder.tasks.deleteConfirm.description'),
		confirmButtonText: i18n.baseText('agents.builder.tasks.deleteConfirm.confirm'),
		cancelButtonText: i18n.baseText('agents.builder.tasks.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await deleteAgentTask(rootStore.restApiContext, props.projectId, props.agentId, task.id);
		await reload();
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

function scheduleSummary(task: AgentTaskDto): string {
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

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat(undefined, {
		timeZone: rootStore.timezone,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: 'numeric',
		minute: '2-digit',
	}).format(new Date(iso));
}

function runSummary(task: AgentTaskDto): string {
	const parts: string[] = [];
	if (task.nextRunAt) {
		parts.push(
			i18n.baseText('agents.builder.tasks.nextRun', {
				interpolate: { time: formatDate(task.nextRunAt) },
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
				interpolate: { time: `${formatDate(task.lastRunAt)} (${i18n.baseText(statusKey)})` },
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

		<ul v-else :class="$style.list">
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
						:content="i18n.baseText('agents.builder.tasks.publishRequired')"
						:disabled="isPublished"
						placement="top"
					>
						<N8nSwitch2
							:model-value="task.enabled"
							:disabled="disabled || !isPublished"
							data-testid="agent-task-toggle"
							@update:model-value="(value) => onToggle(task, Boolean(value))"
						/>
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
