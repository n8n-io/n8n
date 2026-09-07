import { normalizeAgentTree } from '@n8n/api-types';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import type { AgentDbMessage, AgentTreeSnapshot } from '@n8n/instance-ai';
import { z } from 'zod';

import {
	cleanStoredUserMessage,
	extractAgentPreviewHandoffContext,
	extractEditorContextResourceAttachments,
} from './internal-messages';

type RunSnapshots = AgentTreeSnapshot[];

const textContentPartSchema = z.object({ type: z.literal('text'), text: z.string() });
const reasoningContentPartSchema = z.object({ type: z.literal('reasoning'), text: z.string() });

// ---------------------------------------------------------------------------
// Persisted message shapes
// ---------------------------------------------------------------------------

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

/** Concatenated text blocks of a stored message's content. Exported for the
 *  conversation-history service, which reads the same persisted rows. */
export function extractTextFromContent(content: unknown): string {
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

/**
 * Whether a snapshot tree carries anything worth rendering. An empty terminal tree —
 * e.g. a `cancelled` run whose events were lost before the
 * snapshot was built — has none of these, so the message renders without a tree.
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
		!!tree.setupItemsByWorkflowId ||
		!!tree.statusMessage ||
		!!tree.result ||
		!!tree.error
	);
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
 * Converts persisted native agent messages into rich InstanceAiMessage objects
 * with agent trees folded from the durable event log. A message whose run left
 * no log rows (eval-seeded threads, pre-log dev instances) renders from its
 * `content`/`reasoning` fields without a tree.
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
	// Messages whose `agentTree` is a renderable snapshot tree. Used by the
	// dedupe pass to transfer snapshot trees forward in the in-flight HITL case.
	const messagesWithSnapshotTree = new Set<InstanceAiMessage>();

	let lastUserMessageId: string | undefined;

	function pushSnapshotMessage(snapshot: AgentTreeSnapshot): void {
		const built = buildSnapshotMessage(snapshot);
		// A degenerate (empty) orphan snapshot must not count as authoritative in
		// the dedup collapse. Mirrors the paired-row guard.
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

			const snapshot = takeSnapshotForAssistant(msg, messageIndex);

			// Use the native runId from the snapshot (matches SSE events),
			// falling back to the user-message ID if no snapshot exists.
			const runId = snapshot?.runId ?? lastUserMessageId ?? msg.id;
			// A non-renderable tree (e.g. an empty `cancelled` tree from a run whose
			// events were lost) is never authoritative — leave the tree undefined and
			// let the message render from its own content instead.
			const snapshotIsRenderable = snapshot !== undefined && isRenderableTree(snapshot.tree);
			const agentTree = snapshotIsRenderable ? snapshot.tree : undefined;

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
	// In-flight HITL turns are different: the snapshot can pair with a
	// *middle* row of the turn via timestamp matching, leaving the latest
	// message without a tree. Keeping just the latest would drop the
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
		if (!messagesWithSnapshotTree.has(kept) && messagesWithSnapshotTree.has(candidate)) {
			kept.agentTree = candidate.agentTree;
			kept.runIds = candidate.runIds;
			messagesWithSnapshotTree.add(kept);
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
