<script setup lang="ts">
import { N8nIcon, N8nMarkdownEditor, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, reactive, toRef, watch } from 'vue';
import type { ToolCall } from '../composables/agentChatMessages';
import { useProjectAgentsList } from '../composables/useProjectAgentsList';
import { formatDuration } from '../session-timeline.utils';
import { formatToolNameForDisplay, getToolNameTranslationKey } from '../utils/toolDisplayName';
import {
	humanizeTaskName,
	isDelegateSubAgentTool,
	parseDelegateInput,
	parseDelegateOutput,
} from '../utils/delegate-tool';

const props = defineProps<{
	toolCalls: ToolCall[];
	projectId?: string;
}>();

const i18n = useI18n();

// Resolve sub-agent ids → friendly names for the delegate step's label, via the
// cached/deduped project agents list (shared with the sub-agent picker).
const projectIdRef = toRef(() => props.projectId ?? '');
const { list: projectAgents, ensureLoaded } = useProjectAgentsList(projectIdRef);

const hasDelegateCall = computed(() =>
	props.toolCalls.some((tc) => isDelegateSubAgentTool(tc.tool)),
);

watch(
	[hasDelegateCall, projectIdRef],
	([needed, projectId]) => {
		if (needed && projectId) void ensureLoaded().catch(() => {});
	},
	{ immediate: true },
);

const subAgentNameById = computed(() => {
	const map = new Map<string, string>();
	for (const agent of projectAgents.value ?? []) map.set(agent.id, agent.name);
	return map;
});

// Track which delegate steps are expanded (by tool-call id).
const expandedIds = reactive(new Set<string>());

function getToolDisplayName(toolName: string): string {
	const translationKey = getToolNameTranslationKey(toolName);
	return translationKey ? i18n.baseText(translationKey) : formatToolNameForDisplay(toolName);
}

// Delegate steps are prefixed to flag that a sub-agent ran, then labelled with
// the sub-agent's name when resolvable, falling back to the humanized task name.
function stepLabel(tc: ToolCall): string {
	if (!isDelegateSubAgentTool(tc.tool)) return getToolDisplayName(tc.tool);
	const input = parseDelegateInput(tc.input);
	const resolved = input?.subAgentId ? subAgentNameById.value.get(input.subAgentId) : undefined;
	const name = resolved?.trim() || humanizeTaskName(input?.taskName);
	return name
		? i18n.baseText('agents.chat.delegate.label', { interpolate: { name } })
		: i18n.baseText('agents.chat.delegate.labelFallback');
}

function delegateAnswer(tc: ToolCall): string {
	if (!isDelegateSubAgentTool(tc.tool)) return '';
	return parseDelegateOutput(tc.output)?.answer?.trim() ?? '';
}

// A delegate step is expandable once it has an answer to reveal.
function isExpandable(tc: ToolCall): boolean {
	return delegateAnswer(tc).length > 0;
}

function isExpanded(tc: ToolCall): boolean {
	return expandedIds.has(tc.toolCallId);
}

function toggle(tc: ToolCall): void {
	if (!isExpandable(tc)) return;
	if (expandedIds.has(tc.toolCallId)) expandedIds.delete(tc.toolCallId);
	else expandedIds.add(tc.toolCallId);
}

// Show the elapsed duration only once the tool has settled (start + end both
// recorded). No live ticking — the spinner already conveys the running state.
function toolDuration(tc: ToolCall): string {
	if (tc.startTime === undefined || tc.endTime === undefined) return '';
	return formatDuration(tc.endTime - tc.startTime);
}
</script>

<template>
	<ol :class="$style.toolSteps">
		<li v-for="(tc, i) in toolCalls" :key="i" :class="$style.toolStep">
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
					<N8nTooltip
						v-else-if="tc.state === 'suspended'"
						placement="top"
						content="Waiting for your input"
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
					:is="isExpandable(tc) ? 'button' : 'div'"
					:type="isExpandable(tc) ? 'button' : undefined"
					:aria-expanded="isExpandable(tc) ? isExpanded(tc) : undefined"
					:class="[$style.stepRow, { [$style.stepRowButton]: isExpandable(tc) }]"
					@click="toggle(tc)"
				>
					<span :class="[$style.label, { [$style.shimmer]: tc.state === 'running' }]">
						{{ stepLabel(tc) }}
					</span>
					<span v-if="toolDuration(tc)" :class="$style.duration" data-testid="tool-step-duration">
						{{ toolDuration(tc) }}
					</span>
					<N8nIcon
						v-if="isExpandable(tc)"
						:icon="isExpanded(tc) ? 'chevron-down' : 'chevron-right'"
						size="small"
						:class="$style.chevron"
					/>
				</component>
				<div
					v-if="isExpandable(tc) && isExpanded(tc)"
					:class="$style.answer"
					data-testid="delegate-answer"
				>
					<N8nMarkdownEditor
						:model-value="delegateAnswer(tc)"
						readonly
						variant="ghost"
						show-toolbar="never"
						max-height="240px"
					/>
				</div>
			</div>
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
	gap: var(--spacing--2xs);
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

.duration {
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--sm);
	font-variant-numeric: tabular-nums;
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
	font-size: var(--font-size--xs);
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
