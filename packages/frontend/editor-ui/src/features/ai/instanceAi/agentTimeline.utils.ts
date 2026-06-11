import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { isActiveBuilderAgent } from './builderAgents';

/** Tool calls that are internal bookkeeping and should not be shown to the user. */
export const HIDDEN_TOOLS = new Set(['updateWorkingMemory']);

/** Render hints whose tool calls produce no output in the timeline — they are
 *  represented elsewhere (child agent sections, artifact cards). */
const INVISIBLE_RENDER_HINTS = new Set(['builder', 'data-table', 'eval-setup']);

/**
 * True when a timeline entry produces visible output in `AgentTimeline`.
 *
 * Mirrors the template's branch chain (same order): hidden tools and
 * builder/data-table/eval-setup hints render nothing; plan-review
 * confirmations render a panel; bare planner calls render nothing; pending
 * question forms are suppressed until answered; hoisted active builder
 * children are rendered elsewhere. Used to skip the timeline wrapper
 * entirely when a segment has no visible entries (avoids empty divs and
 * their phantom flex-gap spacing).
 */
export function isVisibleTimelineEntry(
	entry: InstanceAiTimelineEntry,
	toolCallsById: Record<string, InstanceAiToolCallState>,
	childrenById: Record<string, InstanceAiAgentNode>,
): boolean {
	if (entry.type === 'text') return true;

	if (entry.type === 'tool-call') {
		const tc = toolCallsById[entry.toolCallId];
		if (!tc || HIDDEN_TOOLS.has(tc.toolName)) return false;
		if (tc.renderHint && INVISIBLE_RENDER_HINTS.has(tc.renderHint)) return false;
		if (tc.confirmation?.inputType === 'plan-review') return true;
		if (tc.renderHint === 'planner') return false;
		if (tc.confirmation?.inputType === 'questions') return !tc.isLoading;
		return true;
	}

	const child = childrenById[entry.agentId];
	return child !== undefined && !isActiveBuilderAgent(child);
}

/**
 * True while `entry` is the timeline entry still receiving stream deltas.
 * The reducer only ever appends to an agent's LAST timeline entry, so any
 * entry before the tail is settled — even while the agent itself is still
 * active (e.g. text written before a tool call or an HITL pause). Used to
 * scope the markdown decoration deferral to the one actively-growing block.
 */
export function isStreamingTimelineEntry(
	agentNode: InstanceAiAgentNode,
	entry: InstanceAiTimelineEntry,
): boolean {
	return agentNode.status === 'active' && entry === agentNode.timeline.at(-1);
}

export interface ArtifactInfo {
	type: 'workflow' | 'data-table';
	resourceId: string;
	name: string;
	projectId?: string;
	/** ISO timestamp of the tool call that produced this artifact. */
	completedAt?: string;
}

/** Extract all artifacts (workflows and data tables) from a node's tool calls. */
export function extractArtifacts(node: InstanceAiAgentNode): ArtifactInfo[] {
	if (node.status !== 'completed') return [];

	const artifacts: ArtifactInfo[] = [];
	const seenIds = new Set<string>();

	// Check targetResource first (single-workflow agents)
	if (node.targetResource?.id && node.targetResource.type) {
		const type = node.targetResource.type;
		if (type === 'workflow' || type === 'data-table') {
			seenIds.add(node.targetResource.id);
			artifacts.push({
				type,
				resourceId: node.targetResource.id,
				name: node.targetResource.name ?? node.subtitle ?? 'Untitled',
				completedAt: undefined,
			});
		}
	}

	// Scan tool calls for additional artifacts
	for (const tc of node.toolCalls) {
		if (!tc.result || typeof tc.result !== 'object') continue;
		const result = tc.result as Record<string, unknown>;

		// Workflow artifacts from build-workflow / submit-workflow
		if (
			(tc.toolName === 'build-workflow' || tc.toolName === 'submit-workflow') &&
			typeof result.workflowId === 'string' &&
			!seenIds.has(result.workflowId)
		) {
			seenIds.add(result.workflowId);
			const name =
				(typeof result.workflowName === 'string' ? result.workflowName : undefined) ??
				(typeof (tc.args as Record<string, unknown>)?.name === 'string'
					? ((tc.args as Record<string, unknown>).name as string)
					: undefined) ??
				'Untitled';
			artifacts.push({
				type: 'workflow',
				resourceId: result.workflowId,
				name,
				completedAt: tc.completedAt,
			});
			continue;
		}

		// Data table artifacts
		let tableId: string | undefined;
		let tableName: string | undefined;
		let tableProjectId: string | undefined;

		if (typeof result.tableId === 'string') tableId = result.tableId;
		if (typeof result.dataTableId === 'string') tableId = result.dataTableId;
		if (typeof result.name === 'string') tableName = result.name;
		if (typeof result.tableName === 'string') tableName = result.tableName;
		if (typeof result.projectId === 'string') tableProjectId = result.projectId;

		const table = result.table;
		if (table && typeof table === 'object') {
			const t = table as Record<string, unknown>;
			if (typeof t.id === 'string') tableId = t.id;
			if (typeof t.name === 'string') tableName = t.name;
			if (typeof t.projectId === 'string') tableProjectId = t.projectId;
		}

		if (tableId && !seenIds.has(tableId)) {
			seenIds.add(tableId);
			artifacts.push({
				type: 'data-table',
				resourceId: tableId,
				name: tableName ?? 'Untitled',
				projectId: tableProjectId,
				completedAt: tc.completedAt,
			});
		}
	}

	// Recurse into children
	for (const child of node.children) {
		for (const artifact of extractArtifacts(child)) {
			if (!seenIds.has(artifact.resourceId)) {
				seenIds.add(artifact.resourceId);
				artifacts.push(artifact);
			}
		}
	}

	return artifacts;
}
