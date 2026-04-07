<script lang="ts" setup>
import { computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { ref } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { getRenderableAgentResult } from '../agentResult';
import AgentTimeline from './AgentTimeline.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();
const instanceAiStore = useInstanceAiStore();

function handleStop() {
	instanceAiStore.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
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
	const tc = props.agentNode.toolCalls;
	const result: PhaseState[] = [];

	const checkCalls = tc.filter((t) => CHECKING_TOOLS.has(t.toolName));
	if (checkCalls.length > 0) {
		result.push({
			key: 'checking',
			label: i18n.baseText('instanceAi.dataTableCard.phase.checking'),
			count: checkCalls.length,
			completedCount: checkCalls.filter((t) => !t.isLoading).length,
			isActive: checkCalls.some((t) => t.isLoading),
			isCompleted: checkCalls.every((t) => !t.isLoading),
		});
	}

	const schemaCalls = tc.filter((t) => SCHEMA_TOOLS.has(t.toolName));
	if (schemaCalls.length > 0) {
		result.push({
			key: 'schema',
			label: i18n.baseText('instanceAi.dataTableCard.phase.schema'),
			count: schemaCalls.length,
			completedCount: schemaCalls.filter((t) => !t.isLoading).length,
			isActive: schemaCalls.some((t) => t.isLoading),
			isCompleted: schemaCalls.every((t) => !t.isLoading),
		});
	}

	const rowCalls = tc.filter((t) => ROW_TOOLS.has(t.toolName));
	if (rowCalls.length > 0) {
		result.push({
			key: 'rows',
			label: i18n.baseText('instanceAi.dataTableCard.phase.rows'),
			count: rowCalls.length,
			completedCount: rowCalls.filter((t) => !t.isLoading).length,
			isActive: rowCalls.some((t) => t.isLoading),
			isCompleted: rowCalls.every((t) => !t.isLoading),
		});
	}

	return result;
});

const isActive = computed(() => props.agentNode.status === 'active');
const isError = computed(() => props.agentNode.status === 'error');
const isCompleted = computed(
	() => props.agentNode.status === 'completed' && !props.agentNode.error,
);
const displayResult = computed(() => getRenderableAgentResult(props.agentNode));
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
				<span v-if="props.agentNode.subtitle" :class="$style.subtitle">
					{{ props.agentNode.subtitle }}
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
			v-if="props.agentNode.toolCalls.length > 0"
			v-model:open="isDetailOpen"
			:class="$style.detailBlock"
		>
			<CollapsibleTrigger :class="$style.detailTrigger">
				<span>{{ i18n.baseText('instanceAi.dataTableCard.details') }}</span>
				<N8nIcon :icon="isDetailOpen ? 'chevron-up' : 'chevron-down'" size="small" />
			</CollapsibleTrigger>
			<CollapsibleContent :class="$style.detailContent">
				<AgentTimeline :agent-node="props.agentNode" :compact="true" />
			</CollapsibleContent>
		</CollapsibleRoot>

		<!-- Success -->
		<div v-if="isCompleted" :class="$style.successResult">
			<N8nIcon icon="check" size="small" :class="$style.successIcon" />
			<span>{{ i18n.baseText('instanceAi.dataTableCard.success') }}</span>
		</div>

		<div v-if="displayResult && !props.agentNode.error" :class="$style.resultBlock">
			<InstanceAiMarkdown :content="displayResult" />
		</div>

		<!-- Error -->
		<div v-if="props.agentNode.error" :class="$style.errorResult">
			<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
			<span>{{ props.agentNode.error || i18n.baseText('instanceAi.dataTableCard.failed') }}</span>
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

.resultBlock {
	padding: var(--spacing--xs);
	border-top: var(--border);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
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
