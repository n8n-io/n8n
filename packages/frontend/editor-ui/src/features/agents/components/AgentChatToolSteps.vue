<script setup lang="ts">
import { N8nIcon, N8nMarkdownEditor, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { reactive, toRef } from 'vue';
import type { ToolCall } from '../composables/agentChatMessages';
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

// Resolve sub-agent ids → friendly names for delegate labels and write_todos hints.
const projectIdRef = toRef(() => props.projectId ?? '');
const { subAgentNameById } = useSubAgentNames(projectIdRef, () =>
	toolCallsNeedSubAgentNames(props.toolCalls),
);

// Track which tool steps are expanded (by tool-call id).
const expandedIds = reactive(new Set<string>());

interface ToolStepDisplay {
	label: string;
	metadata: string[];
	details: string;
	expandable: boolean;
	expanded: boolean;
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

function toolStepView(tc: ToolCall): ToolStepDisplay {
	const details = getToolCallDetails(tc, i18n, subAgentNameById.value) ?? '';
	return {
		label: toolStepLabel(tc),
		metadata: toolStepMetadata(tc),
		details,
		expandable: details.length > 0,
		expanded: expandedIds.has(tc.toolCallId),
	};
}

function toggle(tc: ToolCall, view: ToolStepDisplay): void {
	if (!view.expandable) return;
	if (expandedIds.has(tc.toolCallId)) expandedIds.delete(tc.toolCallId);
	else expandedIds.add(tc.toolCallId);
}
</script>

<template>
	<ol :class="$style.toolSteps">
		<li v-for="(tc, i) in toolCalls" :key="i" :class="$style.toolStep">
			<template v-for="view in [toolStepView(tc)]" :key="view.label">
				<!-- Rail: the status icon plus a line that grows to fill the step's
				     height, so consecutive steps stay visually connected even when one
				     expands its answer. -->
				<div :class="$style.rail">
					<div :class="$style.indicator">
						<N8nIcon
							v-if="tc.state === 'done'"
							icon="circle-check"
							size="large"
							:class="$style.indicatorDone"
						/>
						<N8nIcon
							v-else-if="tc.state === 'error'"
							icon="circle-x"
							size="large"
							:class="$style.indicatorError"
						/>
						<N8nIcon
							v-else-if="tc.state === 'cancelled'"
							icon="circle-x"
							size="large"
							:class="$style.indicatorCancelled"
						/>
						<N8nTooltip
							v-else-if="tc.state === 'suspended'"
							placement="top"
							:content="i18n.baseText('agents.chat.toolStep.waitingForInput')"
						>
							<N8nIcon icon="clock" size="large" :class="$style.indicatorSuspended" />
						</N8nTooltip>
						<N8nIcon
							v-else
							icon="spinner"
							size="large"
							:spin="true"
							:class="$style.indicatorLoading"
						/>
					</div>
					<div :class="$style.railLine" />
				</div>

				<div :class="$style.stepBody">
					<component
						:is="view.expandable ? 'button' : 'div'"
						:type="view.expandable ? 'button' : undefined"
						:aria-expanded="view.expandable ? view.expanded : undefined"
						:class="[$style.stepRow, { [$style.stepRowButton]: view.expandable }]"
						@click="toggle(tc, view)"
					>
						<span :class="[$style.label, { [$style.shimmer]: tc.state === 'running' }]">
							{{ view.label }}
						</span>
						<template
							v-for="(metadataPart, metadataIndex) in view.metadata"
							:key="`${metadataIndex}:${metadataPart}`"
						>
							<span :class="$style.separator" aria-hidden="true">·</span>
							<span :class="$style.summary" data-testid="tool-step-summary">
								{{ metadataPart }}
							</span>
						</template>
						<N8nIcon
							v-if="view.expandable"
							:icon="view.expanded ? 'chevron-down' : 'chevron-right'"
							size="small"
							:class="$style.chevron"
						/>
					</component>
					<div v-if="view.expandable && view.expanded" :class="$style.answer">
						<N8nMarkdownEditor
							:model-value="view.details"
							readonly
							variant="ghost"
							show-toolbar="never"
							max-height="240px"
						/>
					</div>
				</div>
			</template>
		</li>
	</ol>
</template>

<style module>
.toolSteps {
	list-style: none;
	margin: 0 0 var(--spacing--sm);
	padding: 0;
	display: flex;
	flex-direction: column;
}

.toolStep {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	gap: var(--spacing--2xs);
	user-select: none;
}

.rail {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;
	width: 14px;
}

.indicator {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 14px;
	/* Match the label's line box so the icon centers on the first text line. */
	height: calc(var(--font-size--sm) * var(--line-height--sm));
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

/**
 * The connecting line. `flex: 1` makes it grow to fill the rail's remaining
 * height — which equals the step's height (rail is stretched) — so it always
 * reaches the next step's icon, regardless of an expanded answer. The
 * min-height provides the spacing between adjacent steps. Hidden on the last
 * step so there's no dangling tail.
 */
.railLine {
	flex: 1 1 auto;
	width: 1px;
	min-height: var(--spacing--2xs);
	margin: 2px 0;
	background-color: var(--border-color);
}

.toolStep:last-child .railLine {
	display: none;
}

.indicatorDone {
	color: var(--text-color--success);
}

.indicatorError {
	color: var(--text-color--danger);
}

.indicatorCancelled {
	color: var(--text-color--subtler);
}

.indicatorLoading {
	color: var(--text-color);
}

.indicatorSuspended {
	color: var(--text-color--warning);
}

.stepBody {
	flex: 1 1 0;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.stepRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.stepRowButton {
	width: 100%;
	padding: 0;
	border: none;
	background: none;
	font: inherit;
	color: inherit;
	text-align: left;
	cursor: pointer;
}

.label {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtler);
	line-height: var(--line-height--sm);
}

.separator {
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--sm);
}

.summary {
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--sm);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.chevron {
	color: var(--text-color--subtler);
	flex-shrink: 0;
}

.answer {
	margin-bottom: var(--spacing--xs);
	border-radius: var(--radius--sm);
	background-color: var(--background--subtle);
	overflow: hidden;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	/* N8nMarkdownEditor sizes its content from --input--font-size (falling back
	   to inherit when unset). Pin it a step below the step label so the
	   sub-agent answer reads as secondary, compact detail. */
	--input--font-size: var(--font-size--2xs);
}

.shimmer {
	background: linear-gradient(
		90deg,
		var(--text-color--subtle) 25%,
		var(--text-color--subtler) 50%,
		var(--text-color--subtle) 75%
	);
	background-size: 200% 100%;
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}

	100% {
		background-position: -200% 0;
	}
}
</style>
