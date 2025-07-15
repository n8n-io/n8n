import { v4 as uuidv4 } from 'uuid';

import type { ChatMessage, ChatMessageText, ChatMessageRich, RichContent } from '@n8n/chat/types';

export interface NodeRunData {
	content: string;
	isComplete: boolean;
	message: ChatMessageText;
}

export interface RichNodeRunData {
	content: RichContent;
	isComplete: boolean;
	message: ChatMessageRich;
}

/**
 * Manages the state of streaming messages for nodes.
 * This class is responsible for tracking the state of each run of nodes,
 * including the content of each chunk, whether it's complete, and the message
 * object that represents the run of a given node.
 */
export class StreamingMessageManager {
	private nodeRuns = new Map<string, NodeRunData>();
	private richNodeRuns = new Map<string, RichNodeRunData>();
	private runOrder: string[] = [];
	private activeRuns = new Set<string>();

	constructor() {}

	private getRunKey(nodeId: string, runIndex?: number): string {
		if (runIndex !== undefined) {
			return `${nodeId}-${runIndex}`;
		}
		return nodeId;
	}

	initializeRun(nodeId: string, runIndex?: number): ChatMessageText {
		const runKey = this.getRunKey(nodeId, runIndex);
		if (!this.nodeRuns.has(runKey)) {
			const message = createBotMessage();
			this.nodeRuns.set(runKey, {
				content: '',
				isComplete: false,
				message,
			});
			if (!this.runOrder.includes(runKey)) this.runOrder.push(runKey);
			return message;
		}
		return this.nodeRuns.get(runKey)!.message;
	}

	initializeRichRun(nodeId: string, richContent: RichContent, runIndex?: number): ChatMessageRich {
		const runKey = this.getRunKey(nodeId, runIndex);
		if (!this.richNodeRuns.has(runKey)) {
			const message = createRichBotMessage(richContent);
			this.richNodeRuns.set(runKey, {
				content: richContent,
				isComplete: false,
				message,
			});
			if (!this.runOrder.includes(runKey)) this.runOrder.push(runKey);
			return message;
		}
		return this.richNodeRuns.get(runKey)!.message;
	}

	registerRunStart(nodeId: string, runIndex?: number): void {
		const runKey = this.getRunKey(nodeId, runIndex);
		this.activeRuns.add(runKey);
	}

	addRunToActive(nodeId: string, runIndex?: number): ChatMessageText {
		const runKey = this.getRunKey(nodeId, runIndex);
		this.activeRuns.add(runKey);
		return this.initializeRun(nodeId, runIndex);
	}

	addRichRunToActive(nodeId: string, richContent: RichContent, runIndex?: number): ChatMessageRich {
		const runKey = this.getRunKey(nodeId, runIndex);
		this.activeRuns.add(runKey);
		return this.initializeRichRun(nodeId, richContent, runIndex);
	}

	removeRunFromActive(nodeId: string, runIndex?: number): void {
		const runKey = this.getRunKey(nodeId, runIndex);
		this.activeRuns.delete(runKey);

		// Update completion status for both text and rich runs
		const runData = this.nodeRuns.get(runKey);
		if (runData) {
			runData.isComplete = true;
		}

		const richRunData = this.richNodeRuns.get(runKey);
		if (richRunData) {
			richRunData.isComplete = true;
		}
	}

	addChunkToRun(nodeId: string, chunk: string, runIndex?: number): ChatMessageText | null {
		const runKey = this.getRunKey(nodeId, runIndex);
		const runData = this.nodeRuns.get(runKey);
		if (runData) {
			runData.content += chunk;
			// Create a new message object to trigger Vue reactivity
			const updatedMessage: ChatMessageText = {
				...runData.message,
				text: runData.content,
			};
			runData.message = updatedMessage;
			return updatedMessage;
		}
		return null;
	}

	updateRichRun(
		nodeId: string,
		richContent: RichContent,
		runIndex?: number,
	): ChatMessageRich | null {
		const runKey = this.getRunKey(nodeId, runIndex);
		const runData = this.richNodeRuns.get(runKey);
		if (runData) {
			// Merge rich content updates
			runData.content = {
				...runData.content,
				...richContent,
			};

			// Create a new message object to trigger Vue reactivity
			const updatedMessage: ChatMessageRich = {
				...runData.message,
				content: { ...runData.content },
			};
			runData.message = updatedMessage;
			return updatedMessage;
		}
		return null;
	}

	getRunMessage(nodeId: string, runIndex?: number): ChatMessageText | null {
		const runKey = this.getRunKey(nodeId, runIndex);
		const runData = this.nodeRuns.get(runKey);
		return runData?.message ?? null;
	}

	getRichMessage(nodeId: string, runIndex?: number): ChatMessageRich | null {
		const runKey = this.getRunKey(nodeId, runIndex);
		const runData = this.richNodeRuns.get(runKey);
		return runData?.message ?? null;
	}

	areAllRunsComplete(): boolean {
		const textRunsComplete = Array.from(this.nodeRuns.values()).every((data) => data.isComplete);
		const richRunsComplete = Array.from(this.richNodeRuns.values()).every(
			(data) => data.isComplete,
		);
		return textRunsComplete && richRunsComplete;
	}

	getRunCount(): number {
		return this.runOrder.length;
	}

	getActiveRunCount(): number {
		return this.activeRuns.size;
	}

	getAllMessages(): (ChatMessageText | ChatMessageRich)[] {
		return this.runOrder
			.map((key) => {
				// Try to get from text runs first, then rich runs
				const textMessage = this.nodeRuns.get(key)?.message;
				if (textMessage) return textMessage;

				const richMessage = this.richNodeRuns.get(key)?.message;
				if (richMessage) return richMessage;

				return null;
			})
			.filter((message): message is ChatMessageText | ChatMessageRich => message !== null);
	}

	reset(): void {
		this.nodeRuns.clear();
		this.richNodeRuns.clear();
		this.runOrder = [];
		this.activeRuns.clear();
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

export function createRichBotMessage(content: RichContent, id?: string): ChatMessageRich {
	return {
		id: id ?? uuidv4(),
		type: 'rich',
		content,
		sender: 'bot',
	};
}

export function updateMessageInArray(
	messages: ChatMessage[],
	messageId: string,
	updatedMessage: ChatMessage,
): void {
	const messageIndex = messages.findIndex((msg: ChatMessage) => msg.id === messageId);
	if (messageIndex === -1) {
		throw new Error(`Can't update message. No message with id ${messageId} found`);
	}

	messages[messageIndex] = updatedMessage;
}
