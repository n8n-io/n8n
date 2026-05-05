import { getRenderHint } from '@n8n/api-types';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
	InstanceAiTimelineEntry,
} from '@n8n/api-types';
import type { AgentDbMessage, AgentTreeSnapshot } from '@n8n/instance-ai';

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
}

interface StoredContentPart {
	type: string;
	text?: string;
	toolInvocation?: StoredToolInvocation;
	toolCallId?: string;
	toolName?: string;
	input?: Record<string, unknown>;
	result?: unknown;
}

interface LegacyContentV2 {
	format?: number;
	parts?: StoredContentPart[];
	toolInvocations?: StoredToolInvocation[];
	reasoning?: Array<{ text: string }>;
	content?: string;
}

export interface StoredAgentMessage {
	id: string;
	role: string;
	content: unknown;
	type?: string;
	createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type guard: narrows unknown content to legacy structured content. */
function isV2Content(content: unknown): content is LegacyContentV2 {
	return content !== null && typeof content === 'object' && !Array.isArray(content);
}

function extractTextFromContent(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) return extractTextFromParts(content);
	if (!isV2Content(content)) return '';

	// V2 shortcut
	if (content.content) return content.content;

	// V2 parts array
	if (content.parts) return extractTextFromParts(content.parts);

	return '';
}

function extractReasoningFromContent(content: unknown): string {
	if (typeof content === 'string') return '';
	if (Array.isArray(content)) return extractReasoningFromParts(content);
	if (!isV2Content(content)) return '';

	// V2 top-level reasoning array
	if (content.reasoning?.length) {
		return content.reasoning.map((r) => r.text).join('');
	}

	// V2 reasoning parts
	if (content.parts) return extractReasoningFromParts(content.parts);

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
	if (!isV2Content(content)) return undefined;
	return content.parts;
}

function isStoredContentPart(value: unknown): value is StoredContentPart {
	return typeof value === 'object' && value !== null && 'type' in value;
}

function nativeToolPartToInvocation(part: StoredContentPart): StoredToolInvocation | undefined {
	if (part.type === 'tool-call' && part.toolCallId && part.toolName) {
		return {
			state: 'call',
			toolCallId: part.toolCallId,
			toolName: part.toolName,
			args: part.input ?? {},
		};
	}
	if (part.type === 'tool-result' && part.toolCallId && part.toolName) {
		return {
			state: 'result',
			toolCallId: part.toolCallId,
			toolName: part.toolName,
			args: {},
			result: part.result,
		};
	}
	return undefined;
}

function extractToolInvocations(content: unknown): StoredToolInvocation[] {
	if (typeof content === 'string') return [];
	if (Array.isArray(content))
		return content.filter(isStoredContentPart).flatMap((part) => {
			const invocation = nativeToolPartToInvocation(part);
			return invocation ? [invocation] : [];
		});
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

function buildToolCallState(invocation: StoredToolInvocation): InstanceAiToolCallState {
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
	parts?: StoredContentPart[],
): InstanceAiTimelineEntry[] {
	// If parts are available, use their ordering (chronologically accurate)
	if (parts?.length) {
		const timeline: InstanceAiTimelineEntry[] = [];
		for (const part of parts) {
			if (part.type === 'text' && part.text) {
				timeline.push({ type: 'text', content: part.text });
			} else if (part.type === 'tool-invocation' && part.toolInvocation) {
				timeline.push({ type: 'tool-call', toolCallId: part.toolInvocation.toolCallId });
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

	// Snapshots are stored as a chronological array — the Nth snapshot
	// corresponds to the Nth assistant message. We align from the END
	// so old messages (before snapshots existed) get flat trees.
	const assistantCount = storedMessages.filter((m) => 'role' in m && m.role === 'assistant').length;
	const snapshotOffset = assistantCount - (snapshots?.length ?? 0);
	let assistantIdx = 0;

	let lastUserMessageId: string | undefined;

	for (const msg of storedMessages) {
		if (!('role' in msg)) continue;
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

			// Match snapshot by position: Nth assistant message → Nth snapshot (aligned from end)
			const snapshotIdx = assistantIdx - snapshotOffset;
			const snapshot =
				snapshots && snapshotIdx >= 0 && snapshotIdx < snapshots.length
					? snapshots[snapshotIdx]
					: undefined;
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
