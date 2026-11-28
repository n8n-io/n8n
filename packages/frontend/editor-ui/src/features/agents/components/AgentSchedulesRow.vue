<script setup lang="ts">
import type { AgentConfigValidationIssue, AgentJsonTaskConfig } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';
import { useAgentTasks, type AgentTaskRow } from '../composables/useAgentTasks';
import type { AgentTaskTestRequest } from '../types';
import { describeSchedule, getNextScheduleOccurrence } from '../utils/scheduleBuilder';
import AgentChipButton from './AgentChipButton.vue';
import AgentItemContextMenu from './AgentItemContextMenu.vue';
import AgentValidationTooltip from './AgentValidationTooltip.vue';

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
		previewDisabledReason?: string;
		/** Hides the add buttons, for when the parent supplies its own. */
		hideAdd?: boolean;
	}>(),
	{
		hideAdd: false,
		taskRefs: () => [],
		disabled: false,
		isRunnable: false,
		validationIssues: () => [],
	},
);

const emit = defineEmits<{
	'toggle-task': [payload: { id: string; enabled: boolean }];
	'tasks-changed': [];
	'preview-task': [request: AgentTaskTestRequest];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const { taskRows, taskErrorMessage, removingTaskId, toggleTask, removeTask, openTaskModal } =
	useAgentTasks({
		projectId: () => props.projectId,
		agentId: () => props.agentId,
		taskRefs: () => props.taskRefs,
		validationIssues: () => props.validationIssues,
		disabled: () => props.disabled,
		isPublished: () => props.isPublished,
		isRunnable: () => props.isRunnable,
		reloadKey: () => props.reloadKey,
		agentUnsaved: () => props.agentUnsaved,
		previewDisabledReason: () => props.previewDisabledReason,
		getEnsureAgentPersisted: () => props.ensureAgentPersisted,
		onToggle: (payload) => emit('toggle-task', payload),
		onChanged: () => emit('tasks-changed'),
		onPreview: (request) => emit('preview-task', request),
	});

// Same readiness rules as the Test button beside the agent title.
const testDisabled = computed(() => !props.isRunnable || Boolean(props.previewDisabledReason));
const testTooltip = computed(() =>
	testDisabled.value
		? (props.previewDisabledReason ?? i18n.baseText('agents.builder.preview.disabledTooltip'))
		: i18n.baseText('agents.builder.tasks.test.tooltip'),
);

function testTask(task: AgentTaskRow) {
	if (props.disabled || testDisabled.value || removingTaskId.value !== null) return;
	emit('preview-task', { objective: task.objective, taskId: task.id, source: 'schedule' });
}

function taskScheduleTooltip(task: AgentTaskRow): string {
	const timezone = task.timezone ?? rootStore.timezone;
	const description = getNextScheduleOccurrence(task.cronExpression, timezone)
		? describeSchedule(task.cronExpression)
		: null;

	if (!description) {
		return i18n.baseText('agents.builder.tasks.schedule.invalidDescription' as BaseTextKey);
	}

	return description;
}

/** Opens the modal to create a new schedule. */
function openAddSchedule() {
	openTaskModal(null);
}

defineExpose({ openAddSchedule });
</script>

<template>
	<div v-if="!props.hideAdd || taskRows.length > 0 || taskErrorMessage" :class="$style.scheduleRow">
		<N8nText v-if="taskRows.length > 0" bold :class="$style.rowLabel">
			{{ i18n.baseText('agents.builder.tasks.title') }}
		</N8nText>

		<div :class="$style.chips">
			<div v-for="(task, taskIndex) in taskRows" :key="task.id" :class="$style.chipGroup">
				<AgentItemContextMenu
					:disabled="props.disabled || removingTaskId !== null"
					:enabled="task.enabled"
					:testable="!testDisabled"
					:test-disabled-reason="testDisabled ? testTooltip : undefined"
					@update:enabled="toggleTask(task, $event)"
					@remove="removeTask(task)"
					@test="testTask(task)"
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

				<AgentValidationTooltip
					:disabled="false"
					:fallback="testTooltip"
					action="preview"
					:issues="testDisabled && !props.previewDisabledReason ? props.validationIssues : []"
				>
					<N8nButton
						variant="ghost"
						size="medium"
						icon-only
						:disabled="props.disabled || testDisabled || removingTaskId !== null"
						focusable-when-disabled
						:aria-label="
							i18n.baseText('agents.builder.tasks.test.ariaLabel', {
								interpolate: { name: task.name },
							})
						"
						data-testid="agent-capabilities-test-task"
						data-attr="agent-capabilities-test-task"
						@click="testTask(task)"
					>
						<template #icon>
							<N8nIcon icon="flask-conical" :size="16" color="text-light" />
						</template>
					</N8nButton>
				</AgentValidationTooltip>

				<N8nTooltip
					v-if="!props.hideAdd && taskIndex === taskRows.length - 1"
					as-child
					:content="i18n.baseText('agents.builder.tasks.add')"
					placement="top"
				>
					<N8nButton
						variant="ghost"
						size="medium"
						icon-only
						:disabled="props.disabled"
						focusable-when-disabled
						:aria-label="i18n.baseText('agents.builder.tasks.add')"
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
				v-if="!props.hideAdd && taskRows.length === 0"
				:class="$style.addButtonEmpty"
				variant="ghost"
				size="medium"
				:disabled="props.disabled"
				data-testid="agent-capabilities-add-task"
				@click="openTaskModal(null)"
			>
				<template #icon>
					<N8nIcon icon="plus" :size="16" />
				</template>
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
	opacity: var(--agent-row-label-opacity, 1);
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
