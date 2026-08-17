import type { BaseTextKey, useI18n } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import type {
	EventKind,
	HitlRequestType,
	HitlResponseStatus,
	IdleRange,
	TimelineItem,
	TimelineStatusFilterKey,
	ToolCallOutcome,
} from './session-timeline.types';
import type { AgentExecution } from './composables/useAgentThreadsApi';
import { isDelegateSubAgentTool } from './utils/delegate-tool';
import {
	formatToolNameForDisplay,
	getToolNameTranslationKey,
	resolveToolNameForDisplay,
} from './utils/toolDisplayName';

export const IDLE_THRESHOLD_MS = 10 * 60 * 1000;

export function endTimestampOf(item: TimelineItem): number {
	return item.endTimestamp ?? item.timestamp;
}

/** A `delegate_subagent` tool call — rendered as a sub-agent (bot icon) rather than a plain tool. */
export function isSubAgentTimelineItem(item: TimelineItem): boolean {
	return item.kind === 'tool' && isDelegateSubAgentTool(item.toolName);
}

export function isErroredToolCallTimelineItem(item: TimelineItem): boolean {
	if (item.kind !== 'tool' && item.kind !== 'node' && item.kind !== 'workflow') return false;
	return (
		item.toolOutcome === 'error' ||
		(item.toolOutcome === undefined && item.toolSuccess === false) ||
		(item.kind === 'workflow' && isRecord(item.toolOutput) && item.toolOutput.status === 'error')
	);
}

export function hitlTimelineNameKey(item: TimelineItem): BaseTextKey | undefined {
	if (item.hitlRequestType !== 'approval') return undefined;
	if (item.kind === 'suspension') return 'agentSessions.timeline.approvalRequestForTool';
	if (item.kind === 'hitl-response') return 'agentSessions.timeline.approvalResponseForTool';
	return undefined;
}

type TimelineI18n = Pick<ReturnType<typeof useI18n>, 'baseText'>;

export function linkedToolDisplayName(item: TimelineItem, i18n: TimelineI18n): string {
	return (
		item.hitlToolDisplayName ??
		item.workflowName ??
		item.nodeDisplayName ??
		resolveToolNameForDisplay(item.toolName, i18n)
	);
}

export function hitlTimelineName(item: TimelineItem, i18n: TimelineI18n): string {
	const toolName = linkedToolDisplayName(item, i18n);
	const nameKey = hitlTimelineNameKey(item);
	return nameKey ? i18n.baseText(nameKey, { interpolate: { toolName } }) : toolName;
}

export type TimelineItemStatus = {
	kind: 'hitl-response' | 'tool-error';
	labelKey: BaseTextKey;
	theme: 'default' | 'success' | 'danger';
};

export function timelineItemStatus(item: TimelineItem): TimelineItemStatus | undefined {
	if (item.kind === 'hitl-response') {
		if (item.hitlResponseStatus === 'approved') {
			return {
				kind: 'hitl-response',
				labelKey: 'agentSessions.timeline.approved',
				theme: 'success',
			};
		}
		return {
			kind: 'hitl-response',
			labelKey:
				item.hitlResponseStatus === 'declined'
					? 'agentSessions.timeline.declined'
					: 'agentSessions.timeline.responseReceived',
			theme: 'default',
		};
	}
	if (isErroredToolCallTimelineItem(item)) {
		return { kind: 'tool-error', labelKey: 'agentSessions.timeline.error', theme: 'danger' };
	}
	return undefined;
}

export function computeIdleRanges(items: TimelineItem[]): IdleRange[] {
	const ranges: IdleRange[] = [];
	for (let i = 0; i < items.length - 1; i++) {
		const a = items[i];
		const b = items[i + 1];
		if (a.kind === 'suspension' || b.kind === 'suspension') continue;
		const aEnd = endTimestampOf(a);
		const gap = b.timestamp - aEnd;
		if (gap > IDLE_THRESHOLD_MS) {
			ranges.push({ start: aEnd, end: b.timestamp });
		}
	}
	return ranges;
}

