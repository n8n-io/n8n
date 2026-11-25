<script setup lang="ts">
import {
	N8N_CHAT_INTEGRATION_TYPE,
	type AgentConfigValidationIssue,
	type AgentJsonTaskConfig,
} from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nSwitch2, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAgentTasks, type AgentTaskRow } from '../composables/useAgentTasks';
import { describeSchedule, summarizeSchedule } from '../utils/scheduleBuilder';
import type { AgentTriggerChannelItem } from './AgentTriggersList.types';

const props = withDefaults(
	defineProps<{
		channels: AgentTriggerChannelItem[];
		projectId: string;
		agentId: string;
		agentName?: string;
		disabled?: boolean;
		removingChannel?: boolean;
		taskRefs?: AgentJsonTaskConfig[];
		isPublished?: boolean;
		isRunnable?: boolean;
		reloadKey?: number;
		agentUnsaved?: boolean;
		ensureAgentPersisted?: () => Promise<void>;
		validationIssues?: AgentConfigValidationIssue[];
		previewDisabledReason?: string;
	}>(),
	{
		disabled: false,
		removingChannel: false,
		taskRefs: () => [],
		isPublished: false,
		isRunnable: false,
		validationIssues: () => [],
		ensureAgentPersisted: undefined,
	},
);

const emit = defineEmits<{
	'open-channel': [payload: { type: string; connected: boolean }];
	'add-channel': [];
	'toggle-channel': [payload: { type: string; enabled: boolean }];
	'toggle-task': [payload: { id: string; enabled: boolean }];
	'tasks-changed': [];
	'preview-task': [instructions: string];
	'open-task': [task: AgentTaskRow];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const { taskRows, taskErrorMessage, removingTaskId, toggleTask, reloadTasks } = useAgentTasks({
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
	onPreview: (instructions) => emit('preview-task', instructions),
});

/**
 * How users reach the agent leads when the channel has a mention model. Else the
 * credential name says which account the channel uses.
 */
function channelTitle(channel: AgentTriggerChannelItem) {
	if (isN8nChat(channel)) {
		const agentName = props.agentName?.trim();
		return agentName
			? i18n.baseText('agents.builder.triggers.channel.newChatWith', {
					interpolate: { agent: agentName },
				})
			: i18n.baseText('agents.builder.triggers.channel.newChatThread');
	}
	return (
		channel.mentionLabel ??
		channel.credentialName ??
		i18n.baseText('agents.builder.triggers.channel.newSession')
	);
}

function isN8nChat(channel: AgentTriggerChannelItem) {
	return channel.type === N8N_CHAT_INTEGRATION_TYPE;
}

function channelSource(channel: AgentTriggerChannelItem) {
	return i18n.baseText('agents.builder.triggers.channel.source', {
		interpolate: { channel: channel.label },
	});
}

function channelReasons(channel: AgentTriggerChannelItem) {
	return channel.invalidReasons.length > 0 ? channel.invalidReasons : channel.warningReasons;
}

function scheduleTitle(task: AgentTaskRow) {
	const summary = summarizeSchedule(task.cronExpression);
	if (summary) {
		return i18n.baseText(summary.key, {
			interpolate: 'values' in summary ? summary.values : undefined,
		});
	}
	return describeSchedule(task.cronExpression) ?? task.name;
}

/**
 * Names the timezone the cron runs in, so the time in the title is not read in
 * the viewer's zone. Tasks without a timezone run on the instance timezone.
 */
function scheduleSource(task: AgentTaskRow) {
	return i18n.baseText('agents.builder.triggers.schedule.sourceWithTimezone', {
		interpolate: { timezone: task.timezone ?? rootStore.timezone },
	});
}

defineExpose({ reloadTasks });
</script>

<template>
	<div :class="$style.container">
		<ul :class="$style.list" data-testid="agent-triggers-list">
			<li v-for="channel in props.channels" :key="channel.type" :class="$style.row">
				<button
					type="button"
					:class="[
						$style.item,
						$style.button,
						{
							[$style.deactivated]: !channel.connected,
							[$style.invalid]: channel.invalidReasons.length > 0,
						},
					]"
					:disabled="props.disabled || props.removingChannel"
					:aria-description="
						channel.connected ? undefined : i18n.baseText('agents.builder.capabilities.deactivated')
					"
					data-testid="agent-triggers-channel"
					@click="emit('open-channel', { type: channel.type, connected: channel.connected })"
				>
					<N8nIcon :icon="channel.icon" :size="16" :class="$style.icon" />
					<span :class="$style.text">
						<N8nText :class="$style.title" size="medium" bold color="text-dark">
							{{ channelTitle(channel) }}
						</N8nText>
						<N8nText
							v-if="channelSource(channel)"
							:class="$style.source"
							size="medium"
							bold
							color="text-light"
						>
							{{ channelSource(channel) }}
						</N8nText>
					</span>
					<N8nTooltip
						v-if="channel.connected && channelReasons(channel).length > 0"
						placement="top"
					>
						<N8nIcon
							:icon="
								channel.invalidReasons.length > 0
									? (channel.invalidIcon ?? 'triangle-alert')
									: 'triangle-alert'
							"
							:size="14"
							:class="channel.invalidReasons.length > 0 ? $style.errorIcon : $style.warningIcon"
							data-testid="agent-triggers-channel-alert"
						/>
						<template #content>
							<div v-for="reason in channelReasons(channel)" :key="reason">{{ reason }}</div>
						</template>
					</N8nTooltip>
				</button>
				<div v-if="isN8nChat(channel)" :class="$style.actions">
					<N8nSwitch2
						:model-value="channel.connected"
						:disabled="props.disabled || props.removingChannel"
						:aria-label="
							i18n.baseText(
								channel.connected
									? 'agents.channels.n8nChat.makeUnavailable'
									: 'agents.channels.n8nChat.makeAvailable',
							)
						"
						data-testid="agent-triggers-channel-toggle"
						@update:model-value="emit('toggle-channel', { type: channel.type, enabled: $event })"
					/>
				</div>
			</li>

			<li v-for="task in taskRows" :key="task.id" :class="$style.row">
				<button
					type="button"
					:class="[
						$style.item,
						$style.button,
						{ [$style.deactivated]: !task.enabled, [$style.invalid]: task.invalid },
					]"
					:disabled="props.disabled || removingTaskId === task.id"
					data-testid="agent-triggers-schedule"
					@click="emit('open-task', task)"
				>
					<N8nIcon icon="clock" :size="16" :class="$style.icon" />
					<span :class="$style.text">
						<N8nText :class="$style.title" size="medium" bold color="text-dark">
							{{ scheduleTitle(task) }}
						</N8nText>
						<N8nText :class="$style.source" size="medium" bold color="text-light">
							{{ scheduleSource(task) }}
						</N8nText>
					</span>
					<N8nTooltip v-if="task.enabled && task.invalid" placement="top">
						<N8nIcon icon="triangle-alert" :size="14" :class="$style.errorIcon" />
						<template #content>
							<div v-for="reason in task.invalidReasons" :key="reason">{{ reason }}</div>
						</template>
					</N8nTooltip>
				</button>
				<div :class="$style.actions">
					<N8nSwitch2
						:model-value="task.enabled"
						:disabled="props.disabled || removingTaskId !== null"
						:aria-label="
							i18n.baseText(
								task.enabled
									? 'agents.builder.contextMenu.deactivate'
									: 'agents.builder.contextMenu.activate',
							)
						"
						data-testid="agent-triggers-schedule-toggle"
						@update:model-value="toggleTask(task, $event)"
					/>
				</div>
			</li>

			<li v-if="taskErrorMessage" :class="$style.item">
				<N8nText size="small" :class="$style.error">{{ taskErrorMessage }}</N8nText>
			</li>
		</ul>

		<N8nButton
			:class="$style.addButton"
			variant="ghost"
			size="medium"
			:disabled="props.disabled"
			data-testid="agent-triggers-add-trigger"
			@click="emit('add-channel')"
		>
			<template #icon>
				<N8nIcon icon="plus" :size="16" />
			</template>
			{{ i18n.baseText('agents.builder.triggers.add') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;
@use '@n8n/design-system/css/mixins/utils';

.container {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);
}

.list {
	list-style: none;
	align-self: stretch;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	/** Pulls item padding out, so the icons line up with the section edge and the add button. */
	margin-inline: calc(-1 * var(--spacing--xs));
	/** Eats into the gap for Panel so list sits better **/
	margin-block-start: calc(-1 * var(--spacing--2xs));
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	height: var(--height--md);
	padding: 0 var(--spacing--xs);
	border-radius: var(--radius);
	text-align: left;
	user-select: none;
}

.row {
	position: relative;
}

.actions {
	position: absolute;
	inset-block: 0;
	inset-inline-end: var(--spacing--xs);
	display: flex;
	align-items: center;
}

.button {
	border: none;
	background: transparent;
	cursor: pointer;

	&:not(:disabled):hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		@include focus.focus-ring;
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
}

/** Matches the labelled add button of AgentChipRow */
.addButton {
	--button--color: var(--text-color--subtler);
	margin-left: calc(-1 * var(--spacing--xs));

	&:hover {
		--button--color: var(--text-color);
		background-color: transparent;
	}
}

.icon {
	flex-shrink: 0;
}

.text {
	display: flex;
	flex: 1;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow: hidden;
}

.title,
.source {
	@include utils.utils-ellipsis;
}

.title {
	min-width: 0;
}

.source {
	flex-shrink: 0;
}

.deactivated {
	opacity: 0.5;
}

.invalid .title {
	/** Overrides the N8nText color for rows with errors. */
	color: var(--color--danger);
}

.warningIcon {
	flex-shrink: 0;
	color: var(--color--warning);
}

.errorIcon {
	flex-shrink: 0;
	color: var(--color--danger);
}

.error {
	color: var(--color--danger);
}
</style>
