import type { EventKind, IdleRange, TimelineItem } from './session-timeline.types';
import type { AgentExecution } from './composables/useAgentThreadsApi';
import { formatToolNameForDisplay } from './utils/toolDisplayName';

export const IDLE_THRESHOLD_MS = 10 * 60 * 1000;

export function endTimestampOf(item: TimelineItem): number {
	return item.endTimestamp ?? item.timestamp;
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

export type TimelineLabelResolver = (key: string) => string;

export function timelineItemSearchText(
	item: TimelineItem,
	labelForKey: TimelineLabelResolver,
): string {
	const parts: Array<string | undefined> = [];

	parts.push(labelForKey(itemFilterKey(item)));
	if (item.kind === 'working-memory') {
		parts.push(labelForKey('working-memory-updated'));
	} else if (item.kind === 'suspension') {
		parts.push(labelForKey('suspension-waiting'));
	}

	parts.push(item.content, item.toolName, item.workflowName, item.nodeDisplayName);
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
				(visibleKinds.size === 0 || visibleKinds.has(itemFilterKey(item))) &&
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
	'working-memory': 'var(--color--foreground--shade-1)',
	suspension: 'var(--color--warning)',
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
	'working-memory': 'var(--color--mint-600)',
	suspension: 'var(--color--yellow-600)',
};

export function chartBlockColor(kind: EventKind): string {
	return CHART_BLOCK_COLOR_MAP[kind];
}

/**
 * i18n keys for built-in tools that should render as a friendly label rather
 * than their raw machine name. Returns `null` for any tool not in the map so
 * callers fall back to the raw `toolName`.
 */
export type BuiltinToolLabelKey =
	| 'agentSessions.timeline.tool.richInteraction'
	| 'agentSessions.timeline.tool.richInteractionDisplay';

/**
 * Resolve the i18n label for a tool entry. Some built-in tools (currently
 * `rich_interaction`) have two semantically distinct modes — interactive
 * (suspends, awaits user input) vs display-only (renders a card and the
 * agent continues). We pick the label based on the recorded output: the
 * `rich_interaction` handler returns `{ displayOnly: true }` to mark a
 * display-only call, and a button/select payload (after the user clicks)
 * for the interactive case.
 */
export function builtinToolLabelKey(
	toolName: string | undefined,
	output?: unknown,
): BuiltinToolLabelKey | null {
	switch (toolName) {
		case 'rich_interaction':
			return isDisplayOnlyOutput(output)
				? 'agentSessions.timeline.tool.richInteractionDisplay'
				: 'agentSessions.timeline.tool.richInteraction';
		default:
			return null;
	}
}

function isDisplayOnlyOutput(output: unknown): boolean {
	return (
		typeof output === 'object' &&
		output !== null &&
		'displayOnly' in output &&
		(output as { displayOnly: unknown }).displayOnly === true
	);
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

interface RawMemoryEvent {
	type: 'working-memory';
	content: string;
	timestamp: number;
}

interface RawSuspensionEvent {
	type: 'suspension';
	toolName: string;
	toolCallId: string;
	timestamp: number;
}

type RawEvent = RawToolCallEvent | RawTextEvent | RawMemoryEvent | RawSuspensionEvent;

/**
 * Cast the loose API timeline shape (`Record<string, unknown> & { type }`)
 * into the discriminated union used by the renderer. The backend writes
 * the same producer schema both layers expect; the API type is loose so
 * `useAgentThreadsApi.ts` doesn't have to import the renderer's types.
 */
function timelineEvents(exec: AgentExecution): RawEvent[] {
	return (exec.timeline ?? []) as unknown as RawEvent[];
}

export function flattenExecutionsToTimelineItems(executions: AgentExecution[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	for (const exec of executions) {
		const isResumed = exec.hitlStatus === 'resumed';
		let resumedTagUsed = false;

		if (exec.userMessage) {
			items.push({
				kind: 'user',
				executionId: exec.id,
				content: exec.userMessage,
				timestamp: exec.startedAt ? new Date(exec.startedAt).getTime() : 0,
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
				const isWorkflow = event.kind === 'workflow';
				const isNode = event.kind === 'node';
				items.push({
					kind: isWorkflow ? 'workflow' : isNode ? 'node' : 'tool',
					executionId: exec.id,
					toolName: event.name,
					toolCallId: event.toolCallId,
					toolInput: event.input,
					toolOutput: event.output,
					toolSuccess: event.success,
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
				});
			} else if (event.type === 'working-memory') {
				items.push({
					kind: 'working-memory',
					executionId: exec.id,
					content: event.content,
					timestamp: event.timestamp ?? 0,
				});
			} else if (event.type === 'suspension') {
				items.push({
					kind: 'suspension',
					executionId: exec.id,
					toolName: event.toolName,
					toolCallId: event.toolCallId,
					timestamp: event.timestamp ?? 0,
				});
			}
		}
	}
	return items;
}
