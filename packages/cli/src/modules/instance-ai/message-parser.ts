import { getRenderHint, normalizeAgentTree } from '@n8n/api-types';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
	InstanceAiTimelineEntry,
} from '@n8n/api-types';
import { orchestratorAgentId } from '@n8n/instance-ai';
import type { AgentDbMessage, AgentTreeSnapshot, MessageContent } from '@n8n/instance-ai';
import { z } from 'zod';

import {
	cleanStoredUserMessage,
	extractAgentPreviewHandoffContext,
	extractEditorContextResourceAttachments,
} from './internal-messages';

type RunSnapshots = AgentTreeSnapshot[];

const toolCallContentPartSchema = z.object({
	type: z.literal('tool-call'),
	toolCallId: z.string(),
	toolName: z.string(),
	input: z.unknown().optional(),
	state: z.enum(['pending', 'resolved', 'rejected']).optional(),
	output: z.unknown().optional(),
	error: z.string().optional(),
});

const textContentPartSchema = z.object({ type: z.literal('text'), text: z.string() });
const reasoningContentPartSchema = z.object({ type: z.literal('reasoning'), text: z.string() });
const opaqueContentPartSchema = z
	.object({ type: z.enum(['invalid-tool-call', 'file', 'citation', 'provider']) })
	.passthrough();

const contentPartSchema = z.union([
	textContentPartSchema,
	reasoningContentPartSchema,
	toolCallContentPartSchema,
	opaqueContentPartSchema,
]);

// ---------------------------------------------------------------------------
// Persisted message shapes
// ---------------------------------------------------------------------------

interface StoredToolInvocation {
	state: 'result' | 'call' | 'partial-call';
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	error?: string;
}

type StoredContentPart = MessageContent;

export interface StoredAgentMessage {
	id: string;
	role: string;
	content: unknown;
	type?: string;
	createdAt: Date;
}

type ConversationStoredMessage = (AgentDbMessage | StoredAgentMessage) & {
	id: string;
	role: string;
	content: unknown;
	createdAt: Date;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractTextFromContent(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) return extractTextFromParts(content);
	return '';
}

function extractReasoningFromContent(content: unknown): string {
	if (typeof content === 'string') return '';
	if (Array.isArray(content)) return extractReasoningFromParts(content);
	return '';
}

function extractTextFromParts(parts: unknown[]): string {
	return parts
		.flatMap((p) => {
			const parsed = textContentPartSchema.safeParse(p);
			return parsed.success ? [parsed.data.text] : [];
		})
		.join('');
}

function extractReasoningFromParts(parts: unknown[]): string {
	return parts
		.flatMap((p) => {
			const parsed = reasoningContentPartSchema.safeParse(p);
			return parsed.success ? [parsed.data.text] : [];
		})
		.join('');
}

function extractParts(content: unknown): StoredContentPart[] | undefined {
	if (Array.isArray(content)) return content.filter(isStoredContentPart);
	return undefined;
}

function isStoredContentPart(value: unknown): value is StoredContentPart {
	return contentPartSchema.safeParse(value).success;
}

function toRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function nativeToolPartToInvocation(part: StoredContentPart): StoredToolInvocation | undefined {
	if (part.type !== 'tool-call') return undefined;

	const parsed = toolCallContentPartSchema.safeParse(part);
	if (!parsed.success) return undefined;
	const toolCall = parsed.data;

	const args = toRecord(toolCall.input);
	if (toolCall.state === 'resolved') {
		return {
			state: 'result',
			toolCallId: toolCall.toolCallId,
			toolName: toolCall.toolName,
			args,
			result: toolCall.output,
		};
	}
	if (toolCall.state === 'rejected') {
		return {
			state: 'result',
			toolCallId: toolCall.toolCallId,
			toolName: toolCall.toolName,
			args,
			error: toolCall.error,
		};
	}
	return {
		state: 'call',
		toolCallId: toolCall.toolCallId,
		toolName: toolCall.toolName,
		args,
	};
}

function extractToolInvocations(content: unknown): StoredToolInvocation[] {
	if (typeof content === 'string') return [];
	if (Array.isArray(content))
		return content.filter(isStoredContentPart).flatMap((part) => {
			const invocation = nativeToolPartToInvocation(part);
			return invocation ? [invocation] : [];
		});
	return [];
}

