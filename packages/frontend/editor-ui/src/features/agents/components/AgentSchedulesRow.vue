<script setup lang="ts">
import type { AgentConfigValidationIssue, AgentJsonTaskConfig, AgentTaskDto } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { deleteAgentTask, getAgentTasks } from '../composables/useAgentApi';
import { AGENT_TASK_MODAL_KEY } from '../constants';
import { describeSchedule, getNextScheduleOccurrence } from '../utils/scheduleBuilder';
import AgentChipButton from './AgentChipButton.vue';
import AgentItemContextMenu from './AgentItemContextMenu.vue';

const props = withDefaults(
	defineProps<{
		taskRefs?: AgentJsonTaskConfig[];
		disabled?: boolean;
		projectId: string;
		agentId: string;
		isPublished: boolean;
		isRunnable?: boolean;
		reloadKey?: number;
		/** No agent row exists yet, so an unsaved agent has no tasks to load. */
		agentUnsaved?: boolean;
		ensureAgentPersisted?: () => Promise<void>;
		validationIssues?: AgentConfigValidationIssue[];
	}>(),
	{
		taskRefs: () => [],
		disabled: false,
		isRunnable: false,
		validationIssues: () => [],
	},
);

const emit = defineEmits<{
	'toggle-task': [payload: { id: string; enabled: boolean }];
	'tasks-changed': [];
	'preview-task': [instructions: string];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();
const toast = useToast();

const taskBodies = ref<AgentTaskDto[]>([]);
const taskErrorMessage = ref('');
const removingTaskId = ref<string | null>(null);
let active = true;

onBeforeUnmount(() => {
	active = false;
});

function isCurrentAgent(projectId: string, agentId: string) {
	return active && props.projectId === projectId && props.agentId === agentId;
}

type TaskRow = AgentTaskDto & {
	enabled: boolean;
	invalid: boolean;
	invalidReasons: string[];
};

const ISSUE_KEYS: Record<AgentConfigValidationIssue['code'], BaseTextKey> = {
	missing_required: 'agents.builder.validation.issue.missingRequired' as BaseTextKey,
	invalid_value: 'agents.builder.validation.issue.task.invalidValue' as BaseTextKey,
	missing_credential: 'agents.builder.validation.issue.missingCredential' as BaseTextKey,
	invalid_credential: 'agents.builder.validation.issue.invalidCredential' as BaseTextKey,
	incompatible_credential: 'agents.builder.validation.issue.incompatibleCredential' as BaseTextKey,
	missing_reference: 'agents.builder.validation.issue.missingReference' as BaseTextKey,
	incompatible_reference: 'agents.builder.validation.issue.incompatibleReference' as BaseTextKey,
};

const taskIssueMessages = computed(() => {
	const messages = new Map<string, string[]>();
	for (const issue of props.validationIssues) {
		if (issue.capability.kind !== 'task' || !issue.capability.id) continue;
		const message = i18n.baseText(ISSUE_KEYS[issue.code], {
			interpolate: { id: issue.capability.id },
		});
		messages.set(issue.capability.id, [
			...new Set([...(messages.get(issue.capability.id) ?? []), message]),
		]);
	}
	return messages;
});

const taskRows = computed<TaskRow[]>(() => {
	const refsById = new Map(props.taskRefs.map((taskRef) => [taskRef.id, taskRef]));
	return taskBodies.value.map((body) => {
		const taskRef = refsById.get(body.id);
		const invalidReasons = taskIssueMessages.value.get(body.id) ?? [];
		return {
			...body,
			enabled: taskRef?.enabled ?? true,
			invalid: invalidReasons.length > 0,
			invalidReasons,
		};
	});
});

async function reloadTasks() {
	const { projectId, agentId } = props;
	taskErrorMessage.value = '';
	if (props.agentUnsaved) {
		taskBodies.value = [];
		return;
	}

	try {
		const tasks = await getAgentTasks(rootStore.restApiContext, projectId, agentId);
		if (isCurrentAgent(projectId, agentId)) taskBodies.value = tasks;
	} catch (error) {
		if (!isCurrentAgent(projectId, agentId)) return;
		taskErrorMessage.value =
			error instanceof Error && error.message
				? error.message
				: i18n.baseText('agents.builder.tasks.loadError');
	}
}

function onTasksChanged() {
	void reloadTasks();
	emit('tasks-changed');
}

function toggleTask(task: TaskRow, enabled: boolean) {
	if (props.disabled || removingTaskId.value) return;
	emit('toggle-task', { id: task.id, enabled });
}

async function removeTask(task: TaskRow) {
	if (props.disabled || removingTaskId.value) return;
	const { projectId, agentId } = props;
	removingTaskId.value = task.id;
	try {
		await deleteAgentTask(rootStore.restApiContext, projectId, agentId, task.id);
		if (!isCurrentAgent(projectId, agentId)) return;
		taskBodies.value = taskBodies.value.filter(({ id }) => id !== task.id);
		onTasksChanged();
	} catch (error) {
		if (isCurrentAgent(projectId, agentId)) {
			toast.showError(error, i18n.baseText('agents.builder.tasks.removeError'));
		}
	} finally {
		removingTaskId.value = null;
	}
}

function openTaskModal(task: TaskRow | null) {
	const { projectId, agentId } = props;
	uiStore.openModalWithData({
		name: AGENT_TASK_MODAL_KEY,
		data: {
			projectId: props.projectId,
			agentId: props.agentId,
			ensureAgentPersisted: props.ensureAgentPersisted,
			task,
			isPublished: props.isPublished,
			isRunnable: props.isRunnable,
			validationIssues: props.validationIssues,
			taskState: task
				? {
						enabled: task.enabled,
					}
				: undefined,
			onPreview: (instructions: string) => emit('preview-task', instructions),
			onSaved: () => {
				if (isCurrentAgent(projectId, agentId)) onTasksChanged();
			},
		},
	});
}

function taskScheduleTooltip(task: TaskRow): string {
	const timezone = task.timezone ?? rootStore.timezone;
	const description = getNextScheduleOccurrence(task.cronExpression, timezone)
		? describeSchedule(task.cronExpression)
		: null;

	if (!description) {
		return i18n.baseText('agents.builder.tasks.schedule.invalidDescription' as BaseTextKey);
	}

	return description;
}

onMounted(reloadTasks);

watch(
	[
		toRef(props, 'reloadKey'),
		toRef(props, 'projectId'),
		toRef(props, 'agentId'),
		toRef(props, 'agentUnsaved'),
	],
	reloadTasks,
);
</script>

<template>
	<div :class="$style.scheduleRow" :inert="props.disabled || undefined">
		<N8nText v-if="taskRows.length > 0" bold :class="$style.rowLabel">
			{{ i18n.baseText('agents.builder.tasks.title') }}
		</N8nText>

		<div :class="$style.chips">
			<div v-for="(task, taskIndex) in taskRows" :key="task.id" :class="$style.chipGroup">
				<AgentItemContextMenu
					:disabled="props.disabled || removingTaskId !== null"
					:enabled="task.enabled"
					@update:enabled="toggleTask(task, $event)"
					@remove="removeTask(task)"
				>
					<N8nTooltip :content="taskScheduleTooltip(task)" placement="top" as-child>
						<AgentChipButton
							icon="clipboard-list"
							:deactivated="!task.enabled"
							:invalid="task.invalid"
							:invalid-reasons="task.invalidReasons"
							:disabled="props.disabled || removingTaskId === task.id"
							:class="$style.scheduleChip"
							data-testid="agent-capabilities-task-row"
							@click="openTaskModal(task)"
						>
							{{ task.name }}
						</AgentChipButton>
					</N8nTooltip>
				</AgentItemContextMenu>

				<N8nTooltip
					v-if="taskIndex === taskRows.length - 1"
					:content="i18n.baseText('agents.builder.tasks.add')"
					placement="top"
				>
					<N8nButton
						variant="ghost"
						size="medium"
						icon-only
						:disabled="props.disabled"
						data-testid="agent-capabilities-add-task"
						@click="openTaskModal(null)"
					>
						<template #icon>
							<N8nIcon icon="plus" :size="16" color="text-light" />
						</template>
					</N8nButton>
				</N8nTooltip>
			</div>

			<N8nButton
				v-if="taskRows.length === 0"
				:class="$style.addButtonEmpty"
				variant="ghost"
				size="medium"
				:disabled="props.disabled"
				data-testid="agent-capabilities-add-task"
				@click="openTaskModal(null)"
			>
				{{ i18n.baseText('agents.builder.tasks.add') }}
			</N8nButton>

			<N8nText v-if="taskErrorMessage" size="small" :class="$style.error">
				{{ taskErrorMessage }}
			</N8nText>
		</div>
	</div>
</template>

<style module lang="scss">
.scheduleRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.rowLabel {
	--n8n--row-label-width: max(7%, calc(var(--spacing--3xl) + var(--spacing--sm)));
	flex: 0 0 var(--n8n--row-label-width);
	line-height: var(--line-height--sm);
	margin-top: var(--spacing--3xs);
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	flex: 1;
	min-width: 0;
}

.chipGroup {
	display: inline-flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: var(--spacing--3xs);
	min-width: 0;
	max-width: min(var(--spacing--5xl), 100%);
}

.scheduleChip {
	flex: 1 1 auto;
	min-width: 0;
}

.addButtonEmpty {
	--button--color: var(--text-color--subtler);
	margin-left: calc(-1 * var(--spacing--xs));
	margin-top: calc(-1 * var(--spacing--4xs));

	/** TODO: Consider making this style a generic N8nButton style. DS-652 **/
	&:hover {
		--button--color: var(--text-color);
		background-color: transparent;
	}
}

.error {
	color: var(--color--danger);
}

@media (max-width: 768px) {
	.scheduleRow {
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.rowLabel {
		flex-basis: auto;
		line-height: var(--line-height--sm);
	}
}
</style>
