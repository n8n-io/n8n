import { getRenderHint } from '@n8n/api-types';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
	InstanceAiTimelineEntry,
} from '@n8n/api-types';
import type { AgentTreeSnapshot } from '@n8n/instance-ai';

import { cleanStoredUserMessage } from './internal-messages';

type RunSnapshots = AgentTreeSnapshot[];

// ---------------------------------------------------------------------------
// Mastra V2 message shape (as stored in the DB)
// ---------------------------------------------------------------------------

interface MastraToolInvocation {
	state: 'result' | 'call' | 'partial-call';
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
}

interface MastraContentPart {
	type: string;
	text?: string;
	toolInvocation?: MastraToolInvocation;
}

interface MastraContentV2 {
	format?: number;
	parts?: MastraContentPart[];
	toolInvocations?: MastraToolInvocation[];
	reasoning?: Array<{ text: string }>;
	content?: string;
}

export interface MastraDBMessage {
	id: string;
	role: string;
	/** Content from Mastra storage — unknown because it's read from DB via Record<string, unknown>. */
	content: unknown;
	type?: string;
	createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type guard: narrows unknown content to MastraContentV2 (object with format or known V2 fields). */
function isV2Content(content: unknown): content is MastraContentV2 {
	return content !== null && typeof content === 'object' && !Array.isArray(content);
}

function extractTextFromContent(content: unknown): string {
	if (typeof content === 'string') return content;
	if (!isV2Content(content)) return '';

	// V2 shortcut
	if (content.content) return content.content;

	// V2 parts array
	if (content.parts) {
		return content.parts
			.filter((p) => p.type === 'text' && p.text)
			.map((p) => p.text!)
			.join('');
	}

	return '';
}

function extractReasoningFromContent(content: unknown): string {
	if (typeof content === 'string') return '';
	if (!isV2Content(content)) return '';

	// V2 top-level reasoning array
	if (content.reasoning?.length) {
		return content.reasoning.map((r) => r.text).join('');
	}

	// V2 reasoning parts
	if (content.parts) {
		return content.parts
			.filter((p) => p.type === 'reasoning' && p.text)
			.map((p) => p.text!)
			.join('');
	}

	return '';
}

function extractParts(content: unknown): MastraContentPart[] | undefined {
	if (!isV2Content(content)) return undefined;
	return content.parts;
}

function extractToolInvocations(content: unknown): MastraToolInvocation[] {
	if (typeof content === 'string') return [];
	if (!isV2Content(content)) return [];

	// V2 top-level toolInvocations (preferred)
	if (content.toolInvocations?.length) return content.toolInvocations;

	// V2 parts-based tool invocations
	if (content.parts) {
		return content.parts
			.filter((p) => p.type === 'tool-invocation' && p.toolInvocation)
			.map((p) => p.toolInvocation!);
	}

	return [];
}

function buildToolCallState(invocation: MastraToolInvocation): InstanceAiToolCallState {
	const isCompleted = invocation.state === 'result';
	return {
		toolCallId: invocation.toolCallId,
		toolName: invocation.toolName,
		args: invocation.args,
		result: isCompleted ? invocation.result : undefined,
		isLoading: !isCompleted,
		renderHint: getRenderHint(invocation.toolName),
	};
}

/**
 * Build a chronological timeline from V2 parts (preserves tool-call vs text ordering).
 * Falls back to tool-calls-first heuristic when parts aren't available.
 */
function buildTimeline(
	textContent: string,
	toolCalls: InstanceAiToolCallState[],
	parts?: MastraContentPart[],
): InstanceAiTimelineEntry[] {
	// If parts are available, use their ordering (chronologically accurate)
	if (parts?.length) {
		const timeline: InstanceAiTimelineEntry[] = [];
		for (const part of parts) {
			if (part.type === 'text' && part.text) {
				timeline.push({ type: 'text', content: part.text });
			} else if (part.type === 'tool-invocation' && part.toolInvocation) {
				timeline.push({ type: 'tool-call', toolCallId: part.toolInvocation.toolCallId });
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
	parts?: MastraContentPart[],
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

function messageCreatedAtMs(message: MastraDBMessage): number {
	return message.createdAt.getTime();
}

function getNextConversationMessageTimestamp(
	messages: MastraDBMessage[],
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
 * Converts raw Mastra DB messages into rich InstanceAiMessage objects
 * with agent trees (from snapshots or reconstructed flat trees).
 */
export function parseStoredMessages(
	mastraMessages: MastraDBMessage[],
	snapshots?: RunSnapshots,
): InstanceAiMessage[] {
	const messages: InstanceAiMessage[] = [];
	const snapshotList = snapshots ?? [];

	// Snapshots are stored chronologically. DB-backed snapshots have timestamps,
	// so use them to place orphan snapshots before, between, or after assistant
	// rows. Older tests and legacy snapshots may not have timestamps; for those,
	// keep the positional alignment behavior.
	const assistantCount = mastraMessages.filter((m) => m.role === 'assistant').length;
	const hasSnapshotTimestamps = snapshotList.some((snapshot) => snapshot.createdAt !== undefined);
	const snapshotCount = snapshotList.length;
	const snapshotOffset =
		!hasSnapshotTimestamps && snapshotCount <= assistantCount ? assistantCount - snapshotCount : 0;
	let assistantIdx = 0;
	let nextSnapshotIdx = 0;
	const consumedSnapshots = new Set<AgentTreeSnapshot>();

	let lastUserMessageId: string | undefined;

	function appendChronologicalOrphansBefore(message: MastraDBMessage): void {
		if (!hasSnapshotTimestamps) return;

		const messageTimestamp = messageCreatedAtMs(message);
		while (nextSnapshotIdx < snapshotList.length) {
			const snapshot = snapshotList[nextSnapshotIdx];
			const snapshotTimestamp = snapshotCreatedAtMs(snapshot);
			if (snapshotTimestamp === undefined || snapshotTimestamp >= messageTimestamp) return;

			consumedSnapshots.add(snapshot);
			messages.push(buildSnapshotMessage(snapshot));
			nextSnapshotIdx++;
		}
	}

	function takeSnapshotForAssistant(
		message: MastraDBMessage,
		messageIndex: number,
	): AgentTreeSnapshot | undefined {
		if (!hasSnapshotTimestamps) {
			const snapshotIdx = assistantIdx - snapshotOffset;
			const snapshot =
				snapshotIdx >= 0 && snapshotIdx < snapshotList.length
					? snapshotList[snapshotIdx]
					: undefined;
			if (snapshot) consumedSnapshots.add(snapshot);
			return snapshot;
		}

		appendChronologicalOrphansBefore(message);

		const snapshot = snapshotList[nextSnapshotIdx];
		if (!snapshot) return undefined;

		const nextMessageTimestamp = getNextConversationMessageTimestamp(mastraMessages, messageIndex);
		const snapshotTimestamp = snapshotCreatedAtMs(snapshot);
		if (
			snapshotTimestamp !== undefined &&
			nextMessageTimestamp !== undefined &&
			snapshotTimestamp > nextMessageTimestamp
		) {
			return undefined;
		}

		consumedSnapshots.add(snapshot);
		nextSnapshotIdx++;
		return snapshot;
	}

	for (const [messageIndex, msg] of mastraMessages.entries()) {
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
			assistantIdx++;

			// Use the native runId from the snapshot (matches SSE events),
			// falling back to the user-message ID if no snapshot exists.
			const runId = snapshot?.runId ?? lastUserMessageId ?? msg.id;
			const agentTree =
				snapshot?.tree ??
				(toolCalls.length > 0 || text
					? buildFlatAgentTree(text, reasoning, toolCalls, parts)
					: undefined);

			messages.push({
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
			});
			continue;
		}

		// Skip tool/system messages — they are represented via tool invocations
		// in the assistant message's content
	}

	for (const snapshot of snapshots ?? []) {
		if (consumedSnapshots.has(snapshot)) continue;
		messages.push(buildSnapshotMessage(snapshot));
	}

	// Deduplicate assistant messages by messageGroupId.
	// Follow-up runs in the same group produce separate DB rows; keep only
	// the latest (which carries the full runIds array and complete tree).
	const seen = new Set<string>();
	for (let i = messages.length - 1; i >= 0; i--) {
		const gid = messages[i].messageGroupId;
		if (!gid) continue;
		if (seen.has(gid)) {
			messages.splice(i, 1);
		} else {
			seen.add(gid);
		}
	}

	return messages;
}
