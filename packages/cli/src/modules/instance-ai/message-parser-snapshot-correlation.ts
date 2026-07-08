import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import type { AgentTreeSnapshot } from '@n8n/instance-ai';

interface SnapshotConversationMessage {
	role: string;
	createdAt: Date;
}

interface SnapshotCorrelatorInput<TMessage extends SnapshotConversationMessage> {
	snapshots?: AgentTreeSnapshot[];
	conversationMessages: TMessage[];
	pushSnapshotMessage: (snapshot: AgentTreeSnapshot) => void;
}

export interface SnapshotCorrelator<TMessage extends SnapshotConversationMessage> {
	appendChronologicalOrphansBefore: (message: TMessage) => void;
	takeSnapshotForAssistant: (
		message: TMessage,
		messageIndex: number,
	) => AgentTreeSnapshot | undefined;
	pushUnconsumedSnapshots: () => void;
}

function snapshotTimestamp(snapshot: AgentTreeSnapshot): string {
	return (snapshot.updatedAt ?? snapshot.createdAt ?? new Date(0)).toISOString();
}

function snapshotCreatedAtMs(snapshot: AgentTreeSnapshot): number | undefined {
	return snapshot.createdAt?.getTime();
}

function compareSnapshotsByCreatedAt(a: AgentTreeSnapshot, b: AgentTreeSnapshot): number {
	const aCreatedAt = snapshotCreatedAtMs(a);
	const bCreatedAt = snapshotCreatedAtMs(b);
	if (aCreatedAt === undefined && bCreatedAt === undefined) return 0;
	if (aCreatedAt === undefined) return 1;
	if (bCreatedAt === undefined) return -1;
	return aCreatedAt - bCreatedAt;
}

function messageCreatedAtMs(message: { createdAt: Date }): number {
	return message.createdAt.getTime();
}

function getNextConversationMessageTimestamp<TMessage extends SnapshotConversationMessage>(
	messages: TMessage[],
	currentIndex: number,
): number | undefined {
	for (let i = currentIndex + 1; i < messages.length; i++) {
		const role = messages[i].role;
		if (role === 'user' || role === 'assistant') return messageCreatedAtMs(messages[i]);
	}
	return undefined;
}

export function buildSnapshotMessage(snapshot: AgentTreeSnapshot): InstanceAiMessage {
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

export function createSnapshotCorrelator<TMessage extends SnapshotConversationMessage>({
	snapshots,
	conversationMessages,
	pushSnapshotMessage,
}: SnapshotCorrelatorInput<TMessage>): SnapshotCorrelator<TMessage> {
	// Non-renderable snapshots stay in the list: they must still pair with their
	// assistant rows so status/cancellationReason/messageGroupId carry over; the
	// caller decides whether the tree itself is authoritative.
	const snapshotList = [...(snapshots ?? [])].sort(compareSnapshotsByCreatedAt);
	let nextSnapshotIdx = 0;
	const consumedSnapshots = new Set<AgentTreeSnapshot>();

	function appendChronologicalOrphansBefore(message: TMessage): void {
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
		message: TMessage,
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

	function pushUnconsumedSnapshots(): void {
		for (const snapshot of snapshotList) {
			if (consumedSnapshots.has(snapshot)) continue;
			pushSnapshotMessage(snapshot);
		}
	}

	return { appendChronologicalOrphansBefore, takeSnapshotForAssistant, pushUnconsumedSnapshots };
}

/**
 * For each conversational turn (delimited by real user messages), find the
 * latest assistant message that already has a `messageGroupId` (i.e. was
 * paired with a snapshot) and copy that id onto every unpaired assistant
 * message in the same turn.
 */
export function propagateMessageGroupIdAcrossTurns(messages: InstanceAiMessage[]): void {
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

export function dedupeAssistantMessagesByMessageGroup(
	messages: InstanceAiMessage[],
	messagesWithSnapshotTree: Set<InstanceAiMessage>,
): void {
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
}
