import type {
	InstanceAiConfirmation,
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { orchestratorAgentId } from '@n8n/instance-ai';
import type { AgentDbMessage, AgentTreeSnapshot } from '@n8n/instance-ai';
import { z } from 'zod';

import {
	cleanStoredUserMessage,
	extractEditorContextWorkflowAttachments,
} from './internal-messages';
import {
	buildToolCallState,
	extractParts,
	extractToolInvocations,
	type StoredContentPart,
} from './message-parser-tool-call-state';
import {
	buildSnapshotMessage,
	createSnapshotCorrelator,
	dedupeAssistantMessagesByMessageGroup,
	propagateMessageGroupIdAcrossTurns,
} from './message-parser-snapshot-correlation';

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

/**
 * Build a chronological timeline from native parts (preserves tool-call vs text ordering).
 * Falls back to tool-calls-first heuristic when parts aren't available.
 */
function buildTimeline(
	textContent: string,
	toolCalls: InstanceAiToolCallState[],
	parts?: StoredContentPart[],
): InstanceAiTimelineEntry[] {
	// If parts are available, use their ordering (chronologically accurate)
	if (parts?.length) {
		const timeline: InstanceAiTimelineEntry[] = [];
		for (const part of parts) {
			if (part.type === 'text' && part.text) {
				timeline.push({ type: 'text', content: part.text });
			} else if (part.type === 'tool-call' && part.toolCallId) {
				timeline.push({ type: 'tool-call', toolCallId: part.toolCallId });
			}
		}
		return timeline;
	}

	// No parts — heuristic: tool calls first, then text (most common agent pattern)
	const timeline: InstanceAiTimelineEntry[] = [];
	for (const tc of toolCalls) {
		timeline.push({ type: 'tool-call', toolCallId: tc.toolCallId });
	}
	if (textContent) {
		timeline.push({ type: 'text', content: textContent });
	}
	return timeline;
}

/**
 * Build a flat agent tree (orchestrator only) from tool invocations.
 * Used when no snapshot is available for a given run.
 */
function buildFlatAgentTree(
	runId: string,
	textContent: string,
	reasoning: string,
	toolCalls: InstanceAiToolCallState[],
	parts?: StoredContentPart[],
): InstanceAiAgentNode {
	return {
		agentId: orchestratorAgentId(runId),
		role: 'orchestrator',
		status: 'completed',
		textContent,
		reasoning,
		toolCalls,
		children: [],
		timeline: buildTimeline(textContent, toolCalls, parts),
	};
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Converts persisted native agent messages into rich InstanceAiMessage objects
 * with agent trees (from snapshots or reconstructed flat trees).
 */
export function parseStoredMessages(
	storedMessages: Array<AgentDbMessage | StoredAgentMessage>,
	snapshots?: RunSnapshots,
	options: {
		confirmationsByToolCallId?: ReadonlyMap<string, InstanceAiConfirmation>;
	} = {},
): InstanceAiMessage[] {
	const messages: InstanceAiMessage[] = [];

	const conversationMessages = storedMessages.filter(
		(message): message is ConversationStoredMessage => 'role' in message,
	);

	// Messages whose `agentTree` originated from a snapshot (as opposed to
	// being synthesized by `buildFlatAgentTree`). Used by the dedupe pass to
	// prefer transferring snapshot trees forward in the in-flight HITL case.
	const messagesWithSnapshotTree = new Set<InstanceAiMessage>();

	let lastUserMessageId: string | undefined;

	function pushSnapshotMessage(snapshot: AgentTreeSnapshot): void {
		const built = buildSnapshotMessage(snapshot);
		messagesWithSnapshotTree.add(built);
		messages.push(built);
	}

	const snapshotCorrelator = createSnapshotCorrelator({
		snapshots,
		conversationMessages,
		pushSnapshotMessage,
	});

	for (const [messageIndex, msg] of conversationMessages.entries()) {
		snapshotCorrelator.appendChronologicalOrphansBefore(msg);
		const text = extractTextFromContent(msg.content);

		if (msg.role === 'user') {
			lastUserMessageId = msg.id;

			// Strip LLM-facing enrichment and hide internal auto-follow-up messages.
			const content = cleanStoredUserMessage(text);
			if (content === null) continue;

			// Rebuild the editor hand-off's workflow attachments so the UI can
			// re-surface them (chip + artifact) after a reload.
			const attachments = extractEditorContextWorkflowAttachments(text);

			messages.push({
				id: msg.id,
				role: 'user',
				createdAt: msg.createdAt.toISOString(),
				content,
				reasoning: '',
				isStreaming: false,
				...(attachments.length > 0 ? { attachments } : {}),
			});
			continue;
		}

		if (msg.role === 'assistant') {
			const reasoning = extractReasoningFromContent(msg.content);
			const invocations = extractToolInvocations(msg.content);
			const toolCalls = invocations.map((invocation) =>
				buildToolCallState(
					invocation,
					options.confirmationsByToolCallId?.get(invocation.toolCallId),
				),
			);
			const parts = extractParts(msg.content);

			const snapshot = snapshotCorrelator.takeSnapshotForAssistant(msg, messageIndex);

			// Use the native runId from the snapshot (matches SSE events),
			// falling back to the user-message ID if no snapshot exists.
			const runId = snapshot?.runId ?? lastUserMessageId ?? msg.id;
			const agentTree =
				snapshot?.tree ??
				(toolCalls.length > 0 || text
					? buildFlatAgentTree(runId, text, reasoning, toolCalls, parts)
					: undefined);

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
			if (snapshot) messagesWithSnapshotTree.add(assistantMessage);
			messages.push(assistantMessage);
			continue;
		}

		// Skip tool/system messages — they are represented via tool invocations
		// in the assistant message's content
	}

	snapshotCorrelator.pushUnconsumedSnapshots();

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
	dedupeAssistantMessagesByMessageGroup(messages, messagesWithSnapshotTree);

	return messages;
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
