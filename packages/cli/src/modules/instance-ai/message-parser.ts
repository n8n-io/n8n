import { getRenderHint } from '@n8n/api-types';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
	InstanceAiTimelineEntry,
} from '@n8n/api-types';
import type { AgentDbMessage, AgentTreeSnapshot, MessageContent } from '@n8n/instance-ai';

import { cleanStoredUserMessage } from './internal-messages';

type RunSnapshots = AgentTreeSnapshot[];

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

/**
 * Persisted content parts in `instance_ai_messages.content` are JSON-encoded
 * `MessageContent` objects produced by the @n8n/agents SDK. We narrow against
 * that canonical type so downstream readers fail at compile time if the SDK
 * shape (e.g. the `'tool-call' state: 'resolved' + output` union) changes.
 */
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
		.filter(
			(p): p is { type: 'text'; text: string } =>
				typeof p === 'object' &&
				p !== null &&
				'type' in p &&
				p.type === 'text' &&
				'text' in p &&
				typeof p.text === 'string',
		)
		.map((p) => p.text)
		.join('');
}

function extractReasoningFromParts(parts: unknown[]): string {
	return parts
		.filter(
			(p): p is { type: 'reasoning'; text: string } =>
				typeof p === 'object' &&
				p !== null &&
				'type' in p &&
				p.type === 'reasoning' &&
				'text' in p &&
				typeof p.text === 'string',
		)
		.map((p) => p.text)
		.join('');
}

function extractParts(content: unknown): StoredContentPart[] | undefined {
	if (Array.isArray(content)) return content.filter(isStoredContentPart);
	return undefined;
}

const KNOWN_CONTENT_PART_TYPES = new Set<MessageContent['type']>([
	'text',
	'tool-call',
	'invalid-tool-call',
	'reasoning',
	'file',
	'citation',
	'provider',
]);

function isStoredContentPart(value: unknown): value is StoredContentPart {
	if (typeof value !== 'object' || value === null) return false;
	const type = (value as { type?: unknown }).type;
	return typeof type === 'string' && KNOWN_CONTENT_PART_TYPES.has(type as MessageContent['type']);
}

function toRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function nativeToolPartToInvocation(part: StoredContentPart): StoredToolInvocation | undefined {
	if (part.type !== 'tool-call') return undefined;
	// `ContentToolCall` is a discriminated union on `state`:
	//   'pending'  — call in flight, no result yet
	//   'resolved' — completed with `output`
	//   'rejected' — failed with `error`
	// The output/error live on the SAME part as the call; there is no separate
	// `tool-result` content part in the persisted shape.
	const args = toRecord(part.input);
	if (part.state === 'resolved') {
		return {
			state: 'result',
			toolCallId: part.toolCallId,
			toolName: part.toolName,
			args,
			result: part.output,
		};
	}
	if (part.state === 'rejected') {
		return {
			state: 'result',
			toolCallId: part.toolCallId,
			toolName: part.toolName,
			args,
			error: part.error,
		};
	}
	return {
		state: 'call',
		toolCallId: part.toolCallId,
		toolName: part.toolName,
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

function buildToolCallState(invocation: StoredToolInvocation): InstanceAiToolCallState {
	const isCompleted = invocation.state === 'result';
	return {
		toolCallId: invocation.toolCallId,
		toolName: invocation.toolName,
		args: invocation.args,
		result: isCompleted ? invocation.result : undefined,
		error: isCompleted ? invocation.error : undefined,
		isLoading: !isCompleted,
		renderHint: getRenderHint(invocation.toolName),
	};
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
	textContent: string,
	reasoning: string,
	toolCalls: InstanceAiToolCallState[],
	parts?: StoredContentPart[],
): InstanceAiAgentNode {
	return {
		agentId: 'agent-001',
		role: 'orchestrator',
		status: 'completed',
		textContent,
		reasoning,
		toolCalls,
		children: [],
		timeline: buildTimeline(textContent, toolCalls, parts),
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
		messagesWithSnapshotTree.add(built);
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

			messages.push({
				id: msg.id,
				role: 'user',
				createdAt: msg.createdAt.toISOString(),
				content,
				reasoning: '',
				isStreaming: false,
			});
			continue;
		}

		if (msg.role === 'assistant') {
			const reasoning = extractReasoningFromContent(msg.content);
			const invocations = extractToolInvocations(msg.content);
			const toolCalls = invocations.map(buildToolCallState);
			const parts = extractParts(msg.content);

			const snapshot = takeSnapshotForAssistant(msg, messageIndex);

			// Use the native runId from the snapshot (matches SSE events),
			// falling back to the user-message ID if no snapshot exists.
			const runId = snapshot?.runId ?? lastUserMessageId ?? msg.id;
			const agentTree =
				snapshot?.tree ??
				(toolCalls.length > 0 || text
					? buildFlatAgentTree(text, reasoning, toolCalls, parts)
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
export function collectConfirmationRequestIds(messages: InstanceAiMessage[]): string[] {
	const requestIds: string[] = [];
	for (const message of messages) {
		if (!message.agentTree) continue;
		walkAgentNodes(message.agentTree, (node) => {
			for (const tc of node.toolCalls) {
				const requestId = tc.confirmation?.requestId;
				if (requestId) requestIds.push(requestId);
			}
		});
	}
	return requestIds;
}

/** Flip `confirmation.expired = true` on every card whose requestId is not in `liveRequestIds`. */
export function markExpiredConfirmations(
	messages: InstanceAiMessage[],
	liveRequestIds: Set<string>,
): void {
	for (const message of messages) {
		if (!message.agentTree) continue;
		walkAgentNodes(message.agentTree, (node) => {
			for (const tc of node.toolCalls) {
				if (!tc.confirmation) continue;
				if (!liveRequestIds.has(tc.confirmation.requestId)) {
					tc.confirmation.expired = true;
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
