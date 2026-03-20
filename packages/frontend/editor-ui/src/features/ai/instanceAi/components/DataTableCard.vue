<script lang="ts" setup>
import { computed, ref } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode, InstanceAiTaskRun } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import AgentTimeline from './AgentTimeline.vue';

const props = defineProps<{
	agentNode?: InstanceAiAgentNode | null;
	taskRun?: InstanceAiTaskRun | null;
}>();

const i18n = useI18n();
const instanceAiStore = useInstanceAiStore();
const agentNode = computed(() => props.agentNode ?? null);
const taskRun = computed(() => props.taskRun ?? null);
const toolCalls = computed(() => agentNode.value?.toolCalls ?? []);
const subtitle = computed(() => taskRun.value?.subtitle ?? agentNode.value?.subtitle ?? null);
const taskError = computed(() => taskRun.value?.error ?? agentNode.value?.error ?? null);

function handleStop() {
	if (taskRun.value && (taskRun.value.status === 'running' || taskRun.value.status === 'queued')) {
		void instanceAiStore.cancelBackgroundTask(taskRun.value.taskId);
		return;
	}

	if (agentNode.value?.taskId) {
		instanceAiStore.amendAgent(agentNode.value.agentId, agentNode.value.role, agentNode.value.taskId);
	}
}
const isDetailOpen = ref(false);

interface PhaseState {
	key: string;
	label: string;
	count: number;
	completedCount: number;
	isActive: boolean;
	isCompleted: boolean;
}

const CHECKING_TOOLS = new Set(['list-data-tables', 'get-data-table-schema']);
const SCHEMA_TOOLS = new Set([
	'create-data-table',
	'delete-data-table',
	'add-data-table-column',
	'delete-data-table-column',
	'rename-data-table-column',
]);
const ROW_TOOLS = new Set([
	'query-data-table-rows',
	'insert-data-table-rows',
	'update-data-table-rows',
	'delete-data-table-rows',
]);

const phases = computed((): PhaseState[] => {
	const result: PhaseState[] = [];

	const checkCalls = toolCalls.value.filter((toolCall) => CHECKING_TOOLS.has(toolCall.toolName));
	if (checkCalls.length > 0) {
		result.push({
			key: 'checking',
			label: i18n.baseText('instanceAi.dataTableCard.phase.checking'),
			count: checkCalls.length,
			completedCount: checkCalls.filter((toolCall) => !toolCall.isLoading).length,
			isActive: checkCalls.some((toolCall) => toolCall.isLoading),
			isCompleted: checkCalls.every((toolCall) => !toolCall.isLoading),
		});
	}

	const schemaCalls = toolCalls.value.filter((toolCall) => SCHEMA_TOOLS.has(toolCall.toolName));
	if (schemaCalls.length > 0) {
		result.push({
			key: 'schema',
			label: i18n.baseText('instanceAi.dataTableCard.phase.schema'),
			count: schemaCalls.length,
			completedCount: schemaCalls.filter((toolCall) => !toolCall.isLoading).length,
			isActive: schemaCalls.some((toolCall) => toolCall.isLoading),
			isCompleted: schemaCalls.every((toolCall) => !toolCall.isLoading),
		});
	}

	const rowCalls = toolCalls.value.filter((toolCall) => ROW_TOOLS.has(toolCall.toolName));
	if (rowCalls.length > 0) {
		result.push({
			key: 'rows',
			label: i18n.baseText('instanceAi.dataTableCard.phase.rows'),
			count: rowCalls.length,
			completedCount: rowCalls.filter((toolCall) => !toolCall.isLoading).length,
			isActive: rowCalls.some((toolCall) => toolCall.isLoading),
			isCompleted: rowCalls.every((toolCall) => !toolCall.isLoading),
		});
	}

	return result;
});

const isActive = computed(() => {
	if (taskRun.value) {
		return (
			taskRun.value.status === 'queued' ||
			taskRun.value.status === 'running' ||
			taskRun.value.status === 'suspended'
		);
	}

	return agentNode.value?.status === 'active';
});
const isError = computed(() => {
	if (taskRun.value) {
		return taskRun.value.status === 'failed' || taskRun.value.status === 'cancelled';
	}

	return agentNode.value?.status === 'error';
});
const isCompleted = computed(() => {
	if (taskRun.value) {
		return taskRun.value.status === 'completed' && !taskRun.value.error;
	}

	return agentNode.value?.status === 'completed' && !agentNode.value.error;
});
const hasDetailTimeline = computed(() => !!agentNode.value && toolCalls.value.length > 0);
</script>

