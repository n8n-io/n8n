import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { computed, type ComputedRef, type Ref } from 'vue';
import { extractArtifacts, HIDDEN_TOOLS, type ArtifactInfo } from './agentTimeline.utils';

/** Render hints for tool calls that show as special UI — not as generic "tool call" steps. */
const SPECIAL_RENDER_HINTS = new Set(['tasks', 'delegate', 'builder', 'data-table', 'researcher']);

/** Returns true if a tool call renders as a generic ToolCallStep (not special UI). */
function isGenericToolCall(tc: InstanceAiToolCallState): boolean {
	if (HIDDEN_TOOLS.has(tc.toolName)) return false;
	if (tc.renderHint && SPECIAL_RENDER_HINTS.has(tc.renderHint)) return false;
	if (tc.confirmation?.inputType === 'questions' || tc.confirmation?.inputType === 'plan-review') {
		return false;
	}
	return true;
}

export interface ResponseGroupSegment {
	kind: 'response-group';
	responseId: string | undefined;
	entries: InstanceAiTimelineEntry[];
	/** Visible tool call count (excludes hidden and special-render tools). */
	toolCallCount: number;
	/** Number of text entries inside this group (intermediate thinking text). */
	textCount: number;
	/** Number of answered question forms in this group. */
	questionCount: number;
	/** Number of child agent entries in this group. */
	childCount: number;
	/** Artifacts produced by child agents in this group. */
	artifacts: ArtifactInfo[];
}

export interface TrailingTextSegment {
	kind: 'trailing-text';
	content: string;
}

export type TimelineSegment = ResponseGroupSegment | TrailingTextSegment;

/**
 * Groups an agent's timeline for collapsed rendering when the run is complete.
 *
 * Text entries are always rendered inline (visible). Tool calls and child agents
 * are grouped into collapsible `response-group` segments. Text splits groups —
 * even entries from the same API response are separated if text appears between them.
 *
 * Returns null when grouping is unavailable (no `responseId` data, or nothing to collapse).
 */
export function useTimelineGrouping(
	agentNode: Ref<InstanceAiAgentNode> | ComputedRef<InstanceAiAgentNode>,
): ComputedRef<TimelineSegment[] | null> {
	return computed(() => {
		// Skip grouping while the agent is still running — the result is only
		// used for the collapsed/completed view and recomputing on every SSE
		// chunk is wasted work.
		if (agentNode.value.status === 'active') return null;

		const timeline = agentNode.value.timeline;
		if (timeline.length === 0) return null;

		// Check if any entry has a responseId — if not, skip grouping (old data).
		const hasResponseIds = timeline.some((e) => e.responseId !== undefined);
		if (!hasResponseIds) return null;

		// Build segments: text entries are always inline (visible), non-text
		// entries are grouped. Text splits groups — even within the same responseId.
		const segments: TimelineSegment[] = [];
		let currentGroup: ResponseGroupSegment | null = null;

		function newGroup(responseId: string | undefined): ResponseGroupSegment {
			return {
				kind: 'response-group',
				responseId,
				entries: [],
				toolCallCount: 0,
				textCount: 0,
				questionCount: 0,
				childCount: 0,
				artifacts: [],
			};
		}

		for (const entry of timeline) {
			if (entry.type === 'text') {
				// Text from the same API response as the current group stays inside
				// (intermediate "thinking" text). Otherwise it renders inline.
				if (currentGroup && entry.responseId === currentGroup.responseId) {
					currentGroup.entries.push(entry);
					currentGroup.textCount++;
				} else {
					currentGroup = null;
					segments.push({ kind: 'trailing-text', content: entry.content });
				}
			} else if (entry.type === 'tool-call') {
				if (!currentGroup || currentGroup.responseId !== entry.responseId) {
					currentGroup = newGroup(entry.responseId);
					segments.push(currentGroup);
				}
				currentGroup.entries.push(entry);
				const tc = agentNode.value.toolCalls.find((t) => t.toolCallId === entry.toolCallId);
				if (tc && isGenericToolCall(tc)) {
					currentGroup.toolCallCount++;
				} else if (tc?.confirmation?.inputType === 'questions' && !tc.isLoading) {
					currentGroup.questionCount++;
				}
			} else if (entry.type === 'child') {
				if (!currentGroup || currentGroup.responseId !== entry.responseId) {
					currentGroup = newGroup(entry.responseId);
					segments.push(currentGroup);
				}
				currentGroup.entries.push(entry);
				currentGroup.childCount++;
				const child = agentNode.value.children.find((c) => c.agentId === entry.agentId);
				if (child) {
					currentGroup.artifacts.push(...extractArtifacts(child));
				}
			}
		}

		// Extract trailing text from each response group — the last text entry
		// is usually the conclusion after tool calls and should be visible.
		for (let i = segments.length - 1; i >= 0; i--) {
			const seg = segments[i];
			if (seg.kind !== 'response-group') continue;
			const last = seg.entries.at(-1);
			if (last?.type === 'text') {
				seg.entries.pop();
				seg.textCount--;
				segments.splice(i + 1, 0, { kind: 'trailing-text', content: last.content });
			}
		}

		// Drop empty response groups (only hidden tool calls, no visible content).
		const flattened = segments.filter((seg) => {
			if (seg.kind !== 'response-group') return true;
			return seg.toolCallCount > 0 || seg.childCount > 0;
		});

		// If there are no collapsible response groups, skip grouping entirely.
		const hasCollapsibleGroups = flattened.some((s) => s.kind === 'response-group');
		if (!hasCollapsibleGroups) return null;

		return flattened;
	});
}

/** Collect distinct tool icons from tool calls within a group's entries. */
export function getGroupToolIcons(
	group: ResponseGroupSegment,
	toolCalls: InstanceAiToolCallState[],
	getIcon: (toolName: string) => IconName,
): IconName[] {
	const icons = new Set<IconName>();
	for (const entry of group.entries) {
		if (entry.type === 'tool-call') {
			const tc = toolCalls.find((t) => t.toolCallId === entry.toolCallId);
			if (tc && !HIDDEN_TOOLS.has(tc.toolName)) {
				icons.add(getIcon(tc.toolName));
			}
		}
	}
	return [...icons];
}