/**
 * Coarse per-row timing for reconstructed tool calls: the interval from the
 * previous stored message to this one brackets everything the response did.
 * Real per-call timestamps only exist in run snapshots; this approximation
 * lets a snapshot-less reload still show "Thought for Xs" (derived from
 * min-start/max-end across a thinking block) instead of a bare fallback.
 * Known coarseness: every call in a row shares the bracket, and an HITL pause
 * between rows counts as thinking time.
 */
interface RowTiming {
	startedAt: string;
	completedAt: string;
}

function buildToolCallState(
	invocation: StoredToolInvocation,
	timing?: RowTiming,
): InstanceAiToolCallState {
	const isCompleted = invocation.state === 'result';
	return {
		toolCallId: invocation.toolCallId,
		toolName: invocation.toolName,
		args: invocation.args,
		result: isCompleted ? invocation.result : undefined,
		error: isCompleted ? invocation.error : undefined,
		isLoading: !isCompleted,
		renderHint: getRenderHint(invocation.toolName),
		...(timing ? { startedAt: timing.startedAt } : {}),
		...(timing && isCompleted ? { completedAt: timing.completedAt } : {}),
	};
}

/**
 * Build a chronological timeline from native parts (preserves reasoning vs
 * tool-call vs text ordering). Falls back to a reasoning-first,
 * tool-calls-next heuristic when parts aren't available.
 *
 * `responseId` is a synthetic per-message id: each stored assistant row is one
 * LLM response, and the frontend needs response grouping to tell intermediate
 * narration (trace content follows in the same response) from final answers.
 * Without it, a reconstructed timeline renders every narration text outside
 * the thinking blocks, splitting them.
 */
function buildTimeline(
	textContent: string,
	reasoning: string,
	toolCalls: InstanceAiToolCallState[],
	parts?: StoredContentPart[],
	responseId?: string,
): InstanceAiTimelineEntry[] {
	const responseRef = responseId ? { responseId } : {};

	// If parts are available, use their ordering (chronologically accurate)
	if (parts?.length) {
		const timeline: InstanceAiTimelineEntry[] = [];
		for (const part of parts) {
			if (part.type === 'text' && part.text) {
				timeline.push({ type: 'text', content: part.text, ...responseRef });
			} else if (part.type === 'reasoning' && part.text) {
				timeline.push({ type: 'reasoning', content: part.text, ...responseRef });
			} else if (part.type === 'tool-call' && part.toolCallId) {
				timeline.push({ type: 'tool-call', toolCallId: part.toolCallId, ...responseRef });
			}
		}
		return timeline;
	}

	// No parts — heuristic: reasoning first, then tool calls, then text
	// (most common agent pattern)
	const timeline: InstanceAiTimelineEntry[] = [];
	if (reasoning) {
		timeline.push({ type: 'reasoning', content: reasoning, ...responseRef });
	}
	for (const tc of toolCalls) {
		timeline.push({ type: 'tool-call', toolCallId: tc.toolCallId, ...responseRef });
	}
	if (textContent) {
		timeline.push({ type: 'text', content: textContent, ...responseRef });
	}
	return timeline;
}

/**
 * Build a flat agent tree (orchestrator only) from tool invocations.
 * Used when no snapshot is available, or when falling back from a degenerate one.
 * `status` is inherited from the snapshot so a `cancelled` run still reads as cancelled.
 *
 * A reconstructed tree is always historical — there is no live stream feeding it — so a
 * non-terminal status is normalized to `completed` (a mid-run snapshot must not render as
 * busy forever), and any tool call left loading on a stopped run is settled, mirroring the
 * live `run-finish` reducer so a cancelled bubble doesn't show a spinner that never resolves.
 */
function buildFlatAgentTree(
	runId: string,
	textContent: string,
	reasoning: string,
	toolCalls: InstanceAiToolCallState[],
	parts?: StoredContentPart[],
	status: InstanceAiAgentNode['status'] = 'completed',
	responseId?: string,
): InstanceAiAgentNode {
	const resolvedStatus = status === 'active' ? 'completed' : status;
	const settledToolCalls =
		resolvedStatus === 'cancelled' || resolvedStatus === 'error'
			? toolCalls.map((tc) => (tc.isLoading ? { ...tc, isLoading: false } : tc))
			: toolCalls;
	return {
		agentId: orchestratorAgentId(runId),
		role: 'orchestrator',
		status: resolvedStatus,
		textContent,
		reasoning,
		toolCalls: settledToolCalls,
		children: [],
		timeline: buildTimeline(textContent, reasoning, settledToolCalls, parts, responseId),
	};
}

