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

	private getNodeKey(nodeId: string, runIndex?: number, itemIndex?: number): string {
		if (runIndex !== undefined && itemIndex !== undefined) {
			return `${nodeId}-${runIndex}-${itemIndex}`;
		}
		if (runIndex !== undefined) {
			return `${nodeId}-${runIndex}`;
		}
		return nodeId;
	}

	initializeNode(nodeId: string, runIndex?: number, itemIndex?: number): void {
		const key = this.getNodeKey(nodeId, runIndex, itemIndex);
		if (!this.nodeMessages.has(key)) {
			this.nodeMessages.set(key, { content: '', isComplete: false });
			this.nodeOrder.push(key);
		}
	}

	addNodeToActive(nodeId: string, runIndex?: number, itemIndex?: number): void {
		const key = this.getNodeKey(nodeId, runIndex, itemIndex);
		this.activeNodes.add(key);
		this.initializeNode(nodeId, runIndex, itemIndex);
	}

	removeNodeFromActive(nodeId: string, runIndex?: number, itemIndex?: number): void {
		const key = this.getNodeKey(nodeId, runIndex, itemIndex);
		this.activeNodes.delete(key);
		const nodeData = this.nodeMessages.get(key);
		if (nodeData) {
			nodeData.isComplete = true;
		}
	}

	addChunkToNode(nodeId: string, chunk: string, runIndex?: number, itemIndex?: number): string {
		this.initializeNode(nodeId, runIndex, itemIndex);
		const key = this.getNodeKey(nodeId, runIndex, itemIndex);
		const nodeData = this.nodeMessages.get(key)!;
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
