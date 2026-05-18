<script setup lang="ts">
import type { AgentTaskDto } from '@n8n/api-types';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nRadioButtons,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import {
	createAgentTask,
	deleteAgentTask,
	listAgentTasks,
	runAgentTask,
	updateAgentTask,
} from '../composables/useAgentApi';
import {
	getNextScheduleOccurrence,
	getScheduleInputMode,
	getSchedulePresetByCronExpression,
	schedulePresets,
	type ScheduleInputMode,
} from '../utils/schedulePresets';

export type AgentTasksModalData = {
	projectId: string;
	agentId: string;
	isPublished: boolean;
	tasks: AgentTaskDto[];
	focusTaskId?: string;
	onTasksChanged: (tasks: AgentTaskDto[]) => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentTasksModalData;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();
const toast = useToast();

const tasks = ref<AgentTaskDto[]>(props.data.tasks ?? []);
const selectedTaskId = ref<string | null>(props.data.focusTaskId ?? null);
const name = ref('');
const goal = ref('');
const cronExpression = ref(schedulePresets[1]?.cronExpression ?? '0 9 * * *');
const active = ref(false);
const scheduleInputMode = ref<ScheduleInputMode>('preset');
const lastCustomCronExpression = ref('');
const loading = ref(false);
const saving = ref(false);
const runningTaskId = ref<string | null>(null);
const submitted = ref(false);
const errorMessage = ref('');

const selectedTask = computed(() =>
	selectedTaskId.value ? tasks.value.find((task) => task.id === selectedTaskId.value) : null,
);
const isEditing = computed(() => selectedTask.value !== null);
const scheduleInputModeOptions = computed<Array<{ label: string; value: ScheduleInputMode }>>(
	() => [
		{ label: i18n.baseText('agents.tasks.cron.mode.preset' as BaseTextKey), value: 'preset' },
		{ label: i18n.baseText('agents.tasks.cron.mode.custom' as BaseTextKey), value: 'custom' },
	],
);
const schedulePresetOptions = computed(() =>
	schedulePresets.map((preset) => ({
		label: i18n.baseText(preset.labelKey as BaseTextKey),
		value: preset.cronExpression,
	})),
);
const selectedPresetCronExpression = computed(
	() => getSchedulePresetByCronExpression(cronExpression.value)?.cronExpression ?? '',
);
const nextScheduleOccurrence = computed(() =>
	getNextScheduleOccurrence(cronExpression.value, rootStore.timezone),
);
const nextScheduleOccurrenceText = computed(() => {
	if (!nextScheduleOccurrence.value) return '';

	return new Intl.DateTimeFormat(undefined, {
		timeZone: rootStore.timezone,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: 'numeric',
		minute: '2-digit',
	}).format(nextScheduleOccurrence.value);
});
const cronError = computed(() => {
	if (!submitted.value) return '';
	if (cronExpression.value.trim() === '')
		return i18n.baseText('agents.tasks.validation.cronRequired');
	if (!nextScheduleOccurrence.value) return i18n.baseText('agents.tasks.validation.cronInvalid');
	return '';
});
const canSave = computed(
	() =>
		name.value.trim() !== '' &&
		goal.value.trim() !== '' &&
		cronExpression.value.trim() !== '' &&
		!!nextScheduleOccurrence.value &&
		(!active.value || props.data.isPublished) &&
		!loading.value &&
		!saving.value,
);

function applyTask(task: AgentTaskDto | null) {
	submitted.value = false;
	errorMessage.value = '';

	if (!task) {
		name.value = '';
		goal.value = '';
		cronExpression.value = schedulePresets[1]?.cronExpression ?? '0 9 * * *';
		active.value = false;
		scheduleInputMode.value = 'preset';
		lastCustomCronExpression.value = '';
		return;
	}

	name.value = task.name;
	goal.value = task.goal;
	cronExpression.value = task.cronExpression;
	active.value = task.active;
	scheduleInputMode.value = getScheduleInputMode(task.cronExpression);
	lastCustomCronExpression.value = scheduleInputMode.value === 'custom' ? task.cronExpression : '';
}

function selectTask(taskId: string | null) {
	selectedTaskId.value = taskId;
	applyTask(taskId ? (tasks.value.find((task) => task.id === taskId) ?? null) : null);
}

async function refreshTasks() {
	const nextTasks = await listAgentTasks(
		rootStore.restApiContext,
		props.data.projectId,
		props.data.agentId,
	);
	tasks.value = nextTasks;
	props.data.onTasksChanged(nextTasks);
	if (selectedTaskId.value && !nextTasks.some((task) => task.id === selectedTaskId.value)) {
		selectTask(null);
	}
}

async function loadTasks() {
	loading.value = true;
	errorMessage.value = '';
	try {
		await refreshTasks();
		if (props.data.focusTaskId && tasks.value.some((task) => task.id === props.data.focusTaskId)) {
			selectTask(props.data.focusTaskId);
		} else {
			selectTask(null);
		}
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : i18n.baseText('agents.tasks.loadError');
	} finally {
		loading.value = false;
	}
}

async function onSave() {
	submitted.value = true;
	if (!canSave.value) return;

	saving.value = true;
	errorMessage.value = '';
	const payload = {
		name: name.value.trim(),
		goal: goal.value.trim(),
		cronExpression: cronExpression.value.trim(),
		active: active.value,
	};

	try {
		const saved = selectedTaskId.value
			? await updateAgentTask(
					rootStore.restApiContext,
					props.data.projectId,
					props.data.agentId,
					selectedTaskId.value,
					payload,
				)
			: await createAgentTask(
					rootStore.restApiContext,
					props.data.projectId,
					props.data.agentId,
					payload,
				);
		await refreshTasks();
		selectTask(saved.id);
		toast.showMessage({
			title: i18n.baseText('agents.tasks.saved'),
			type: 'success',
		});
		closeModal();
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : i18n.baseText('agents.tasks.saveError');
	} finally {
		saving.value = false;
	}
}

async function onDelete() {
	if (!selectedTaskId.value) return;
	const taskId = selectedTaskId.value;
	saving.value = true;
	errorMessage.value = '';
	try {
		await deleteAgentTask(
			rootStore.restApiContext,
			props.data.projectId,
			props.data.agentId,
			taskId,
		);
		await refreshTasks();
		selectTask(null);
		toast.showMessage({
			title: i18n.baseText('agents.tasks.deleted'),
			type: 'success',
		});
		closeModal();
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : i18n.baseText('agents.tasks.deleteError');
	} finally {
		saving.value = false;
	}
}

async function onRunNow(task: AgentTaskDto) {
	runningTaskId.value = task.id;
	errorMessage.value = '';
	try {
		await runAgentTask(rootStore.restApiContext, props.data.projectId, props.data.agentId, task.id);
		await refreshTasks();
		toast.showMessage({
			title: i18n.baseText('agents.tasks.runStarted'),
			type: 'success',
		});
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : i18n.baseText('agents.tasks.runError');
	} finally {
		runningTaskId.value = null;
	}
}

function onScheduleInputModeInput(value: ScheduleInputMode) {
	scheduleInputMode.value = value;
	if (value === 'preset') {
		if (schedulePresets[1]) cronExpression.value = schedulePresets[1].cronExpression;
		return;
	}
	cronExpression.value = lastCustomCronExpression.value || cronExpression.value;
}

function onSchedulePresetInput(value: string) {
	cronExpression.value = value;
}

function onCronExpressionInput(value: string | number) {
	const nextValue = String(value);
	cronExpression.value = nextValue;
	lastCustomCronExpression.value = nextValue;
}

function closeModal() {
	uiStore.closeModal(props.modalName);
}

onMounted(() => {
	void loadTasks();
});
</script>

<template>
	<Modal
		:name="props.modalName"
		width="860px"
		:custom-class="$style.modal"
		data-testid="agent-tasks-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('agents.tasks.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<div :class="$style.content">
				<div :class="$style.form">
					<div :class="$style.formHeader">
						<N8nHeading tag="h3" size="medium">
							{{
								isEditing
									? i18n.baseText('agents.tasks.editTitle')
									: i18n.baseText('agents.tasks.createTitle')
							}}
						</N8nHeading>
						<N8nButton
							v-if="selectedTask"
							variant="outline"
							size="small"
							:disabled="!data.isPublished || runningTaskId === selectedTask.id"
							:loading="runningTaskId === selectedTask.id"
							data-testid="agent-task-run-now"
							@click="onRunNow(selectedTask)"
						>
							<template #icon><N8nIcon icon="play" :size="14" /></template>
							{{ i18n.baseText('agents.tasks.runNow') }}
						</N8nButton>
					</div>

					<div :class="$style.field">
						<N8nText size="small" bold>{{ i18n.baseText('agents.tasks.name.label') }}</N8nText>
						<N8nInput
							:model-value="name"
							:disabled="loading || saving"
							:placeholder="i18n.baseText('agents.tasks.name.placeholder')"
							data-testid="agent-task-name"
							@update:model-value="(value) => (name = String(value))"
						/>
					</div>

					<div :class="$style.field">
						<N8nText size="small" bold>{{ i18n.baseText('agents.tasks.goal.label') }}</N8nText>
						<N8nInput
							:model-value="goal"
							type="textarea"
							:rows="5"
							:disabled="loading || saving"
							:placeholder="i18n.baseText('agents.tasks.goal.placeholder')"
							data-testid="agent-task-goal"
							@update:model-value="(value) => (goal = String(value))"
						/>
					</div>

					<div :class="$style.toggleRow">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.tasks.status.active') }}
						</N8nText>
						<N8nSwitch2
							:model-value="active"
							:disabled="loading || saving"
							data-testid="agent-task-active-toggle"
							@update:model-value="(value) => (active = Boolean(value))"
						/>
					</div>

					<div :class="$style.field">
						<div :class="$style.fieldHeader">
							<N8nText size="small" bold>{{ i18n.baseText('agents.tasks.cron') }}</N8nText>
							<N8nRadioButtons
								:model-value="scheduleInputMode"
								:options="scheduleInputModeOptions"
								size="small"
								:disabled="loading || saving"
								data-testid="agent-task-cron-mode"
								@update:model-value="onScheduleInputModeInput"
							/>
						</div>

						<N8nSelect
							v-if="scheduleInputMode === 'preset'"
							:model-value="selectedPresetCronExpression"
							:disabled="loading || saving"
							:class="$style.cronSelect"
							size="small"
							data-testid="agent-task-preset"
							@update:model-value="onSchedulePresetInput"
						>
							<N8nOption
								v-for="preset in schedulePresetOptions"
								:key="preset.value"
								:value="preset.value"
								:label="preset.label"
							/>
						</N8nSelect>
						<N8nInput
							v-else
							size="medium"
							:model-value="cronExpression"
							:disabled="loading || saving"
							:placeholder="i18n.baseText('agents.tasks.cron.placeholder')"
							data-testid="agent-task-cron"
							@update:model-value="onCronExpressionInput"
						/>

						<N8nText v-if="nextScheduleOccurrenceText" :class="$style.helpText" size="small">
							{{
								i18n.baseText('agents.tasks.nextOccurrence' as BaseTextKey, {
									interpolate: { occurrence: nextScheduleOccurrenceText },
								})
							}}
						</N8nText>
						<N8nText v-if="cronError" :class="$style.errorText" size="small">
							{{ cronError }}
						</N8nText>
					</div>

					<N8nText v-if="active && !data.isPublished" :class="$style.helpText" size="small">
						{{ i18n.baseText('agents.tasks.publishRequired') }}
					</N8nText>

					<N8nText v-if="errorMessage" :class="$style.errorText" size="small">
						{{ errorMessage }}
					</N8nText>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="isEditing"
					variant="destructive"
					:disabled="saving"
					data-testid="agent-task-delete"
					@click="onDelete"
				>
					<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
					{{ i18n.baseText('agents.tasks.delete') }}
				</N8nButton>
				<div :class="$style.footerActions">
					<N8nButton variant="subtle" @click="closeModal">
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:disabled="!canSave"
						:loading="saving"
						data-testid="agent-task-save"
						@click="onSave"
					>
						{{ i18n.baseText('generic.save') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module>
.modal {
	:global(.modal-content) {
		overflow: hidden;
	}
}

.content {
	min-height: 34rem;
	margin: calc(-1 * var(--spacing--lg));
	padding: var(--spacing--lg);
}

.helpText {
	color: var(--color--text--tint-1);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}

.formHeader,
.fieldHeader,
.toggleRow,
.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.cronSelect {
	height: var(--height--md);

	:global(.el-input--small .el-input__inner) {
		height: var(--height--md);
	}
}

.errorText {
	color: var(--color--danger);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}
</style>