export function itemFilterKey(item: TimelineItem): string {
	// All tool-call kinds collapse to one filter entry per kind so the dropdown
	// stays compact regardless of how many distinct tools the agent uses; the
	// search input handles per-tool drill-down.
	return item.kind;
}

export function itemStatusFilterKey(item: TimelineItem): TimelineStatusFilterKey | undefined {
	if (isErroredToolCallTimelineItem(item)) return 'error';
	if (
		item.kind === 'hitl-response' &&
		(item.hitlResponseStatus === 'approved' || item.hitlResponseStatus === 'declined')
	) {
		return item.hitlResponseStatus;
	}
	return undefined;
}

export function matchesTimelineFilters(item: TimelineItem, selectedFilters: Set<string>): boolean {
	if (selectedFilters.size === 0 || selectedFilters.has(itemFilterKey(item))) return true;
	const statusKey = itemStatusFilterKey(item);
	return statusKey !== undefined && selectedFilters.has(statusKey);
}

export type TimelineLabelResolver = (key: string) => string;

function searchableValueText(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	if (value === null) return 'null';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}

	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}

export function timelineItemSearchText(
	item: TimelineItem,
	labelForKey: TimelineLabelResolver,
): string {
	const parts: Array<string | undefined> = [];

	parts.push(labelForKey(itemFilterKey(item)));
	if (item.kind === 'suspension') {
		parts.push(
			labelForKey(item.hitlRequestType === 'approval' ? 'approval-requested' : 'hitl-requested'),
		);
	}
	if (item.kind === 'hitl-response') {
		parts.push(labelForKey('hitl-response'));
	}
	if (item.hitlResponseStatus) {
		parts.push(labelForKey(item.hitlResponseStatus));
	}
	if (isErroredToolCallTimelineItem(item)) {
		parts.push(labelForKey('error'));
	}

	parts.push(
		item.content,
		item.toolName,
		item.workflowName,
		item.nodeDisplayName,
		item.subAgentName,
		searchableValueText(item.toolInput),
		searchableValueText(item.toolOutput),
		searchableValueText(item.hitlRequest),
		searchableValueText(item.hitlResponse),
	);
	if (item.toolName) parts.push(formatToolNameForDisplay(item.toolName));

	const toolKey = builtinToolLabelKey(item.toolName, item.toolOutput);
	if (toolKey) parts.push(labelForKey(toolKey));

	return parts
		.filter((part): part is string => typeof part === 'string')
		.join(' ')
		.toLowerCase();
}

export function matchesSearch(
	item: TimelineItem,
	query: string,
	labelForKey: TimelineLabelResolver,
): boolean {
	if (!query) return true;
	return timelineItemSearchText(item, labelForKey).includes(query.toLowerCase());
}

export function filteredTimelineItemIndexes(
	items: TimelineItem[],
	visibleKinds: Set<string>,
	searchQuery: string,
	labelForKey: TimelineLabelResolver,
): number[] {
	return items
		.map((item, index) => ({ item, index }))
		.filter(
			({ item }) =>
				matchesTimelineFilters(item, visibleKinds) &&
				matchesSearch(item, searchQuery.trim(), labelForKey),
		)
		.map(({ index }) => index);
}

export function sessionBounds(items: TimelineItem[]): { start: number; end: number } {
	if (items.length === 0) return { start: 0, end: 1 };
	let start = Infinity;
	let end = -Infinity;
	for (const item of items) {
		if (item.timestamp < start) start = item.timestamp;
		const e = endTimestampOf(item);
		if (e > end) end = e;
	}
	if (end <= start) end = start + 1;
	return { start, end };
}

