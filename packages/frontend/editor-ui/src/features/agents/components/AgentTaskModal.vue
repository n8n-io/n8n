<script setup lang="ts">
import {
	AGENT_TASK_NAME_MAX_LENGTH,
	AGENT_TASK_OBJECTIVE_MAX_LENGTH,
	StrictTimeZoneSchema,
	type AgentConfigValidationIssue,
	type AgentTaskDto,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nFormInput,
	N8nIcon,
	N8nInput,
	N8nMarkdownEditor,
	N8nOption,
	N8nSelect,
	N8nSwitch2,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IValidator, Validatable } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed, onMounted, ref, watch } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { createAgentTask, deleteAgentTask, updateAgentTask } from '../composables/useAgentApi';
import {
	buildCron,
	DEFAULT_SCHEDULE_PARTS,
	describeSchedule,
	formatScheduleDateTime,
	formatTimeOfDay,
	getNextScheduleOccurrence,
	parseCron,
	type ScheduleFrequency,
	weekdayLabel,
} from '../utils/scheduleBuilder';
import AgentPreviewButton from './AgentPreviewButton.vue';
import AgentModal from './modals/AgentModal.vue';

export type AgentTaskModalData = {
	projectId: string;
	agentId: string;
	ensureAgentPersisted?: () => Promise<void>;
	task?: AgentTaskDto | null;
	isPublished: boolean;
	isRunnable?: boolean;
	validationIssues?: AgentConfigValidationIssue[];
	taskState?: {
		enabled: boolean;
	};
	onToggle?: (payload: { id: string; enabled: boolean }) => void;
	onPreview?: (instructions: string) => void;
	onSaved: () => void;
};

type FrequencyOption = ScheduleFrequency | 'custom';

