import { v4 as uuidv4 } from 'uuid';

import type { ChatMessageText } from '@n8n/chat/types';

export interface NodeStreamingData {
	content: string;
	isComplete: boolean;
}

export class StreamingMessageManager {
	private nodeMessages = new Map<string, NodeStreamingData>();
	private nodeOrder: string[] = [];
	private activeNodes = new Set<string>();

	constructor() {}

	initializeNode(nodeId: string): void {
		if (!this.nodeMessages.has(nodeId)) {
			this.nodeMessages.set(nodeId, { content: '', isComplete: false });
			this.nodeOrder.push(nodeId);
		}
	}

	addNodeToActive(nodeId: string): void {
		this.activeNodes.add(nodeId);
		this.initializeNode(nodeId);
	}

	removeNodeFromActive(nodeId: string): void {
		this.activeNodes.delete(nodeId);
		const nodeData = this.nodeMessages.get(nodeId);
		if (nodeData) {
			nodeData.isComplete = true;
		}
	}

	addChunkToNode(nodeId: string, chunk: string): string {
		this.initializeNode(nodeId);
		const nodeData = this.nodeMessages.get(nodeId)!;
		nodeData.content += chunk;

		return this.getCombinedContent();
	}

	getCombinedContent(): string {
		return this.nodeOrder
			.map((id) => this.nodeMessages.get(id)?.content ?? '')
			.filter((content) => content.length > 0)
			.join('');
	}

	areAllNodesComplete(): boolean {
		return Array.from(this.nodeMessages.values()).every((data) => data.isComplete);
	}

	getNodeCount(): number {
		return this.nodeOrder.length;
	}

	reset(): void {
		this.nodeMessages.clear();
		this.nodeOrder = [];
		this.activeNodes.clear();
	}
}

export function createBotMessage(id?: string): ChatMessageText {
	return {
		id: id ?? uuidv4(),
		type: 'text',
		text: '',
		sender: 'bot',
	};
}

export function updateMessageInArray(
	messages: unknown[],
	messageId: string,
	updatedMessage: ChatMessageText,
): void {
	const messageIndex = messages.findIndex(
		(msg: unknown) => (msg as { id: string }).id === messageId,
	);
	if (messageIndex !== -1) {
		messages[messageIndex] = updatedMessage;
	}
}