const COLOR_MAP: Record<EventKind, string> = {
	user: 'var(--color--blue-400)',
	agent: 'var(--color--secondary)',
	tool: 'var(--color--success)',
	node: 'var(--color--text)',
	workflow: 'var(--color--primary)',
	suspension: 'var(--color--warning)',
	'hitl-response': 'var(--color--blue-400)',
};

export function kindColorToken(kind: EventKind): string {
	return COLOR_MAP[kind];
}

const CHART_BLOCK_COLOR_MAP: Record<EventKind, string> = {
	user: 'var(--color--blue-600)',
	agent: 'var(--color--purple-600)',
	tool: 'var(--color--green-600)',
	node: 'var(--color--neutral-600)',
	workflow: 'var(--color--orange-600)',
	suspension: 'var(--color--yellow-600)',
	'hitl-response': 'var(--color--blue-600)',
};

export function chartBlockColor(kind: EventKind): string {
	return CHART_BLOCK_COLOR_MAP[kind];
}

export function builtinToolLabelKey(
	toolName: string | undefined,
	_output?: unknown,
): BaseTextKey | null {
	return getToolNameTranslationKey(toolName) ?? null;
}

export function formatDuration(ms: number): string {
	if (!ms || ms <= 0) return '';
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	const minutes = Math.floor(ms / 60_000);
	const seconds = Math.floor((ms % 60_000) / 1000);
	if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remMinutes = minutes % 60;
	return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

interface RawToolCallEvent {
	type: 'tool-call';
	kind?: 'tool' | 'workflow' | 'node';
	name: string;
	toolCallId: string;
	input: unknown;
	output: unknown;
	startTime: number;
	endTime: number;
	success: boolean;
	workflowId?: string;
	workflowName?: string;
	workflowExecutionId?: string;
	triggerType?: string;
	nodeType?: string;
	nodeTypeVersion?: number;
	nodeDisplayName?: string;
	nodeParameters?: Record<string, unknown>;
}

interface RawTextEvent {
	type: 'text';
	content: string;
	timestamp: number;
	endTime?: number;
}

interface RawSuspensionEvent {
	type: 'suspension';
	toolName: string;
	toolCallId: string;
	timestamp: number;
	input?: unknown;
	suspendPayload?: unknown;
}

interface RawHitlResponseEvent {
	type: 'hitl-response';
	toolCallId: string;
	response: unknown;
	timestamp: number;
}

type RawEvent = RawToolCallEvent | RawTextEvent | RawSuspensionEvent | RawHitlResponseEvent;

/**
 * Cast the loose API timeline shape (`Record<string, unknown> & { type }`)
 * into the discriminated union used by the renderer. The backend writes
 * the same producer schema both layers expect; the API type is loose so
 * `useAgentThreadsApi.ts` doesn't have to import the renderer's types.
 */
function timelineEvents(exec: AgentExecution): RawEvent[] {
	return (exec.timeline ?? []) as unknown as RawEvent[];
}

function isDeclinedToolOutput(output: unknown): boolean {
	return isRecord(output) && output.declined === true;
}

function isApprovalRequest(value: unknown): boolean {
	return isRecord(value) && value.type === 'approval';
}

function isIntegrationActionRequest(value: unknown): boolean {
	return isRecord(value) && value.type === 'integration_action';
}

function toolCallOutcome(event: RawToolCallEvent): ToolCallOutcome | undefined {
	if (event.endTime === 0) return undefined;
	return event.success ? 'success' : 'error';
}

interface HitlContext {
	requestType: HitlRequestType;
	toolName: string;
	toolCallId: string;
	toolCall?: RawToolCallEvent;
	toolItem?: TimelineItem;
	toolDisplayName?: string;
	hasExplicitResponse: boolean;
}

function inferHitlRequestType(
	event: RawSuspensionEvent,
	toolCall: RawToolCallEvent | undefined,
	legacyApprovalToolCallIds: Set<string>,
): HitlRequestType {
	if (isApprovalRequest(event.suspendPayload)) return 'approval';
	if (legacyApprovalToolCallIds.has(event.toolCallId)) return 'approval';
	// Older timeline records did not persist the suspension payload. Node and
	// workflow tools are the legacy approval-gated cases; generic action tools
	// use their suspension as an interaction request.
	return toolCall?.kind === 'node' || toolCall?.kind === 'workflow' ? 'approval' : 'interaction';
}

function collectLegacyApprovalToolCallIds(executions: AgentExecution[]): Set<string> {
	const toolCallIds = new Set<string>();
	for (const exec of executions) {
		for (const event of timelineEvents(exec)) {
			if (event.type === 'tool-call' && isDeclinedToolOutput(event.output)) {
				toolCallIds.add(event.toolCallId);
			}
		}
	}
	return toolCallIds;
}

function hitlRequestPayload(
	event: RawSuspensionEvent,
	toolCall: RawToolCallEvent | undefined,
	requestType: HitlRequestType,
): unknown {
	if (requestType === 'approval') {
		return (
			event.suspendPayload ?? {
				type: 'approval',
				toolName: event.toolName,
				args: event.input ?? toolCall?.input,
			}
		);
	}
	if (event.suspendPayload !== undefined && !isIntegrationActionRequest(event.suspendPayload)) {
		return event.suspendPayload;
	}
	return event.input ?? toolCall?.input ?? event.suspendPayload;
}

function approvalDisplayName(payload: unknown): string | undefined {
	if (!isRecord(payload) || typeof payload.displayName !== 'string') return undefined;
	return payload.displayName;
}

function hitlResponseStatus(
	requestType: HitlRequestType,
	response: unknown,
	isLegacyResponse = false,
): HitlResponseStatus {
	if (requestType === 'approval' && isRecord(response) && typeof response.approved === 'boolean') {
		return response.approved ? 'approved' : 'declined';
	}
	if (isDeclinedToolOutput(response)) return 'declined';
	if (isLegacyResponse && requestType === 'approval') return 'approved';
	return 'responded';
}

function mergeResumedToolResult(item: TimelineItem | undefined, event: RawToolCallEvent): void {
	if (!item || isDeclinedToolOutput(event.output)) return;
	item.toolOutput = event.output;
	item.toolOutcome = toolCallOutcome(event);
	item.toolSuccess = event.endTime === 0 ? undefined : event.success;
	if (item.kind === 'workflow') item.workflowExecutionId = event.workflowExecutionId;
}

function hitlResponseItem(
	context: HitlContext,
	executionId: string,
	response: unknown,
	timestamp: number,
	isLegacyResponse = false,
): TimelineItem {
	return {
		kind: 'hitl-response',
		executionId,
		toolName: context.toolName,
		toolCallId: context.toolCallId,
		hitlRequestType: context.requestType,
		hitlResponse: response,
		hitlResponseStatus: hitlResponseStatus(context.requestType, response, isLegacyResponse),
		hitlToolDisplayName: context.toolDisplayName,
		timestamp,
		endTimestamp: timestamp,
		workflowName: context.toolCall?.workflowName,
		nodeDisplayName: context.toolCall?.nodeDisplayName,
	};
}

export function flattenExecutionsToTimelineItems(executions: AgentExecution[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	const initialToolCalls = new Map<string, RawToolCallEvent>();
	const initialToolItems = new Map<string, TimelineItem>();
	const hitlContexts = new Map<string, HitlContext>();
	const legacyApprovalToolCallIds = collectLegacyApprovalToolCallIds(executions);
	for (const exec of executions) {
		const isResumed = exec.hitlStatus === 'resumed';
		let resumedTagUsed = false;

		// Attachment-only sends record a null userMessage but still carry files.
		if (exec.userMessage || exec.attachments?.length) {
			items.push({
				kind: 'user',
				executionId: exec.id,
				content: exec.userMessage ?? '',
				timestamp: exec.startedAt ? new Date(exec.startedAt).getTime() : 0,
				...(exec.attachments?.length && { attachments: exec.attachments }),
			});
		}

		for (const event of timelineEvents(exec)) {
			if (event.type === 'text') {
				const showResumed = isResumed && !resumedTagUsed;
				if (showResumed) resumedTagUsed = true;
				const startTs = event.timestamp ?? 0;
				items.push({
					kind: 'agent',
					executionId: exec.id,
					content: event.content,
					timestamp: startTs,
					// Generation duration: from first delta to flush. Older records without
					// `endTime` skip this so the popover doesn't show a misleading 0.
					endTimestamp: event.endTime && event.endTime > startTs ? event.endTime : undefined,
					resumed: showResumed,
				});
			} else if (event.type === 'tool-call') {
				const hitlContext = hitlContexts.get(event.toolCallId);
				if (hitlContext) {
					mergeResumedToolResult(hitlContext.toolItem, event);
					if (!hitlContext.hasExplicitResponse) {
						items.push(hitlResponseItem(hitlContext, exec.id, event.output, event.startTime, true));
					}
					hitlContexts.delete(event.toolCallId);
					continue;
				}

				const isWorkflow = event.kind === 'workflow';
				const isNode = event.kind === 'node';
				if (event.toolCallId) initialToolCalls.set(event.toolCallId, event);
				const item: TimelineItem = {
					kind: isWorkflow ? 'workflow' : isNode ? 'node' : 'tool',
					executionId: exec.id,
					toolName: event.name,
					toolCallId: event.toolCallId,
					toolInput: event.input,
					toolOutput: event.output,
					toolOutcome: toolCallOutcome(event),
					toolSuccess: event.endTime === 0 ? undefined : event.success,
					timestamp: event.startTime,
					endTimestamp: event.endTime || event.startTime,
					workflowId: isWorkflow ? event.workflowId : undefined,
					workflowName: isWorkflow ? event.workflowName : undefined,
					workflowExecutionId: isWorkflow ? event.workflowExecutionId : undefined,
					workflowTriggerType: isWorkflow ? event.triggerType : undefined,
					nodeType: isNode ? event.nodeType : undefined,
					nodeTypeVersion: isNode ? event.nodeTypeVersion : undefined,
					nodeDisplayName: isNode ? event.nodeDisplayName : undefined,
					nodeParameters: isNode ? event.nodeParameters : undefined,
				};
				items.push(item);
				if (event.toolCallId) initialToolItems.set(event.toolCallId, item);
			} else if (event.type === 'suspension') {
				const toolCall = initialToolCalls.get(event.toolCallId);
				const requestType = inferHitlRequestType(event, toolCall, legacyApprovalToolCallIds);
				const request = hitlRequestPayload(event, toolCall, requestType);
				const toolDisplayName = approvalDisplayName(request);
				if (event.toolCallId) {
					hitlContexts.set(event.toolCallId, {
						requestType,
						toolName: event.toolName || toolCall?.name || '',
						toolCallId: event.toolCallId,
						toolCall,
						toolItem: initialToolItems.get(event.toolCallId),
						toolDisplayName,
						hasExplicitResponse: false,
					});
				}
				items.push({
					kind: 'suspension',
					executionId: exec.id,
					toolName: event.toolName,
					toolCallId: event.toolCallId,
					timestamp: event.timestamp ?? 0,
					hitlRequestType: requestType,
					hitlRequest: request,
					hitlToolDisplayName: toolDisplayName,
					workflowName: toolCall?.workflowName,
					nodeDisplayName: toolCall?.nodeDisplayName,
				});
			} else if (event.type === 'hitl-response') {
				const hitlContext = hitlContexts.get(event.toolCallId);
				if (!hitlContext) continue;
				hitlContext.hasExplicitResponse = true;
				items.push(hitlResponseItem(hitlContext, exec.id, event.response, event.timestamp ?? 0));
			}
		}
	}
	return items;
}