const props = defineProps<{
	modalName: string;
	data: AgentTaskModalData;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const task = computed(() => props.data.task ?? null);
const isEditing = computed(() => Boolean(task.value));
const scheduleTouched = ref(isEditing.value);
// Editing a task on a published agent only changes the live schedule on the
// next publish (see AgentTaskService), so warn before the edit silently no-ops.
const showRepublishHint = computed(() => isEditing.value && props.data.isPublished);
const enabled = ref(props.data.taskState?.enabled ?? true);
const deleting = ref(false);

const name = ref('');
const objective = ref('');
const frequency = ref<FrequencyOption>(DEFAULT_SCHEDULE_PARTS.frequency);
const minute = ref(DEFAULT_SCHEDULE_PARTS.minute);
const hour = ref(DEFAULT_SCHEDULE_PARTS.hour);
const dayOfWeek = ref(DEFAULT_SCHEDULE_PARTS.dayOfWeek);
const dayOfMonth = ref(DEFAULT_SCHEDULE_PARTS.dayOfMonth);
const customCron = ref('');
const timezone = ref(browserTimezone());
const timezoneOptions = ref<Array<{ value: string; label: string }>>([]);
// A task stored without a timezone follows the instance timezone. The selector has
// to show a concrete zone, so remember that the task was on the default and keep
// it there unless the user picks one — otherwise saving an unrelated edit would
// silently pin it, and a later instance timezone change would stop applying.
const followsInstanceTimezone = ref(false);
const saving = ref(false);
const errorMessage = ref('');
// Save is always clickable; clicking with invalid data reveals every field's
// error instead of silently no-op'ing behind a disabled button.
const saveAttempted = ref(false);
const objectiveTouched = ref(false);
// Non-custom frequencies always build a well-formed cron (see `cronExpression`
// below), so only the custom field's own validator can make this false.
const cronValid = ref(true);

/**
 * Zone a new task is authored in — the clock the user is actually reading. A host
 * that cannot determine its zone reports `Etc/Unknown`, which `Intl` itself then
 * refuses, so check against the same schema the API validates with and fall back
 * to the instance timezone rather than sending a value that cannot be saved.
 */
function browserTimezone(): string {
	const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	return StrictTimeZoneSchema.safeParse(browserZone).success ? browserZone : rootStore.timezone;
}

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
	name.value = current?.name ?? i18n.baseText('agents.builder.tasks.defaultName' as BaseTextKey);
	objective.value = current?.objective ?? '';
	// A task saved before schedules carried their own timezone runs in the
	// instance timezone, so keep showing that instead of the viewer's zone.
	// Absent and null both mean "no zone stored", so treat them alike.
	followsInstanceTimezone.value = current !== null && !current.timezone;
	timezone.value = current ? (current.timezone ?? rootStore.timezone) : browserTimezone();

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

// Snapshot of whether each field was already invalid when an existing task
// opened, so its error shows immediately instead of only after a touch/save.
// A pristine new-task field stays quiet until the user interacts with it.
const initialObjectiveInvalid = isEditing.value && !objective.value.trim();
const initialCronInvalid =
	isEditing.value && !getNextScheduleOccurrence(cronExpression.value, timezone.value);

const cronValidator: IValidator = {
	validate: (value: Validatable) =>
		getNextScheduleOccurrence(typeof value === 'string' ? value : '', timezone.value)
			? false
			: { message: i18n.baseText('agents.builder.tasks.validation.cronInvalid' as BaseTextKey) },
};

watch(frequency, (value) => {
	if (value !== 'custom') cronValid.value = true;
});

const frequencyOptions = computed<Array<{ label: string; value: FrequencyOption }>>(() => [
	{ value: 'hourly', label: i18n.baseText('agents.builder.tasks.schedule.frequency.hourly') },
	{ value: 'daily', label: i18n.baseText('agents.builder.tasks.schedule.frequency.daily') },
	{ value: 'weekly', label: i18n.baseText('agents.builder.tasks.schedule.frequency.weekly') },
	{ value: 'monthly', label: i18n.baseText('agents.builder.tasks.schedule.frequency.monthly') },
	{ value: 'custom', label: i18n.baseText('agents.builder.tasks.schedule.frequency.custom') },
]);

function onFrequencyChange(value: unknown) {
	const match = frequencyOptions.value.find((option) => option.value === value);
	if (match) {
		frequency.value = match.value;
		scheduleTouched.value = true;
	}
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
		scheduleTouched.value = true;
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
	scheduleTouched.value = true;
}

function onDayOfWeekChange(value: unknown) {
	dayOfWeek.value = Number(value);
	scheduleTouched.value = true;
}

function onDayOfMonthChange(value: unknown) {
	dayOfMonth.value = Number(value);
	scheduleTouched.value = true;
}

/**
 * Same timezone list the workflow settings offer. Kept renderable while it
 * loads (and if it fails) by always including the selected zone, since a
 * filterable select shows the raw value for an option it doesn't know.
 */
const timezoneSelectOptions = computed(() => {
	const options = timezoneOptions.value;
	if (options.some((option) => option.value === timezone.value)) return options;
	return [{ value: timezone.value, label: timezone.value }, ...options];
});

onMounted(async () => {
	try {
		const timezones = await settingsStore.getTimezones();
		timezoneOptions.value = Object.entries(timezones).map(([value, label]) => ({
			value,
			label: typeof label === 'string' ? label : value,
		}));
	} catch {
		// Selector keeps the current zone as its only option; saving still works.
	}
});

const nextOccurrenceText = computed(() => {
	if (!scheduleTouched.value) return '';
	const next = getNextScheduleOccurrence(cronExpression.value, timezone.value);
	if (!next) return '';
	return formatScheduleDateTime(next, timezone.value);
});

const scheduleDescription = computed(() => {
	if (frequency.value !== 'custom' || !nextOccurrenceText.value) return '';
	return describeSchedule(cronExpression.value) ?? '';
});

const executionSummary = computed(() => {
	if (!enabled.value && isEditing.value) {
		return i18n.baseText('agents.builder.tasks.schedule.executionPaused');
	}
	if (!nextOccurrenceText.value) return '';
	return i18n.baseText('agents.builder.tasks.schedule.nextOccurrence', {
		interpolate: { occurrence: nextOccurrenceText.value },
	});
});

const scheduleSummary = computed(() => {
	if (!scheduleDescription.value) return executionSummary.value;
	return i18n.baseText('agents.builder.tasks.schedule.summary', {
		interpolate: {
			description: scheduleDescription.value,
			execution: executionSummary.value,
		},
	});
});

const objectiveError = computed(() => {
	if (!objective.value.trim()) {
		return i18n.baseText('agents.builder.tasks.validation.objectiveRequired');
	}
	if (objective.value.trim().length > AGENT_TASK_OBJECTIVE_MAX_LENGTH) {
		return i18n.baseText('agents.builder.tasks.validation.objectiveMaxLength' as BaseTextKey, {
			interpolate: { max: String(AGENT_TASK_OBJECTIVE_MAX_LENGTH) },
		});
	}
	return '';
});
const visibleObjectiveError = computed(() =>
	saveAttempted.value || initialObjectiveInvalid || objectiveTouched.value
		? objectiveError.value
		: '',
);

const nameError = computed(() => {
	if (!name.value.trim()) {
		return i18n.baseText('agents.builder.tasks.validation.nameRequired');
	}
	if (name.value.trim().length > AGENT_TASK_NAME_MAX_LENGTH) {
		return i18n.baseText('agents.builder.tasks.validation.nameMaxLength' as BaseTextKey, {
			interpolate: { max: String(AGENT_TASK_NAME_MAX_LENGTH) },
		});
	}
	return '';
});
const visibleNameError = computed(() => (saveAttempted.value ? nameError.value : ''));

const canSave = computed(
	() => !nameError.value && !objectiveError.value && cronValid.value && !saving.value,
);

function onObjectiveInput(value: string) {
	objective.value = value;
	objectiveTouched.value = true;
}

function onCronInput(value: Validatable) {
	customCron.value = typeof value === 'string' ? value : '';
	scheduleTouched.value = true;
}

function onTimezoneChange(value: unknown) {
	timezone.value = String(value);
	followsInstanceTimezone.value = false;
	scheduleTouched.value = true;
}

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function onToggleEnabled(value: boolean) {
	const current = task.value;
	if (!current) return;
	enabled.value = value;
	props.data.onToggle?.({ id: current.id, enabled: value });
}

function onPauseToggle(paused: boolean) {
	onToggleEnabled(!paused);
}

function onPreview() {
	objectiveTouched.value = true;
	if (objectiveError.value || !props.data.onPreview) return;

	closeModal();
	props.data.onPreview(objective.value.trim());
}

async function onDelete() {
	const current = task.value;
	if (!current || deleting.value) return;

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
				: i18n.baseText('agents.builder.tasks.removeError' as BaseTextKey);
	} finally {
		deleting.value = false;
	}
}