/**
 * Whether a snapshot tree carries anything worth rendering. An empty terminal tree —
 * e.g. a `cancelled` run whose events were evicted from the in-memory bus before the
 * snapshot was built — has none of these, so the message-derived flat tree is preferred.
 */
function isRenderableTree(tree: InstanceAiAgentNode): boolean {
	return (
		tree.children.length > 0 ||
		tree.toolCalls.length > 0 ||
		tree.timeline.length > 0 ||
		tree.textContent.length > 0 ||
		tree.reasoning.length > 0 ||
		(tree.planItems?.length ?? 0) > 0 ||
		!!tree.tasks ||
		!!tree.statusMessage ||
		!!tree.result ||
		!!tree.error
	);
}

/**
 * Merge an earlier flat orchestrator tree into a later one (earlier content first).
 * Aggregates the assistant rows of a turn whose snapshot is empty so the whole turn's
 * orchestrator activity renders as one bubble after the dedup collapse, instead of
 * keeping only the last row.
 */
function mergeFlatAgentTrees(
	earlier: InstanceAiAgentNode,
	later: InstanceAiAgentNode,
): InstanceAiAgentNode {
	return {
		...later,
		textContent: [earlier.textContent, later.textContent].filter(Boolean).join('\n\n'),
		reasoning: [earlier.reasoning, later.reasoning].filter(Boolean).join('\n\n'),
		toolCalls: [...earlier.toolCalls, ...later.toolCalls],
		timeline: [...earlier.timeline, ...later.timeline],
	};
}

function snapshotTimestamp(snapshot: AgentTreeSnapshot): string {
	return (snapshot.updatedAt ?? snapshot.createdAt ?? new Date(0)).toISOString();
}

function snapshotCreatedAtMs(snapshot: AgentTreeSnapshot): number | undefined {
	return snapshot.createdAt?.getTime();
}

function messageCreatedAtMs(message: { createdAt: Date }): number {
	return message.createdAt.getTime();
}

function getNextConversationMessageTimestamp(
	messages: ConversationStoredMessage[],
	currentIndex: number,
): number | undefined {
	for (let i = currentIndex + 1; i < messages.length; i++) {
		const role = messages[i].role;
		if (role === 'user' || role === 'assistant') return messageCreatedAtMs(messages[i]);
	}
	return undefined;
}