<template>
	<div :class="$style.root">
		<!-- Header -->
			<div :class="$style.header">
				<div :class="$style.headerLeft">
					<N8nIcon v-if="isActive" icon="spinner" spin size="small" :class="$style.activeIcon" />
					<N8nIcon v-else-if="isError" icon="triangle-alert" size="small" :class="$style.errorIcon" />
					<N8nIcon v-else icon="check" size="small" :class="$style.successIcon" />
					<span :class="$style.title">{{ i18n.baseText('instanceAi.dataTableCard.title') }}</span>
					<span v-if="subtitle" :class="$style.subtitle">
						{{ subtitle }}
					</span>
				</div>
				<button v-if="isActive" :class="$style.stopButton" @click="handleStop">
				<N8nIcon icon="square" size="small" />
				{{ i18n.baseText('instanceAi.agent.stop') }}
			</button>
		</div>

		<!-- Phase Timeline -->
		<div v-if="phases.length > 0" :class="$style.timeline">
			<div
				v-for="phase in phases"
				:key="phase.key"
				:class="[
					$style.phase,
					phase.isActive ? $style.phaseActive : '',
					phase.isCompleted ? $style.phaseCompleted : '',
				]"
			>
				<N8nIcon v-if="phase.isActive" icon="spinner" spin size="small" :class="$style.phaseIcon" />
				<N8nIcon
					v-else-if="phase.isCompleted"
					icon="check"
					size="small"
					:class="$style.phaseIconDone"
				/>
				<N8nIcon v-else icon="circle" size="small" :class="$style.phaseIconPending" />
				<span :class="$style.phaseLabel">
					{{ phase.label }}
					<span v-if="phase.count > 1" :class="$style.phaseCount">
						({{ phase.completedCount }}/{{ phase.count }})
					</span>
				</span>
			</div>
		</div>

			<!-- Expandable detail -->
			<CollapsibleRoot
				v-if="hasDetailTimeline"
				v-model:open="isDetailOpen"
				:class="$style.detailBlock"
			>
				<CollapsibleTrigger :class="$style.detailTrigger">
					<span>{{ i18n.baseText('instanceAi.dataTableCard.details') }}</span>
					<N8nIcon :icon="isDetailOpen ? 'chevron-up' : 'chevron-down'" size="small" />
				</CollapsibleTrigger>
				<CollapsibleContent :class="$style.detailContent">
					<AgentTimeline v-if="agentNode" :agent-node="agentNode" :compact="true" />
				</CollapsibleContent>
			</CollapsibleRoot>

			<!-- Success -->
			<div v-if="isCompleted" :class="$style.successResult">
				<N8nIcon icon="check" size="small" :class="$style.successIcon" />
				<span>{{ taskRun?.resultSummary ?? i18n.baseText('instanceAi.dataTableCard.success') }}</span>
			</div>

			<!-- Error -->
			<div v-if="taskError" :class="$style.errorResult">
				<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
				<span>{{ taskError || i18n.baseText('instanceAi.dataTableCard.failed') }}</span>
			</div>
		</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
}

.title {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.subtitle {
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
	max-width: 280px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.timeline {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--xs) var(--spacing--2xs);
}

.phase {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.phaseActive {
	color: var(--color--primary);
}

.phaseCompleted {
	color: var(--color--success);
}

.phaseIcon {
	color: var(--color--primary);
}

.phaseIconDone {
	color: var(--color--success);
}

.phaseIconPending {
	color: var(--color--text--tint-1);
}

.phaseLabel {
	white-space: nowrap;
}

.phaseCount {
	font-weight: var(--font-weight--regular);
	opacity: 0.7;
}

.detailBlock {
	border-top: var(--border);
}

.detailTrigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--xs);
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.detailContent {
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.successResult {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border-top: var(--border);
	background: color-mix(in srgb, var(--color--success) 10%, var(--color--background));
	font-size: var(--font-size--2xs);
	color: var(--color--success);
}

.errorResult {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border-top: var(--border);
	background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
}

.stopButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--danger);
	background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	border: var(--border-width) var(--border-style) var(--color--danger);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: color-mix(in srgb, var(--color--danger) 18%, var(--color--background));
	}
}

.activeIcon {
	color: var(--color--primary);
}

.successIcon {
	color: var(--color--success);
}

.errorIcon {
	color: var(--color--danger);
}
</style>