async function onSave() {
	saveAttempted.value = true;
	if (!canSave.value) return;

	saving.value = true;
	errorMessage.value = '';

	const base = {
		name: name.value.trim(),
		objective: objective.value.trim(),
		cronExpression: cronExpression.value,
		timezone: followsInstanceTimezone.value ? null : timezone.value,
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
			/** Save the agent only on submit, so closing does not create an empty agent. */
			await props.data.ensureAgentPersisted?.();
			/** New tasks start running once the agent is published. */
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
	<AgentModal
		:open="modalOpen"
		:title="name"
		:title-placeholder="i18n.baseText('agents.builder.tasks.name.placeholder')"
		:title-max-length="AGENT_TASK_NAME_MAX_LENGTH"
		:title-error="visibleNameError"
		:busy="saving || deleting"
		editable-title
		data-testid="agent-task-modal"
		@update:open="!$event && closeModal()"
		@update:title="name = $event"
	>
		<div :class="$style.content">
			<div :class="$style.field">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.builder.tasks.objective.label') }}
					<N8nText color="primary" bold size="small">*</N8nText>
				</N8nText>
				<N8nMarkdownEditor
					:class="$style.objectiveEditor"
					:model-value="objective"
					:placeholder="i18n.baseText('agents.builder.tasks.objective.placeholder')"
					show-toolbar="floating"
					max-height="100%"
					data-testid="agent-task-objective-input"
					@update:model-value="onObjectiveInput"
				/>
				<N8nText v-if="visibleObjectiveError" :class="$style.error" size="small">
					{{ visibleObjectiveError }}
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
							@update:model-value="onDayOfWeekChange"
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
							@update:model-value="onDayOfMonthChange"
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

					<N8nFormInput
						v-if="frequency === 'custom'"
						:model-value="customCron"
						label=""
						name="task-cron"
						required
						:placeholder="i18n.baseText('agents.builder.tasks.schedule.cron.placeholder')"
						:validators="{ VALID_CRON: cronValidator }"
						:validation-rules="[{ name: 'VALID_CRON' }]"
						:show-validation-warnings="saveAttempted || initialCronInvalid"
						:class="$style.cronInput"
						data-testid="agent-task-schedule-cron"
						@update:model-value="onCronInput"
						@validate="cronValid = $event"
					/>

					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.tasks.schedule.in') }}
					</N8nText>
					<N8nSelect
						:model-value="timezone"
						:class="$style.timezoneSelect"
						:placeholder="i18n.baseText('agents.builder.tasks.schedule.timezone.placeholder')"
						filterable
						:limit-popper-width="true"
						data-testid="agent-task-timezone"
						@update:model-value="onTimezoneChange"
					>
						<N8nOption
							v-for="option in timezoneSelectOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</div>
				<div v-if="scheduleSummary" :class="$style.scheduleSummary">
					<N8nText :class="$style.help" size="small">
						{{ scheduleSummary }}
					</N8nText>
					<N8nTooltip
						v-if="showRepublishHint"
						:content="i18n.baseText('agents.builder.tasks.republishHint')"
						placement="top"
					>
						<span
							:class="$style.infoIcon"
							:aria-label="i18n.baseText('agents.builder.tasks.republishHint')"
							tabindex="0"
						>
							<N8nIcon icon="info" size="small" />
						</span>
					</N8nTooltip>
				</div>
			</div>

			<div v-if="isEditing" :class="$style.pauseControl" data-testid="agent-task-pause-control">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.builder.tasks.pause') }}
				</N8nText>
				<N8nSwitch2
					:model-value="!enabled"
					:aria-label="i18n.baseText('agents.builder.tasks.pause')"
					data-testid="agent-task-toggle"
					@update:model-value="(paused) => onPauseToggle(Boolean(paused))"
				/>
			</div>

			<N8nText v-if="errorMessage" :class="$style.error" size="small">
				{{ errorMessage }}
			</N8nText>
		</div>

		<template v-if="isEditing" #footerLeft>
			<N8nButton
				variant="ghost"
				:loading="deleting"
				data-testid="agent-task-delete"
				@click="onDelete"
			>
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ i18n.baseText('agents.builder.tasks.delete') }}
			</N8nButton>
		</template>
		<template #footerActions>
			<AgentPreviewButton
				:is-runnable="props.data.isRunnable === true"
				:validation-issues="props.data.validationIssues ?? []"
				test-id="agent-task-preview"
				@open-preview="onPreview"
			/>
			<N8nButton
				variant="solid"
				:disabled="saving"
				:loading="saving"
				data-testid="agent-task-save"
				@click="onSave"
			>
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module>
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

.objectiveEditor {
	height: min(36dvh, calc(var(--height--5xl) * 3));
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

.timezoneSelect {
	width: 14rem;
}

.scheduleSummary {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.infoIcon {
	display: inline-flex;
	color: var(--color--text--tint-1);
	cursor: help;
}

.help {
	color: var(--color--text--tint-1);
}

.error {
	color: var(--color--danger);
}

.pauseControl {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
