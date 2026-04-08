import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { computed, type ComputedRef, type Ref } from 'vue';
import { extractArtifacts, type ArtifactInfo } from './agentTimeline.utils';

const HIDDEN_TOOLS = new Set(['updateWorkingMemory']);

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
	/** Visible tool call count (excludes hidden tools). */
	toolCallCount: number;
	/** Number of non-trailing text entries in this group. */
	textCount: number;
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
 * Groups an agent's timeline entries by `responseId` for collapsed rendering.
 *
 * Rules:
 * - Consecutive entries with the same `responseId` form a group.
 * - A change in `responseId` starts a new group.
 * - Trailing text entries (at the end of the timeline) are extracted as
 *   separate `trailing-text` segments so they remain visible when groups
 *   are collapsed.
 * - Artifacts from child agents within each group are extracted so they
 *   can be rendered in-place after the collapsed group header.
 * - If no entries have a `responseId` (old data), returns null to signal
 *   "no grouping available — render flat."
 */
export function useTimelineGrouping(
	agentNode: Ref<InstanceAiAgentNode> | ComputedRef<InstanceAiAgentNode>,
): ComputedRef<TimelineSegment[] | null> {
	return computed(() => {
		const timeline = agentNode.value.timeline;
		if (timeline.length === 0) return null;

		// Check if any entry has a responseId — if not, skip grouping (old data).
		const hasResponseIds = timeline.some((e) => e.responseId !== undefined);
		if (!hasResponseIds) return null;

		// Build segments: text entries are always inline (visible), non-text
		// entries are grouped. Text splits groups — even within the same responseId.
		const segments: TimelineSegment[] = [];
		let currentGroup: ResponseGroupSegment | null = null;

		function finishGroup() {
			currentGroup = null;
		}

		function ensureGroup(responseId: string | undefined): ResponseGroupSegment {
			if (!currentGroup || currentGroup.responseId !== responseId) {
				currentGroup = {
					kind: 'response-group',
					responseId,
					entries: [],
					toolCallCount: 0,
					textCount: 0,
					childCount: 0,
					artifacts: [],
				};
				segments.push(currentGroup);
			}
			return currentGroup;
		}

		for (const entry of timeline) {
			if (entry.type === 'text') {
				// Text always renders inline — it breaks any open group.
				finishGroup();
				segments.push({ kind: 'trailing-text', content: entry.content });
			} else if (entry.type === 'tool-call') {
				const group = ensureGroup(entry.responseId);
				group.entries.push(entry);
				const tc = agentNode.value.toolCalls.find((t) => t.toolCallId === entry.toolCallId);
				if (tc && isGenericToolCall(tc)) {
					group.toolCallCount++;
				}
			} else if (entry.type === 'child') {
				const group = ensureGroup(entry.responseId);
				group.entries.push(entry);
				group.childCount++;
				const child = agentNode.value.children.find((c) => c.agentId === entry.agentId);
				if (child) {
					group.artifacts.push(...extractArtifacts(child));
				}
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
