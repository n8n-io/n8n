import {
	getViolationVerdict,
	SCOPE_LABEL_KEY,
} from '@n8n/frontend-module-type-availability-policies';
import { useI18n } from '@n8n/i18n';
import { inject, toRef } from 'vue';
import {
	AGENTS_CHAT_INTERACTION_EXTENSIONS,
	findToolOutputRenderer,
} from '@/features/ai/shared/agentsChat/interactionRegistry';
import { parseToolPolicyRefusal } from '@/features/ai/shared/agentsChat/toolPolicyRefusal';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import type {
	AiActivityItem,
	AiActivityOutputView,
	AiActivityThinkingItem,
	AiActivityToolItem,
	AiThinkingSegment,
} from '@/features/ai/shared/components/AiActivityTrace';
import { AGENT_TOOL_STEP_LABEL_KEY } from '../components/agentChatInjectionKeys';
import { TOOL_CALL_STATE } from '../constants';
import type { AgentFixWithAssistantFailure } from '../types';
import { isRecoverablePlanError } from '../utils/agent-plan';
import {
	getDelegateDifficultySummary,
	isDelegateSubAgentTool,
	resolveSubAgentName,
} from '../utils/delegate-tool';
import { getToolCallDetails } from '../utils/tool-call-details';
import { isCompactToolName, resolveToolNameForDisplay } from '../utils/toolDisplayName';
import {
	countIncompleteTodos,
	isWriteTodosTool,
	parseWriteTodosOutput,
	writeTodosLabel,
	writeTodosSummaryLabel,
} from '../utils/write-todos-tool';
import { useSubAgentNames } from './useSubAgentNames';

/** The thinking of an Agents run. It shows before the tool calls. */
export interface AgentActivityThinking {
	segments: AiThinkingSegment[];
	active: boolean;
	awaitingInput?: boolean;
	durationSec?: number;
	idleLabel?: string;
}

export interface AgentActivityBlock {
	toolCalls: ToolCall[];
	thinking?: AgentActivityThinking;
	/** The run can send its failed calls to the assistant, so the steps hide their own callout. */
	showFix?: boolean;
}

interface ToolStepDisplay {
	label: string;
	details: string;
	hasRawData: boolean;
	expandable: boolean;
}

function hasToolData(tc: ToolCall): boolean {
	return tc.input !== undefined || tc.output !== undefined;
}

/** A delegated child's live steps map to the same items as the parent's own steps. */
function childToolCalls(steps: NonNullable<ToolCall['childProgress']>['steps']): ToolCall[] {
	return steps.map((step) => ({
		tool: step.toolName,
		toolCallId: step.toolCallId,
		state: step.running ? TOOL_CALL_STATE.RUNNING : TOOL_CALL_STATE.DONE,
	}));
}

/**
 * Traces recorded before empty segments were dropped can still carry reasoning
 * the provider never revealed, which would render as blank rows.
 */
function childReasoningSegments(childProgress: NonNullable<ToolCall['childProgress']>) {
	return childProgress.reasoningSegments.filter((segment) => segment.content.length > 0);
}

function isChildReasoningActive(childProgress: NonNullable<ToolCall['childProgress']>): boolean {
	return childReasoningSegments(childProgress).some((segment) => segment.endTime === undefined);
}

function formatToolData(value: unknown): string {
	if (typeof value === 'string') return value;
	return JSON.stringify(value, null, 2) ?? String(value);
}

function isEmptyToolErrorPayload(value: unknown): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === 'string') return value.trim().length === 0;
	if (typeof value === 'object' && !Array.isArray(value)) {
		return Object.keys(value).length === 0;
	}
	return false;
}

function isToolStepLoading(tc: ToolCall): boolean {
	return (
		tc.state === TOOL_CALL_STATE.PENDING ||
		tc.state === TOOL_CALL_STATE.RUNNING ||
		tc.state === TOOL_CALL_STATE.SUSPENDED
	);
}

/** A call that waits for a person or a platform does not make its group shimmer. */
function isToolStepWaiting(tc: ToolCall): boolean {
	return tc.state === TOOL_CALL_STATE.SUSPENDED;
}

