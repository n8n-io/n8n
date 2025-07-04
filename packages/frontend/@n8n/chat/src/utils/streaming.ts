import { v4 as uuidv4 } from 'uuid';

import type { ChatMessageText } from '@n8n/chat/types';

export interface NodeRunData {
	content: string;
	isComplete: boolean;
	message: ChatMessageText;
}

export class StreamingMessageManager {
	private nodeRuns = new Map<string, NodeRunData>();
	private runOrder: string[] = [];
	private activeRuns = new Set<string>();

	constructor() {}

	private getRunKey(nodeId: string, runIndex?: number): string {
		if (runIndex !== undefined) {
			return `${nodeId}-${runIndex}`;
		}
		return nodeId;
	}

	private getItemKey(nodeId: string, runIndex?: number, itemIndex?: number): string {
		const runKey = this.getRunKey(nodeId, runIndex);
		if (itemIndex !== undefined) {
			return `${runKey}-${itemIndex}`;
		}
		return runKey;
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
			this.runOrder.push(runKey);
			return message;
		}
		return this.nodeRuns.get(runKey)!.message;
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

	removeRunFromActive(nodeId: string, runIndex?: number): void {
		const runKey = this.getRunKey(nodeId, runIndex);
		this.activeRuns.delete(runKey);
		const runData = this.nodeRuns.get(runKey);
		if (runData) {
			runData.isComplete = true;
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

	getRunMessage(nodeId: string, runIndex?: number): ChatMessageText | null {
		const runKey = this.getRunKey(nodeId, runIndex);
		const runData = this.nodeRuns.get(runKey);
		return runData?.message ?? null;
	}

	areAllRunsComplete(): boolean {
		return Array.from(this.nodeRuns.values()).every((data) => data.isComplete);
	}

	getRunCount(): number {
		return this.runOrder.length;
	}

	getActiveRunCount(): number {
		return this.activeRuns.size;
	}

	getAllMessages(): ChatMessageText[] {
		return this.runOrder
			.map((key) => this.nodeRuns.get(key)?.message)
			.filter((message): message is ChatMessageText => message !== undefined);
	}

	reset(): void {
		this.nodeRuns.clear();
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