function buildSnapshotMessage(snapshot: AgentTreeSnapshot): InstanceAiMessage {
	const groupId = snapshot.messageGroupId ?? snapshot.runId;
	return {
		id: groupId,
		runId: snapshot.runId,
		messageGroupId: snapshot.messageGroupId,
		runIds: snapshot.runIds,
		role: 'assistant',
		createdAt: snapshotTimestamp(snapshot),
		content: snapshot.tree.textContent,
		reasoning: snapshot.tree.reasoning,
		isStreaming: false,
		agentTree: snapshot.tree,
	};
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Durable-log instrumentation: counts assistant messages that rendered from
 * the message-derived fallback ladder instead of a renderable snapshot tree.
 * Forwarded to the metrics pipeline via DurableLogMetrics.notifyParserFallbacks.
 */
export const messageParserStats = { fallbackActivations: 0 };

/**
 * Converts persisted native agent messages into rich InstanceAiMessage objects
 * with agent trees (from snapshots or reconstructed flat trees).
 */
export function parseStoredMessages(
	storedMessages: Array<AgentDbMessage | StoredAgentMessage>,
	snapshots?: RunSnapshots,
): InstanceAiMessage[] {
	const messages: InstanceAiMessage[] = [];
	const snapshotList = snapshots ?? [];

	const conversationMessages = storedMessages.filter(
		(message): message is ConversationStoredMessage => 'role' in message,
	);

	// Snapshots are stored chronologically, so use their DB timestamps to place
	// orphan snapshots before, between, or after assistant rows.
	let nextSnapshotIdx = 0;
	const consumedSnapshots = new Set<AgentTreeSnapshot>();
	// Messages whose `agentTree` originated from a snapshot (as opposed to
	// being synthesized by `buildFlatAgentTree`). Used by the dedupe pass to
	// prefer transferring snapshot trees forward in the in-flight HITL case.
	const messagesWithSnapshotTree = new Set<InstanceAiMessage>();

	let lastUserMessageId: string | undefined;

	function pushSnapshotMessage(snapshot: AgentTreeSnapshot): void {
		const built = buildSnapshotMessage(snapshot);
		// A degenerate (empty) orphan snapshot must not count as authoritative: when the
		// turn also has message rows, their reconstructed flat tree must win the dedup
		// collapse instead of this empty tree clobbering it. Mirrors the paired-row guard.
		if (isRenderableTree(snapshot.tree)) messagesWithSnapshotTree.add(built);
		messages.push(built);
	}

	function appendChronologicalOrphansBefore(message: ConversationStoredMessage): void {
		const messageTimestamp = messageCreatedAtMs(message);
		while (nextSnapshotIdx < snapshotList.length) {
			const snapshot = snapshotList[nextSnapshotIdx];
			const snapshotTimestamp = snapshotCreatedAtMs(snapshot);
			if (snapshotTimestamp === undefined || snapshotTimestamp >= messageTimestamp) return;

			consumedSnapshots.add(snapshot);
			pushSnapshotMessage(snapshot);
			nextSnapshotIdx++;
		}
	}

	function takeSnapshotForAssistant(
		message: ConversationStoredMessage,
		messageIndex: number,
	): AgentTreeSnapshot | undefined {
		appendChronologicalOrphansBefore(message);

		const snapshot = snapshotList[nextSnapshotIdx];
		if (!snapshot) return undefined;

		const nextMessageTimestamp = getNextConversationMessageTimestamp(
			conversationMessages,
			messageIndex,
		);
		const snapshotTimestamp = snapshotCreatedAtMs(snapshot);
		if (
			snapshotTimestamp === undefined ||
			(nextMessageTimestamp !== undefined && snapshotTimestamp > nextMessageTimestamp)
		) {
			return undefined;
		}

		consumedSnapshots.add(snapshot);
		nextSnapshotIdx++;
		return snapshot;
	}

	for (const [messageIndex, msg] of conversationMessages.entries()) {
		appendChronologicalOrphansBefore(msg);
		const text = extractTextFromContent(msg.content);

		if (msg.role === 'user') {
			lastUserMessageId = msg.id;

			// Strip LLM-facing enrichment and hide internal auto-follow-up messages.
			const content = cleanStoredUserMessage(text);
			if (content === null) continue;

			// Rebuild the editor hand-off's resource attachments (workflow/agent) so
			// the UI can re-surface them (chip + artifact) after a reload.
			const attachments = extractEditorContextResourceAttachments(text);
			const context = extractAgentPreviewHandoffContext(text);

			messages.push({
				id: msg.id,
				role: 'user',
				createdAt: msg.createdAt.toISOString(),
				content,
				reasoning: '',
				isStreaming: false,
				...(attachments.length > 0 ? { attachments } : {}),
				...(context ? { context } : {}),
			});
			continue;
		}

		if (msg.role === 'assistant') {
			const reasoning = extractReasoningFromContent(msg.content);
			const invocations = extractToolInvocations(msg.content);
			const prevMessage = messageIndex > 0 ? conversationMessages[messageIndex - 1] : undefined;
			const timing: RowTiming | undefined = prevMessage
				? {
						startedAt: prevMessage.createdAt.toISOString(),
						completedAt: msg.createdAt.toISOString(),
					}
				: undefined;
			const toolCalls = invocations.map((invocation) => buildToolCallState(invocation, timing));
			const parts = extractParts(msg.content);

			const snapshot = takeSnapshotForAssistant(msg, messageIndex);

			// Use the native runId from the snapshot (matches SSE events),
			// falling back to the user-message ID if no snapshot exists.
			const runId = snapshot?.runId ?? lastUserMessageId ?? msg.id;
			// The message id doubles as the synthetic responseId: one stored
			// assistant row = one LLM response, and unlike `runId` (which falls
			// back to the user-message id shared by the whole turn) it is unique
			// per row, so response grouping survives the flat-tree merge.
			const messageFlatTree =
				toolCalls.length > 0 || text || reasoning
					? buildFlatAgentTree(
							runId,
							text,
							reasoning,
							toolCalls,
							parts,
							snapshot?.tree.status,
							msg.id,
						)
					: undefined;
			// Carry the cancellation cause onto the fallback tree so a stopped run is
			// still attributable (user/timeout/shutdown) after the snapshot was lost.
			if (messageFlatTree && snapshot?.tree.cancellationReason) {
				messageFlatTree.cancellationReason = snapshot.tree.cancellationReason;
			}
			// Prefer the snapshot tree, but when it carries no renderable content (e.g. an
			// empty `cancelled` tree from a run whose events were lost before the snapshot
			// was built) fall back to the message-derived flat tree so the turn's work still
			// renders on reload. A non-renderable snapshot is never authoritative — if there
			// is no flat tree either, leave the tree undefined rather than re-admitting the
			// empty one.
			const snapshotIsRenderable = snapshot !== undefined && isRenderableTree(snapshot.tree);
			const agentTree = snapshotIsRenderable ? snapshot.tree : messageFlatTree;
			if (!snapshotIsRenderable && messageFlatTree) messageParserStats.fallbackActivations++;

			const assistantMessage: InstanceAiMessage = {
				id: msg.id,
				runId,
				messageGroupId: snapshot?.messageGroupId,
				runIds: snapshot?.runIds,
				role: 'assistant',
				createdAt: msg.createdAt.toISOString(),
				content: text,
				reasoning,
				isStreaming: false,
				agentTree,
			};
			// Only treat the message as snapshot-backed when the snapshot tree is the one
			// being rendered — a degenerate snapshot must not suppress the flat-tree
			// aggregation in the dedup pass below.
			if (snapshotIsRenderable) messagesWithSnapshotTree.add(assistantMessage);
			messages.push(assistantMessage);
			continue;
		}

		// Skip tool/system messages — they are represented via tool invocations
		// in the assistant message's content
	}

	for (const snapshot of snapshots ?? []) {
		if (consumedSnapshots.has(snapshot)) continue;
		pushSnapshotMessage(snapshot);
	}

	// Propagate messageGroupId across assistant rows in the same conversational
	// turn so the dedup pass below collapses them into a single rendered message.
	//
	// Planned-task follow-ups (build → checkpoint → synthesize) produce one
	// real user message followed by several orchestrator sub-runs separated by
	// internal `<planned-task-follow-up>` user messages (filtered out earlier).
	// `takeSnapshotForAssistant` only pairs the sub-runs whose snapshot
	// timestamp lines up — the intra-turn text rows ("On it!", "The trigger
	// is…") stay unpaired and their text is also embedded in the final paired
	// snapshot's `tree.textContent`. Without this propagation those unpaired
	// rows survive the dedup loop and render as duplicates after a page
	// reload (the live SSE path used to merge them via the run-start reducer).
	propagateMessageGroupIdAcrossTurns(messages);

	// Deduplicate assistant messages by messageGroupId.
	// Follow-up runs in the same group produce separate DB rows; keep only
	// the latest (which carries the full runIds array and complete tree).
	//
	// In-flight HITL turns are different: the snapshot is paired with a
	// *middle* checkpoint message via timestamp matching, and the latest
	// message in the turn has only an auto-generated flat tree from
	// `buildFlatAgentTree`. Keeping just the latest would drop the
	// snapshot's tree (including its live confirmation cards), so transfer
	// the snapshot's `agentTree` + `runIds` onto the kept message when the
	// kept one's tree didn't come from a snapshot.
	const keptIndexByGid = new Map<string, number>();
	const toRemove = new Set<number>();
	for (let i = messages.length - 1; i >= 0; i--) {
		const gid = messages[i].messageGroupId;
		if (!gid) continue;
		const keptIdx = keptIndexByGid.get(gid);
		if (keptIdx === undefined) {
			keptIndexByGid.set(gid, i);
			continue;
		}
		const kept = messages[keptIdx];
		const candidate = messages[i];
		if (!messagesWithSnapshotTree.has(kept)) {
			if (messagesWithSnapshotTree.has(candidate)) {
				kept.agentTree = candidate.agentTree;
				kept.runIds = candidate.runIds;
				messagesWithSnapshotTree.add(kept);
			} else if (candidate.agentTree) {
				// Neither row is snapshot-backed (degenerate-snapshot turn): aggregate the
				// earlier row's flat-tree activity into the kept bubble so the whole turn's
				// orchestrator work survives the collapse instead of just the last row.
				kept.agentTree = kept.agentTree
					? mergeFlatAgentTrees(candidate.agentTree, kept.agentTree)
					: candidate.agentTree;
			}
		}
		toRemove.add(i);
	}
	for (let i = messages.length - 1; i >= 0; i--) {
		if (toRemove.has(i)) messages.splice(i, 1);
	}

	for (const msg of messages) {
		if (msg.agentTree) normalizeAgentTree(msg.agentTree);
	}

	return messages;
}

/**
 * For each conversational turn (delimited by real user messages), find the
 * latest assistant message that already has a `messageGroupId` (i.e. was
 * paired with a snapshot) and copy that id onto every unpaired assistant
 * message in the same turn.
 */
function propagateMessageGroupIdAcrossTurns(messages: InstanceAiMessage[]): void {
	let turnStart = 0;
	for (let i = 0; i <= messages.length; i++) {
		const atBoundary = i === messages.length || messages[i].role === 'user';
		if (!atBoundary) continue;
		propagateMessageGroupIdWithinRange(messages, turnStart, i);
		turnStart = i + 1;
	}
}

function propagateMessageGroupIdWithinRange(
	messages: InstanceAiMessage[],
	start: number,
	end: number,
): void {
	let turnGroupId: string | undefined;
	for (let i = end - 1; i >= start; i--) {
		const gid = messages[i].messageGroupId;
		if (gid) {
			turnGroupId = gid;
			break;
		}
	}
	if (!turnGroupId) return;
	for (let i = start; i < end; i++) {
		const msg = messages[i];
		if (msg.role === 'assistant' && !msg.messageGroupId) {
			msg.messageGroupId = turnGroupId;
		}
	}
}

/** Pull every confirmation requestId out of the parsed messages' agent trees. */
/**
 * A confirmation card is "actionable" only while the user can still respond to
 * it: the tool call is in-flight and no terminal status has been recorded.
 * Once approved/denied (or otherwise settled) the card is historical — its
 * pending-confirmation row is gone after claim/delete, but that absence means
 * "resolved", not "expired".
 */
function isActionableConfirmation(tc: InstanceAiToolCallState): boolean {
	return (
		tc.confirmation !== undefined &&
		tc.isLoading &&
		tc.confirmationStatus !== 'approved' &&
		tc.confirmationStatus !== 'denied'
	);
}

export function collectConfirmationRequestIds(messages: InstanceAiMessage[]): string[] {
	const requestIds: string[] = [];
	for (const message of messages) {
		if (!message.agentTree) continue;
		walkAgentNodes(message.agentTree, (node) => {
			for (const tc of node.toolCalls) {
				const { confirmation } = tc;
				if (!confirmation || !isActionableConfirmation(tc)) continue;
				requestIds.push(confirmation.requestId);
			}
		});
	}
	return requestIds;
}

/**
 * Flip `confirmation.expired = true` on still-actionable cards whose
 * pending-confirmation row is no longer live. Settled cards (approved/denied,
 * or no longer loading) are left untouched — their row is also gone, but that
 * means "resolved", not "expired", so relabeling them would rewrite history.
 */
export function markExpiredConfirmations(
	messages: InstanceAiMessage[],
	liveRequestIds: Set<string>,
): void {
	for (const message of messages) {
		if (!message.agentTree) continue;
		walkAgentNodes(message.agentTree, (node) => {
			for (const tc of node.toolCalls) {
				const { confirmation } = tc;
				if (!confirmation || !isActionableConfirmation(tc)) continue;
				if (!liveRequestIds.has(confirmation.requestId)) {
					confirmation.expired = true;
				}
			}
		});
	}
}

function walkAgentNodes(
	node: InstanceAiAgentNode,
	visit: (node: InstanceAiAgentNode) => void,
): void {
	visit(node);
	for (const child of node.children) walkAgentNodes(child, visit);
}
