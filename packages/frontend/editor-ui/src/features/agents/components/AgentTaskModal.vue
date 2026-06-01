<script setup lang="ts">
import {
	AGENT_TASK_NAME_MAX_LENGTH,
	AGENT_TASK_OBJECTIVE_MAX_LENGTH,
	type AgentTaskDto,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nMarkdownEditor,
	N8nSwitch2,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import {
	createAgentTask,
	deleteAgentTask,
	runAgentTask,
	updateAgentTask,
} from '../composables/useAgentApi';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import {
	buildCron,
	DEFAULT_SCHEDULE_PARTS,
	formatScheduleDateTime,
	formatTimeOfDay,
	getNextScheduleOccurrence,
	parseCron,
	type ScheduleFrequency,
	weekdayLabel,
} from '../utils/scheduleBuilder';

export type AgentTaskModalData = {
	projectId: string;
	agentId: string;
	task?: AgentTaskDto | null;
	isPublished: boolean;
	taskState?: {
		enabled: boolean;
	};
	onToggle?: (payload: { id: string; enabled: boolean }) => void;
	onSaved: () => void;
};

type FrequencyOption = ScheduleFrequency | 'custom';

const props = defineProps<{
	modalName: string;
	data: AgentTaskModalData;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();
const toast = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const task = computed(() => props.data.task ?? null);
const isEditing = computed(() => Boolean(task.value));
// Editing a task on a published agent only changes the live schedule on the
// next publish (see AgentTaskService), so warn before the edit silently no-ops.
const showRepublishHint = computed(() => isEditing.value && props.data.isPublished);
const enabled = ref(props.data.taskState?.enabled ?? true);
const running = ref(false);
const deleting = ref(false);

const name = ref('');
const objective = ref('');
const frequency = ref<FrequencyOption>(DEFAULT_SCHEDULE_PARTS.frequency);
const minute = ref(DEFAULT_SCHEDULE_PARTS.minute);
const hour = ref(DEFAULT_SCHEDULE_PARTS.hour);
const dayOfWeek = ref(DEFAULT_SCHEDULE_PARTS.dayOfWeek);
const dayOfMonth = ref(DEFAULT_SCHEDULE_PARTS.dayOfMonth);
const customCron = ref('');
const submitted = ref(false);
const saving = ref(false);
const errorMessage = ref('');

const cronExpression = computed(() => {
	const freq = frequency.value;
	if (freq === 'custom') return customCron.value.trim();
	return buildCron({
		frequency: freq,
		minute: minute.value,
		hour: hour.value,
		dayOfWeek: dayOfWeek.value,
		dayOfMonth: dayOfMonth.value,
	});
});

function applyTask() {
	const current = task.value;
	name.value = current?.name ?? '';
	objective.value = current?.objective ?? '';

	const parts = current ? parseCron(current.cronExpression) : { ...DEFAULT_SCHEDULE_PARTS };
	if (parts) {
		frequency.value = parts.frequency;
		minute.value = parts.minute;
		hour.value = parts.hour;
		dayOfWeek.value = parts.dayOfWeek;
		dayOfMonth.value = parts.dayOfMonth;
		customCron.value = '';
	} else {
		frequency.value = 'custom';
		customCron.value = current?.cronExpression ?? '';
	}
}

applyTask();

const frequencyOptions = computed<Array<{ label: string; value: FrequencyOption }>>(() => [
	{ value: 'hourly', label: i18n.baseText('agents.builder.tasks.schedule.frequency.hourly') },
	{ value: 'daily', label: i18n.baseText('agents.builder.tasks.schedule.frequency.daily') },
	{ value: 'weekly', label: i18n.baseText('agents.builder.tasks.schedule.frequency.weekly') },
	{ value: 'monthly', label: i18n.baseText('agents.builder.tasks.schedule.frequency.monthly') },
	{ value: 'custom', label: i18n.baseText('agents.builder.tasks.schedule.frequency.custom') },
]);

function onFrequencyChange(value: unknown) {
	const match = frequencyOptions.value.find((option) => option.value === value);
	if (match) frequency.value = match.value;
}

const dayOfWeekOptions = computed(() =>
	Array.from({ length: 7 }, (_, index) => ({ value: index, label: weekdayLabel(index) })),
);

const dayOfMonthOptions = computed(() =>
	Array.from({ length: 31 }, (_, index) => ({ value: index + 1, label: String(index + 1) })),
);

const showTime = computed(() => ['daily', 'weekly', 'monthly'].includes(frequency.value));

const selectedTime = computed({
	get: () => hour.value * 60 + minute.value,
	set: (value: number) => {
		hour.value = Math.floor(value / 60);
		minute.value = value % 60;
	},
});

const timeOptions = computed(() => {
	const steps = Array.from({ length: 48 }, (_, index) => index * 30);
	// Keep a non-30-minute time from an existing cron selectable instead of blank.
	const values = steps.includes(selectedTime.value)
		? steps
		: [...steps, selectedTime.value].sort((a, b) => a - b);
	return values.map((totalMinutes) => ({
		value: totalMinutes,
		label: formatTimeOfDay(Math.floor(totalMinutes / 60), totalMinutes % 60),
	}));
});

function onMinuteInput(value: string) {
	const parsed = Number(value);
	minute.value = Number.isFinite(parsed) ? Math.min(59, Math.max(0, Math.trunc(parsed))) : 0;
}

const nextOccurrenceText = computed(() => {
	const next = getNextScheduleOccurrence(cronExpression.value, rootStore.timezone);
	if (!next) return '';
	return formatScheduleDateTime(next, rootStore.timezone);
});

const errors = computed<{ name?: string; objective?: string; cron?: string }>(() => {
	const result: { name?: string; objective?: string; cron?: string } = {};
	const trimmedName = name.value.trim();
	if (!trimmedName) {
		result.name = i18n.baseText('agents.builder.tasks.validation.nameRequired');
	} else if (trimmedName.length > AGENT_TASK_NAME_MAX_LENGTH) {
		result.name = i18n.baseText('agents.builder.tasks.validation.nameMaxLength', {
			interpolate: { max: String(AGENT_TASK_NAME_MAX_LENGTH) },
		});
	}
	if (!objective.value.trim()) {
		result.objective = i18n.baseText('agents.builder.tasks.validation.objectiveRequired');
	} else if (objective.value.trim().length > AGENT_TASK_OBJECTIVE_MAX_LENGTH) {
		result.objective = i18n.baseText(
			'agents.builder.tasks.validation.objectiveMaxLength' as BaseTextKey,
			{
				interpolate: { max: String(AGENT_TASK_OBJECTIVE_MAX_LENGTH) },
			},
		);
	}
	if (!cronExpression.value.trim()) {
		result.cron = i18n.baseText('agents.builder.tasks.validation.cronRequired');
	}
	return result;
});

const visibleErrors = computed(() => (submitted.value ? errors.value : {}));
const canSave = computed(() => Object.keys(errors.value).length === 0 && !saving.value);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function onToggleEnabled(value: boolean) {
	const current = task.value;
	if (!current) return;
	enabled.value = value;
	props.data.onToggle?.({ id: current.id, enabled: value });
}

async function onRun() {
	const current = task.value;
	if (!current || running.value) return;
	running.value = true;
	try {
		await runAgentTask(
			rootStore.restApiContext,
			props.data.projectId,
			props.data.agentId,
			current.id,
		);
		toast.showMessage({
			title: i18n.baseText('agents.builder.tasks.executeStarted'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.tasks.executeError'));
	} finally {
		running.value = false;
	}
}

async function onDelete() {
	const current = task.value;
	if (!current || deleting.value) return;
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.builder.tasks.deleteConfirm.title'),
		description: i18n.baseText('agents.builder.tasks.deleteConfirm.description'),
		confirmButtonText: i18n.baseText('agents.builder.tasks.deleteConfirm.confirm'),
		cancelButtonText: i18n.baseText('agents.builder.tasks.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return;

	deleting.value = true;
	errorMessage.value = '';
	try {
		await deleteAgentTask(
			rootStore.restApiContext,
			props.data.projectId,
			props.data.agentId,
			current.id,
		);
		props.data.onSaved();
		closeModal();
	} catch (error) {
		errorMessage.value =
			error instanceof Error && error.message
				? error.message
				: i18n.baseText('agents.builder.tasks.deleteError');
	} finally {
		deleting.value = false;
	}
}

async function onSave() {
	submitted.value = true;
	if (!canSave.value) return;

	saving.value = true;
	errorMessage.value = '';

	const base = {
		name: name.value.trim(),
		objective: objective.value.trim(),
		cronExpression: cronExpression.value,
	};

	try {
		if (task.value) {
			await updateAgentTask(
				rootStore.restApiContext,
				props.data.projectId,
				props.data.agentId,
				task.value.id,
				base,
			);
		} else {
			// New tasks are enabled by default; the config ref carries the flag and
			// the task starts running once the agent is published.
			await createAgentTask(rootStore.restApiContext, props.data.projectId, props.data.agentId, {
				...base,
				enabled: true,
			});
		}
		props.data.onSaved();
		closeModal();
	} catch (error) {
		errorMessage.value =
			error instanceof Error && error.message
				? error.message
				: i18n.baseText('agents.builder.tasks.saveError');
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<Modal :name="modalName" width="860px" data-testid="agent-task-modal">
		<template #header>
			<div :class="$style.header">
				<N8nHeading tag="h2" size="large">
					{{
						i18n.baseText(
							isEditing ? 'agents.builder.tasks.edit.title' : 'agents.builder.tasks.create.title',
						)
					}}
				</N8nHeading>
				<div v-if="isEditing" :class="$style.headerActions">
					<N8nTooltip
						:content="
							props.data.isPublished
								? i18n.baseText('agents.builder.tasks.republishHint')
								: i18n.baseText('agents.builder.tasks.publishHint')
						"
						placement="top"
					>
						<N8nSwitch2
							:model-value="enabled"
							data-testid="agent-task-toggle"
							@update:model-value="(value) => onToggleEnabled(Boolean(value))"
						/>
					</N8nTooltip>
					<N8nTooltip :content="i18n.baseText('agents.builder.tasks.execute')" placement="top">
						<N8nButton
							variant="ghost"
							size="small"
							icon-only
							:loading="running"
							:aria-label="i18n.baseText('agents.builder.tasks.execute')"
							data-testid="agent-task-run"
							@click="onRun"
						>
							<template #icon><N8nIcon icon="play" :size="16" /></template>
						</N8nButton>
					</N8nTooltip>
				</div>
			</div>
		</template>

		<template #content>
			<div :class="$style.content">
				<div :class="$style.field">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.tasks.name.label') }}
						<N8nText color="primary" bold size="small">*</N8nText>
					</N8nText>
					<N8nInput
						v-model="name"
						:placeholder="i18n.baseText('agents.builder.tasks.name.placeholder')"
						data-testid="agent-task-name-input"
					/>
					<N8nText v-if="visibleErrors.name" :class="$style.error" size="small">
						{{ visibleErrors.name }}
					</N8nText>
				</div>

				<div :class="$style.field">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.tasks.objective.label') }}
						<N8nText color="primary" bold size="small">*</N8nText>
					</N8nText>
					<N8nMarkdownEditor
						:class="$style.objectiveEditor"
						:model-value="objective"
						:placeholder="i18n.baseText('agents.builder.tasks.objective.placeholder')"
						max-height="100%"
						data-testid="agent-task-objective-input"
						@update:model-value="objective = $event"
					/>
					<N8nText v-if="visibleErrors.objective" :class="$style.error" size="small">
						{{ visibleErrors.objective }}
					</N8nText>
				</div>

				<div :class="$style.field">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.tasks.schedule.label') }}
						<N8nText color="primary" bold size="small">*</N8nText>
					</N8nText>
					<div :class="$style.scheduleRow">
						<N8nSelect
							:model-value="frequency"
							:class="$style.frequencySelect"
							data-testid="agent-task-frequency"
							@update:model-value="onFrequencyChange"
						>
							<N8nOption
								v-for="option in frequencyOptions"
								:key="option.value"
								:value="option.value"
								:label="option.label"
							/>
						</N8nSelect>

						<template v-if="frequency === 'weekly'">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('agents.builder.tasks.schedule.on') }}
							</N8nText>
							<N8nSelect
								:model-value="dayOfWeek"
								:class="$style.daySelect"
								data-testid="agent-task-day-of-week"
								@update:model-value="dayOfWeek = Number($event)"
							>
								<N8nOption
									v-for="day in dayOfWeekOptions"
									:key="day.value"
									:value="day.value"
									:label="day.label"
								/>
							</N8nSelect>
						</template>

						<template v-if="frequency === 'monthly'">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('agents.builder.tasks.schedule.onDay') }}
							</N8nText>
							<N8nSelect
								:model-value="dayOfMonth"
								:class="$style.daySelect"
								data-testid="agent-task-day-of-month"
								@update:model-value="dayOfMonth = Number($event)"
							>
								<N8nOption
									v-for="day in dayOfMonthOptions"
									:key="day.value"
									:value="day.value"
									:label="day.label"
								/>
							</N8nSelect>
						</template>

						<template v-if="showTime">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('agents.builder.tasks.schedule.at') }}
							</N8nText>
							<N8nSelect
								:model-value="selectedTime"
								:class="$style.timeSelect"
								data-testid="agent-task-time"
								@update:model-value="selectedTime = Number($event)"
							>
								<N8nOption
									v-for="option in timeOptions"
									:key="option.value"
									:value="option.value"
									:label="option.label"
								/>
							</N8nSelect>
						</template>

						<template v-if="frequency === 'hourly'">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('agents.builder.tasks.schedule.minuteLabel') }}
							</N8nText>
							<N8nInput
								type="number"
								:model-value="String(minute)"
								:class="$style.minuteInput"
								data-testid="agent-task-minute"
								@update:model-value="onMinuteInput"
							/>
						</template>

						<N8nInput
							v-if="frequency === 'custom'"
							v-model="customCron"
							:placeholder="i18n.baseText('agents.builder.tasks.schedule.cron.placeholder')"
							:class="$style.cronInput"
							data-testid="agent-task-schedule-cron"
						/>
					</div>
					<N8nText v-if="nextOccurrenceText" :class="$style.help" size="small">
						{{
							i18n.baseText('agents.builder.tasks.schedule.nextOccurrence', {
								interpolate: { occurrence: nextOccurrenceText },
							})
						}}
					</N8nText>
					<N8nText v-if="visibleErrors.cron" :class="$style.error" size="small">
						{{ visibleErrors.cron }}
					</N8nText>
				</div>

				<N8nText
					v-if="showRepublishHint"
					:class="$style.help"
					size="small"
					data-testid="agent-task-republish-hint"
				>
					{{ i18n.baseText('agents.builder.tasks.republishHint') }}
				</N8nText>

				<N8nText v-if="errorMessage" :class="$style.error" size="small">
					{{ errorMessage }}
				</N8nText>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="isEditing"
					variant="subtle"
					:loading="deleting"
					data-testid="agent-task-delete"
					@click="onDelete"
				>
					<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
					{{ i18n.baseText('agents.builder.tasks.delete') }}
				</N8nButton>
				<div :class="$style.footerActions">
					<N8nButton variant="subtle" @click="closeModal">
						{{ i18n.baseText('agents.builder.tasks.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:disabled="!canSave"
						:loading="saving"
						data-testid="agent-task-save"
						@click="onSave"
					>
						{{ i18n.baseText('agents.builder.tasks.save') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-right: var(--spacing--xl);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/* Matches the height the skills instructions editor fills inside its modal. */
.objectiveEditor {
	height: 400px;
}

.scheduleRow {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.frequencySelect {
	width: 12rem;
}

.daySelect {
	width: 10rem;
}

.minuteInput {
	width: 6rem;
}

.cronInput {
	flex: 1;
	min-width: 12rem;
}

.timeSelect {
	width: 8rem;
}

.help {
	color: var(--color--text--tint-1);
}

.error {
	color: var(--color--danger);
}

.footer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}
</style>
