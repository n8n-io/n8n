import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { isActiveBuilderAgent, isBuilderAgent } from './builderAgents';

/** Tool calls that are internal bookkeeping and should not be shown to the user. */
export const HIDDEN_TOOLS = new Set(['updateWorkingMemory']);

/** Render hints whose tool calls produce no output in the timeline — they are
 *  represented elsewhere (child agent sections, artifact cards). */
const INVISIBLE_RENDER_HINTS = new Set(['data-table', 'eval-setup']);

/** Streamed tail text up to this length is treated as thinking narration;
 *  beyond it, it is likely the final answer and renders outside the block. */
const TAIL_NARRATION_MAX_LENGTH = 200;

type TextEntry = Extract<InstanceAiTimelineEntry, { type: 'text' }>;

/** First sentence of a streamed markdown-ish text, for trace status lines. */
export function firstSentence(content: string): string {
	const plain = content.replace(/[*_`#]/g, '').trim();
	const match = plain.match(/^.*?[.!?](?=\s|$)/s);
	return (match ? match[0] : plain).trim();
}

/**
 * The timeline reduced to renderable blocks.
 *
 * A `thinking` block is a maximal run of trace content — reasoning segments,
 * generic tool calls, and the intermediate narration text the model emits
 * between them — split only by user-facing content (answer text, plan
 * reviews, answered questions, task checklists, child agents). Invisible
 * entries (hidden tools, builder/planner hints, pending questions) are
 * dropped without splitting a run.
 */
export type TimelineBlock =
	| { type: 'thinking'; key: string; entries: InstanceAiTimelineEntry[]; active: boolean }
	| { type: 'text'; key: string; entry: TextEntry }
	| { type: 'tasks'; key: string; toolCall: InstanceAiToolCallState }
	| { type: 'plan-review'; key: string; toolCall: InstanceAiToolCallState }
	| { type: 'questions'; key: string; toolCall: InstanceAiToolCallState }
	| { type: 'child'; key: string; child: InstanceAiAgentNode };

type ToolCallKind =
	| 'hidden'
	| 'tasks'
	| 'plan-review'
	| 'questions'
	| 'questions-pending'
	| 'trace';

/**
 * How a tool call renders in the timeline. `trace` rows join thinking blocks;
 * `tasks`/`plan-review`/`questions` render standalone UI; `hidden` calls are
 * dropped without splitting a run.
 *
 * Builder calls delegated to a sub-agent (`*-with-agent`) are hidden — the
 * child agent section represents them. In-thread builds (`build-workflow`)
 * render as trace rows so the build step is visible inside the thinking block.
 */
function classifyToolCall(tc: InstanceAiToolCallState): ToolCallKind {
	if (HIDDEN_TOOLS.has(tc.toolName)) return 'hidden';
	if (tc.renderHint === 'tasks') return 'tasks';
	if (tc.renderHint === 'builder' && tc.toolName.endsWith('-with-agent')) return 'hidden';
	if (tc.renderHint && INVISIBLE_RENDER_HINTS.has(tc.renderHint)) return 'hidden';
	if (tc.confirmation?.inputType === 'plan-review') return 'plan-review';
	if (tc.renderHint === 'planner') return 'hidden';
	if (tc.confirmation?.inputType === 'questions') {
		return tc.isLoading ? 'questions-pending' : 'questions';
	}
	return 'trace';
}

function hasBuilderChildInResponse(
	responseId: string | undefined,
	builderChildResponseIds: Set<string>,
): boolean {
	return responseId !== undefined && builderChildResponseIds.has(responseId);
}

export function buildTimelineBlocks(
	entries: InstanceAiTimelineEntry[],
	toolCallsById: Record<string, InstanceAiToolCallState>,
	childrenById: Record<string, InstanceAiAgentNode>,
	agentStatus: InstanceAiAgentNode['status'],
): TimelineBlock[] {
	// A text entry is intermediate narration (part of the thinking trace) when
	// trace content from the SAME model response follows it — i.e. the model
	// kept working after writing it. Trailing text of a response (and text
	// without a responseId, from old snapshots) is user-facing.
	const lastTraceIdxByResponse = new Map<string, number>();
	const builderChildResponseIds = new Set(
		entries
			.filter(
				(entry): entry is Extract<InstanceAiTimelineEntry, { type: 'child' }> =>
					entry.type === 'child' &&
					entry.responseId !== undefined &&
					!!childrenById[entry.agentId] &&
					isBuilderAgent(childrenById[entry.agentId]),
			)
			.map((entry) => entry.responseId)
			.filter((responseId): responseId is string => responseId !== undefined),
	);

	entries.forEach((entry, idx) => {
		if (entry.responseId === undefined) return;
		if (entry.type === 'reasoning') {
			lastTraceIdxByResponse.set(entry.responseId, idx);
		} else if (entry.type === 'tool-call') {
			const tc = toolCallsById[entry.toolCallId];
			if (
				tc &&
				classifyToolCall(tc) === 'trace' &&
				!(
					tc.toolName === 'build-agent' &&
					hasBuilderChildInResponse(entry.responseId, builderChildResponseIds)
				)
			) {
				lastTraceIdxByResponse.set(entry.responseId, idx);
			}
		}
	});

	const isIntermediateText = (entry: TextEntry, idx: number): boolean => {
		if (entry.responseId === undefined) return false;
		const lastTraceIdx = lastTraceIdxByResponse.get(entry.responseId);
		if (lastTraceIdx !== undefined && lastTraceIdx > idx) return true;
		// Streaming tail text is ambiguous — narration before the next tool call
		// and the final answer look identical until either a tool call follows
		// or the run ends. Rendering it outside and folding it back in reads as
		// an answer flashing and vanishing, so short tail text following this
		// response's trace content is optimistically kept INSIDE the block (its
		// first sentence feeds the status line). It promotes out — an additive,
		// non-jarring motion — once it grows answer-length or the run settles.
		return (
			agentStatus === 'active' &&
			idx === entries.length - 1 &&
			lastTraceIdx !== undefined &&
			entry.content.length <= TAIL_NARRATION_MAX_LENGTH
		);
	};

	const blocks: TimelineBlock[] = [];
	let run: Extract<TimelineBlock, { type: 'thinking' }> | null = null;

	const pushStandalone = (block: TimelineBlock) => {
		run = null;
		blocks.push(block);
	};

	const pushTrace = (entry: InstanceAiTimelineEntry, idx: number) => {
		if (!run) {
			run = { type: 'thinking', key: `thinking-${idx}`, entries: [], active: false };
			blocks.push(run);
		}
		run.entries.push(entry);
	};

	entries.forEach((entry, idx) => {
		if (entry.type === 'reasoning') {
			pushTrace(entry, idx);
			return;
		}

		if (entry.type === 'text') {
			if (isIntermediateText(entry, idx)) pushTrace(entry, idx);
			else pushStandalone({ type: 'text', key: `text-${idx}`, entry });
			return;
		}

		if (entry.type === 'child') {
			const child = childrenById[entry.agentId];
			// Running builder sub-agents are extracted and rendered at the bottom
			// of the conversation by InstanceAiView; once a builder finishes it
			// reappears here in its chronological slot.
			if (child && !isActiveBuilderAgent(child)) {
				pushStandalone({ type: 'child', key: `child-${idx}`, child });
			}
			return;
		}

		const tc = toolCallsById[entry.toolCallId];
		if (!tc) return;
		if (
			tc.toolName === 'build-agent' &&
			hasBuilderChildInResponse(entry.responseId, builderChildResponseIds)
		) {
			return;
		}
		switch (classifyToolCall(tc)) {
			case 'tasks':
				pushStandalone({ type: 'tasks', key: `tasks-${idx}`, toolCall: tc });
				return;
			case 'plan-review':
				pushStandalone({ type: 'plan-review', key: `plan-${idx}`, toolCall: tc });
				return;
			case 'questions':
				pushStandalone({ type: 'questions', key: `questions-${idx}`, toolCall: tc });
				return;
			case 'trace':
				pushTrace(entry, idx);
				return;
			// hidden and pending question forms drop without splitting the run
			default:
				return;
		}
	});

	// While the agent streams, the trailing thinking block stays active as long
	// as only (tentative) text follows it — tail text may still fold back into
	// the block if same-response trace content arrives, so settling the block
	// early would flicker "Thought for Xs" → "Thinking". Real interruptions
	// (cards, questions, child agents) settle it immediately, and so does text
	// that outgrew the narration cap: it is a committed answer, so keeping the
	// block behind it "thinking" reads as lag.
	if (agentStatus === 'active') {
		for (let i = blocks.length - 1; i >= 0; i--) {
			const block = blocks[i];
			if (block.type === 'thinking') {
				block.active = true;
				break;
			}
			if (block.type !== 'text') break;
			if (block.entry.content.length > TAIL_NARRATION_MAX_LENGTH) break;
		}
	}

	return blocks;
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
	type: 'workflow' | 'data-table' | 'agent';
	resourceId: string;
	name: string;
	projectId?: string;
	/** ISO timestamp of the tool call that produced this artifact. */
	completedAt?: string;
}

/** Extract all artifacts (workflows, data tables, and agents) from a node's tool calls. */
export function extractArtifacts(node: InstanceAiAgentNode): ArtifactInfo[] {
	if (node.status !== 'completed') return [];

	const artifacts: ArtifactInfo[] = [];
	const seenIds = new Set<string>();

	// Check targetResource first (single-resource agents)
	if (node.targetResource?.id && node.targetResource.type) {
		const type = node.targetResource.type;
		if (type === 'workflow' || type === 'data-table' || type === 'agent') {
			seenIds.add(node.targetResource.id);
			const artifact: ArtifactInfo = {
				type,
				resourceId: node.targetResource.id,
				name: node.targetResource.name ?? node.subtitle ?? 'Untitled',
				completedAt: undefined,
			};
			if (node.targetResource.projectId) artifact.projectId = node.targetResource.projectId;
			artifacts.push(artifact);
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
