<script setup lang="ts">
import { N8nAiActivityStep, N8nAiActivityStepGroup, N8nMarkdownEditor } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { toRef } from 'vue';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { useSubAgentNames } from '../composables/useSubAgentNames';
import { formatToolNameForDisplay, getToolNameTranslationKey } from '../utils/toolDisplayName';
import {
	getDelegateDifficultySummary,
	isDelegateSubAgentTool,
	resolveSubAgentName,
} from '../utils/delegate-tool';
import { getToolCallDetails } from '../utils/tool-call-details';
import {
	countIncompleteTodos,
	isWriteTodosTool,
	parseWriteTodosOutput,
	writeTodosLabel,
	writeTodosSummaryLabel,
} from '../utils/write-todos-tool';
import { TOOL_CALL_STATE } from '../constants';

const props = defineProps<{
	toolCalls: ToolCall[];
	projectId?: string;
}>();

const i18n = useI18n();

function toolCallsNeedSubAgentNames(toolCalls: ToolCall[]): boolean {
	return toolCalls.some((tc) => {
		if (isDelegateSubAgentTool(tc.tool)) return true;
		if (!isWriteTodosTool(tc.tool)) return false;
		const parsed = parseWriteTodosOutput(tc.output);
		return parsed?.todos.some((todo) => Boolean(todo.delegateHint?.subAgentId)) ?? false;
	});
}

const projectIdRef = toRef(() => props.projectId ?? '');
const { subAgentNameById } = useSubAgentNames(projectIdRef, () =>
	toolCallsNeedSubAgentNames(props.toolCalls),
);

interface ToolStepDisplay {
	label: string;
	details: string;
	hasRawData: boolean;
	expandable: boolean;
}

function getToolDisplayName(toolName: string): string {
	const translationKey = getToolNameTranslationKey(toolName);
	return translationKey ? i18n.baseText(translationKey) : formatToolNameForDisplay(toolName);
}

function toolStepLabel(tc: ToolCall): string {
	if (isDelegateSubAgentTool(tc.tool)) {
		return i18n.baseText('agents.chat.delegate.labelFallback');
	}
	if (isWriteTodosTool(tc.tool)) return writeTodosLabel(i18n);
	return getToolDisplayName(tc.tool);
}

function toolStepMetadata(tc: ToolCall): string[] {
	if (isDelegateSubAgentTool(tc.tool)) {
		return [
			resolveSubAgentName(tc.input, subAgentNameById.value),
			getDelegateDifficultySummary(tc.input, i18n),
		].filter((part): part is string => Boolean(part));
	}
	if (isWriteTodosTool(tc.tool)) {
		const parsed = parseWriteTodosOutput(tc.output);
		if (parsed) return [writeTodosSummaryLabel(i18n, countIncompleteTodos(parsed.todos))];
	}
	if (tc.displaySummary) return [tc.displaySummary];
	return [];
}

function hasToolData(tc: ToolCall): boolean {
	return tc.input !== undefined || tc.output !== undefined;
}

function formatToolData(value: unknown): string {
	if (typeof value === 'string') return value;
	return JSON.stringify(value, null, 2) ?? String(value);
}

function toolStepView(tc: ToolCall): ToolStepDisplay {
	const details = getToolCallDetails(tc, i18n, subAgentNameById.value) ?? '';
	const metadata = toolStepMetadata(tc);
	return {
		label: [toolStepLabel(tc), ...metadata].join(' · '),
		details,
		hasRawData: details.length === 0 && hasToolData(tc),
		expandable: details.length > 0 || hasToolData(tc),
	};
}

function toolStepError(tc: ToolCall): string | undefined {
	return tc.state === 'error' ? formatToolData(tc.output) : undefined;
}

function isToolStepLoading(tc: ToolCall): boolean {
	return (
		tc.state === TOOL_CALL_STATE.PENDING ||
		tc.state === TOOL_CALL_STATE.RUNNING ||
		tc.state === TOOL_CALL_STATE.SUSPENDED
	);
}