function isCanceledToolCall(tc: ToolCall): boolean {
	return (
		tc.canceled === true ||
		tc.state === TOOL_CALL_STATE.CANCELLED ||
		/** Older saved cancellations used the tool-error path. */
		(tc.state === TOOL_CALL_STATE.ERROR &&
			tc.output === 'Error: Tool call stopped by guardrail: tasks-cancelled')
	);
}

/** The policy refusal of a failed call, if a policy blocked it. */
export function toolStepRefusal(tc: ToolCall) {
	if (tc.state !== TOOL_CALL_STATE.ERROR) return undefined;
	return parseToolPolicyRefusal(tc.output);
}

/** The refusal payload is for the model; the callout explains it to the user. */
function showToolOutput(tc: ToolCall): boolean {
	return tc.output !== undefined && !toolStepRefusal(tc);
}

function toolCallsNeedSubAgentNames(toolCalls: ToolCall[]): boolean {
	return toolCalls.some((tc) => {
		if (isDelegateSubAgentTool(tc.tool)) return true;
		if (!isWriteTodosTool(tc.tool)) return false;
		const parsed = parseWriteTodosOutput(tc.output);
		return parsed?.todos.some((todo) => Boolean(todo.delegateHint?.subAgentId)) ?? false;
	});
}

/**
 * Maps the tool calls and thinking of an Agents run to the rows of the shared
 * activity trace. Only the mapping is specific to Agents.
 */
