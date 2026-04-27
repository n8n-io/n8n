import type { EventKind, IdleRange, TimelineItem } from './session-timeline.types';
import type { ThreadExecution } from './composables/useAgentThreadsApi';

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
	if (item.kind === 'workflow') return 'workflow';
	if (item.kind === 'tool') return `tool:${item.toolName ?? 'unknown'}`;
	return item.kind;
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
	workflow: 'var(--color--primary)',
	'working-memory': 'var(--color--foreground--shade-1)',
	suspension: 'var(--color--warning)',
};

export function kindColorToken(kind: EventKind): string {
	return COLOR_MAP[kind];
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
	kind?: 'tool' | 'workflow';
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
}

interface RawTextEvent {
	type: 'text';
	content: string;
	timestamp: number;
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

function metaValue(exec: ThreadExecution, key: string): string | undefined {
	return exec.metadata.find((m) => m.key === key)?.value;
}

function parseTimeline(exec: ThreadExecution): RawEvent[] {
	const raw = metaValue(exec, 'timeline');
	if (!raw) return [];
	try {
		return JSON.parse(raw) as RawEvent[];
	} catch {
		return [];
	}
}

export function flattenExecutionsToTimelineItems(executions: ThreadExecution[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	for (const exec of executions) {
		const isResumed = metaValue(exec, 'hitlStatus') === 'resumed';
		let resumedTagUsed = false;

		const userMsg = metaValue(exec, 'userMessage');
		if (userMsg) {
			items.push({
				kind: 'user',
				executionId: exec.id,
				content: userMsg,
				timestamp: exec.startedAt ? new Date(exec.startedAt).getTime() : 0,
			});
		}

		for (const event of parseTimeline(exec)) {
			if (event.type === 'text') {
				const showResumed = isResumed && !resumedTagUsed;
				if (showResumed) resumedTagUsed = true;
				items.push({
					kind: 'agent',
					executionId: exec.id,
					content: event.content,
					timestamp: event.timestamp ?? 0,
					resumed: showResumed,
				});
			} else if (event.type === 'tool-call') {
				const isWorkflow = event.kind === 'workflow';
				items.push({
					kind: isWorkflow ? 'workflow' : 'tool',
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