function groupLabel(): string {
	return i18n.baseText('instanceAi.activitySummary.toolCalls', {
		adjustToNumber: props.toolCalls.length,
		interpolate: { count: String(props.toolCalls.length) },
	});
}

function hasLoadingToolCall(): boolean {
	return props.toolCalls.some((tc) => tc.state === 'running' || tc.state === 'suspended');
}
</script>

<template>
	<div :class="$style.toolSteps">
		<N8nAiActivityStepGroup
			v-if="toolCalls.length > 1"
			:label="groupLabel()"
			size="small"
			:loading="hasLoadingToolCall()"
		>
			<template v-for="tc in toolCalls" :key="tc.toolCallId">
				<N8nAiActivityStep
					v-for="view in [toolStepView(tc)]"
					:key="`${tc.toolCallId}-${view.label}`"
					:label="view.label"
					:loading="isToolStepLoading(tc)"
					:error="toolStepError(tc)"
					:has-content="view.expandable"
				>
					<N8nMarkdownEditor
						v-if="view.details"
						:model-value="view.details"
						readonly
						variant="ghost"
						show-toolbar="never"
						max-height="240px"
						:class="$style.answer"
					/>
					<div v-else-if="view.hasRawData" :class="$style.toolDataList">
						<div v-if="tc.input !== undefined" :class="$style.toolDataSection">
							<span :class="$style.toolDataLabel">
								{{ i18n.baseText('agentSessions.timeline.input') }}
							</span>
							<pre :class="$style.toolDataContent">{{ formatToolData(tc.input) }}</pre>
						</div>
						<div v-if="tc.output !== undefined" :class="$style.toolDataSection">
							<span :class="$style.toolDataLabel">
								{{ i18n.baseText('agentSessions.timeline.output') }}
							</span>
							<pre :class="$style.toolDataContent">{{ formatToolData(tc.output) }}</pre>
						</div>
					</div>
				</N8nAiActivityStep>
			</template>
		</N8nAiActivityStepGroup>

		<template v-else>
			<N8nAiActivityStep
				v-for="tc in toolCalls"
				:key="tc.toolCallId"
				:label="toolStepView(tc).label"
				:loading="isToolStepLoading(tc)"
				:error="toolStepError(tc)"
				:has-content="toolStepView(tc).expandable"
			>
				<template v-for="view in [toolStepView(tc)]" :key="view.label">
					<N8nMarkdownEditor
						v-if="view.details"
						:model-value="view.details"
						readonly
						variant="ghost"
						show-toolbar="never"
						max-height="240px"
						:class="$style.answer"
					/>
					<div v-else-if="view.hasRawData" :class="$style.toolDataList">
						<div v-if="tc.input !== undefined" :class="$style.toolDataSection">
							<span :class="$style.toolDataLabel">
								{{ i18n.baseText('agentSessions.timeline.input') }}
							</span>
							<pre :class="$style.toolDataContent">{{ formatToolData(tc.input) }}</pre>
						</div>
						<div v-if="tc.output !== undefined" :class="$style.toolDataSection">
							<span :class="$style.toolDataLabel">
								{{ i18n.baseText('agentSessions.timeline.output') }}
							</span>
							<pre :class="$style.toolDataContent">{{ formatToolData(tc.output) }}</pre>
						</div>
					</div>
				</template>
			</N8nAiActivityStep>
		</template>
	</div>
</template>

<style module>
.toolSteps {
	margin: 0 0 var(--spacing--sm);
}

.answer {
	margin-bottom: var(--spacing--xs);
	border-radius: var(--radius--sm);
	background-color: var(--background--subtle);
	overflow: hidden;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	--input--font-size: var(--font-size--2xs);
}

.toolDataList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--xs);
	max-width: min(520px, calc(100vw - var(--spacing--4xl)));
}

.toolDataSection {
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--xs);
	background-color: var(--background--base);
	padding: var(--spacing--2xs);
	user-select: text;
}

.toolDataLabel {
	display: block;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	color: var(--text-color--subtle);
	margin-bottom: var(--spacing--5xs);
}

.toolDataContent {
	margin: 0;
	font-family: monospace;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--sm);
	color: var(--text-color);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	user-select: text;
}
</style>
