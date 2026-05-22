import type {
	ChatMessageContentChunk,
	InstanceAiAgentNode,
	InstanceAiMessage,
} from '@n8n/api-types';
import { parseMessage } from '@n8n/chat-hub';

function parseAiText(content: string): ChatMessageContentChunk[] {
	if (!content) return [];
	return parseMessage({ type: 'ai', content }).filter(
		(chunk) =>
			(chunk.type !== 'artifact-create' && chunk.type !== 'artifact-edit') || !chunk.isIncomplete,
	);
}

function collectAgentTreeChunks(
	node: InstanceAiAgentNode,
	visitedAgentIds: Set<string>,
): ChatMessageContentChunk[] {
	if (visitedAgentIds.has(node.agentId)) return [];
	visitedAgentIds.add(node.agentId);

	const chunks: ChatMessageContentChunk[] = [];
	const childrenById = new Map(node.children.map((child) => [child.agentId, child]));
	let hasTimelineText = false;

	for (const entry of node.timeline) {
		if (entry.type === 'text') {
			hasTimelineText = true;
			chunks.push(...parseAiText(entry.content));
			continue;
		}

		if (entry.type === 'child') {
			const child = childrenById.get(entry.agentId);
			if (child) {
				chunks.push(...collectAgentTreeChunks(child, visitedAgentIds));
			}
		}
	}

	if (!hasTimelineText) {
		chunks.push(...parseAiText(node.textContent));
	}

	for (const child of node.children) {
		if (!visitedAgentIds.has(child.agentId)) {
			chunks.push(...collectAgentTreeChunks(child, visitedAgentIds));
		}
	}

	return chunks;
}

export function collectInstanceAiChatArtifactChunks(
	messages: InstanceAiMessage[],
): ChatMessageContentChunk[] {
	return messages.flatMap((message) => {
		if (message.role !== 'assistant') return [];
		if (message.agentTree) return collectAgentTreeChunks(message.agentTree, new Set());
		return parseAiText(message.content);
	});
}