export function useAgentActivityItems(options: {
	projectId: () => string | undefined;
	/** All tool calls the caller shows, so sub-agent names load only when needed. */
	toolCalls: () => ToolCall[];
}) {
	const i18n = useI18n();
	const hostToolStepLabel = inject(AGENT_TOOL_STEP_LABEL_KEY, undefined);
	const interactionExtensions = inject(AGENTS_CHAT_INTERACTION_EXTENSIONS, undefined);
	const { subAgentNameById } = useSubAgentNames(
		toRef(() => options.projectId() ?? ''),
		() => toolCallsNeedSubAgentNames(options.toolCalls()),
	);

	function toolStepLabel(tc: ToolCall, isCompact = false): string {
		if (isDelegateSubAgentTool(tc.tool)) {
			return i18n.baseText('agents.chat.delegate.labelFallback');
		}
		if (isWriteTodosTool(tc.tool)) return writeTodosLabel(i18n);
		const hostLabel = hostToolStepLabel?.(tc.tool, tc.input);
		if (hostLabel) return hostLabel;
		/** The compact "Memory noted" label only applies once the call has finished. */
		return resolveToolNameForDisplay(tc.tool, i18n, isCompact ? tc.output : undefined);
	}

	function toolStepMetadata(tc: ToolCall): string[] {
		if (isCanceledToolCall(tc)) return [i18n.baseText('agentSessions.status.cancelled')];

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
		const isCompact = tc.state === TOOL_CALL_STATE.DONE && isCompactToolName(tc.tool, tc.output);
		const details = isCompact ? '' : (getToolCallDetails(tc, i18n, subAgentNameById.value) ?? '');
		const metadata = toolStepMetadata(tc);
		const hasChildProgress = Boolean(tc.childProgress);
		return {
			label: [toolStepLabel(tc, isCompact), ...metadata].join(' · '),
			details,
			hasRawData: !isCompact && details.length === 0 && hasToolData(tc) && !hasChildProgress,
			expandable: !isCompact && (details.length > 0 || hasToolData(tc) || hasChildProgress),
		};
	}

	function toolStepError(tc: ToolCall): string | undefined {
		if (isCanceledToolCall(tc)) return undefined;

		if (isRecoverablePlanError(tc)) return i18n.baseText('agents.chat.plan.error.rejected');
		if (tc.state !== TOOL_CALL_STATE.ERROR) return undefined;
		const refusal = toolStepRefusal(tc);
		if (refusal) {
			const { scope } = getViolationVerdict(refusal.violations[0]);
			return i18n.baseText(SCOPE_LABEL_KEY[scope ?? 'instance']);
		}
		if (isEmptyToolErrorPayload(tc.output)) {
			return i18n.baseText('agents.chat.toolError.generic');
		}
		return formatToolData(tc.output);
	}

	function hideToolErrorCallout(tc: ToolCall, showFix: boolean): boolean {
		if (toolStepRefusal(tc)) return false;
		return isRecoverablePlanError(tc) || (showFix && tc.state === TOOL_CALL_STATE.ERROR);
	}

	/** A host renderer replaces the default output view. */
	function toolOutputView(tc: ToolCall): AiActivityOutputView | undefined {
		const extensions = interactionExtensions?.value ?? [];
		const component = extensions.length > 0 ? findToolOutputRenderer(tc, extensions) : undefined;
		if (!component) return undefined;
		return {
			component,
			props: { toolCall: tc, label: i18n.baseText('agentSessions.timeline.output') },
		};
	}

	/** Steps of a delegated agent, in the same order as a run: thinking, tools, then the answer. */
	function childItems(tc: ToolCall): Array<AiActivityItem<ToolCall>> | undefined {
		const childProgress = tc.childProgress;
		if (!childProgress) return undefined;
		const segments = childReasoningSegments(childProgress);
		const thinking: AiActivityThinkingItem[] =
			segments.length > 0
				? [
						{
							kind: 'thinking',
							id: `${tc.toolCallId}-thinking`,
							segments,
							active: isChildReasoningActive(childProgress),
							testId: 'agent-chat-delegate-child-thinking',
						},
					]
				: [];
		return [
			...thinking,
			...childToolCalls(childProgress.steps).map((child) => toolItem(child, false)),
		];
	}

	function toolItem(tc: ToolCall, showFix: boolean): AiActivityToolItem<ToolCall> {
		const view = toolStepView(tc);
		const outputView = view.hasRawData && showToolOutput(tc) ? toolOutputView(tc) : undefined;
		return {
			kind: 'tool',
			id: tc.toolCallId,
			label: view.label,
			toolName: tc.tool,
			loading: isToolStepLoading(tc),
			waiting: isToolStepWaiting(tc),
			error: toolStepError(tc),
			errorIcon: toolStepRefusal(tc) ? 'lock' : undefined,
			hideErrorCallout: hideToolErrorCallout(tc, showFix),
			customErrorCallout: Boolean(toolStepRefusal(tc)),
			details: view.details || tc.childProgress?.text || undefined,
			input: view.hasRawData ? tc.input : undefined,
			output: view.hasRawData && showToolOutput(tc) && !outputView ? tc.output : undefined,
			outputView,
			children: childItems(tc),
			hasContent: view.expandable,
			payload: tc,
		};
	}

	/** Rows of one run, in the same order as Instance AI: thinking, then the tool calls. */
	function activityItems(block: AgentActivityBlock): Array<AiActivityItem<ToolCall>> {
		const { thinking, toolCalls, showFix = false } = block;
		const thinkingItems: AiActivityThinkingItem[] =
			thinking && thinking.segments.length > 0
				? [
						{
							kind: 'thinking',
							id: 'thinking',
							segments: thinking.segments,
							active: thinking.active,
							awaitingInput: thinking.awaitingInput,
							durationSec: thinking.durationSec,
							idleLabel: thinking.idleLabel,
							testId: 'agent-chat-thinking-block',
						},
					]
				: [];
		return [...thinkingItems, ...toolCalls.map((tc) => toolItem(tc, showFix))];
	}

	/** Failed calls that the assistant can try to fix. */
	function fixableFailures(
		toolCalls: ToolCall[],
		dismissedToolCallIds: ReadonlySet<string>,
	): AgentFixWithAssistantFailure[] {
		const failures: AgentFixWithAssistantFailure[] = [];

		for (const toolCall of toolCalls) {
			if (dismissedToolCallIds.has(toolCall.toolCallId)) continue;
			if (isCanceledToolCall(toolCall)) continue;
			if (toolCall.state !== TOOL_CALL_STATE.ERROR) continue;
			if (isRecoverablePlanError(toolCall)) continue;
			/** The assistant cannot lift a policy. */
			if (toolStepRefusal(toolCall)) continue;

			const error = toolStepError(toolCall)?.trim();
			if (!error) continue;

			failures.push({
				toolCallId: toolCall.toolCallId,
				toolName: toolCall.tool,
				toolDisplayName: toolStepLabel(toolCall),
				error,
				...(toolCall.startTime !== undefined ? { startedAt: toolCall.startTime } : {}),
				...(toolCall.endTime !== undefined ? { endedAt: toolCall.endTime } : {}),
			});
		}

		return failures;
	}

	return { activityItems, fixableFailures, toolStepLabel };
}
