import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { generateCompactionSummary } from '@n8n/instance-ai';
import type { ModelConfig } from '@n8n/instance-ai';
import type { Memory } from '@mastra/memory';
import type { MastraMessageContentV2 } from '@mastra/core/agent';
import type { MastraDBMessage } from '@mastra/core/storage';

import { TypeORMMemoryStorage } from './storage/typeorm-memory-storage';

const METADATA_KEY = 'instanceAiConversationSummary';

interface ConversationSummaryMetadata {
	version: number;
	upToMessageId: string;
	summary: string;
	updatedAt: string;
}

/**
 * Manages rolling compaction of older thread messages into a summary.
 * Stores compaction state in thread metadata — no DB migration needed.
 *
 * Design:
 *   - recent tail (lastMessages) is never compacted
 *   - only the older prefix before the tail gets summarized
 *   - raw messages stay in storage for debugging/UI — only model input is compacted
 *   - compaction is best-effort: failures log a warning and return null
 */
@Service()
export class InstanceAiCompactionService {
	constructor(
		private readonly logger: Logger,
		private readonly memoryStorage: TypeORMMemoryStorage,
	) {}

	/**
	 * If compaction is needed, generate a summary and return a formatted
	 * `<conversation-summary>` block for prompt injection. Returns null if
	 * compaction is not needed or if a cached summary is still valid.
	 */
	async prepareCompactedContext(
		threadId: string,
		memory: Memory,
		modelId: ModelConfig,
		lastMessages: number,
	): Promise<string | null> {
		try {
			const recentTail = lastMessages;
			const compactBatch = Math.max(6, Math.floor(recentTail / 2));

			// Load all messages for the thread, ordered chronologically
			const { messages: allMessages } = await this.memoryStorage.listMessages({
				threadId,
				perPage: false,
				orderBy: { field: 'createdAt', direction: 'ASC' },
			});

			if (allMessages.length <= recentTail) {
				// Thread is short enough — no compaction needed
				return this.getCachedSummaryBlock(threadId, memory);
			}

			// Split into prefix (older messages) and tail (recent)
			const prefixEnd = allMessages.length - recentTail;
			const prefix = allMessages.slice(0, prefixEnd);

			// Load existing compaction state
			const thread = await memory.getThreadById({ threadId });
			const existing = this.parseMetadata(thread?.metadata?.[METADATA_KEY]);

			// Find where the previous summary left off
			let unsummarizedStart = 0;
			if (existing?.upToMessageId) {
				const idx = prefix.findIndex((m) => m.id === existing.upToMessageId);
				if (idx >= 0) {
					unsummarizedStart = idx + 1;
				}
			}

			const unsummarizedSlice = prefix.slice(unsummarizedStart);

			// Only compact when there are enough unsummarized messages
			if (unsummarizedSlice.length < compactBatch) {
				return this.getCachedSummaryBlock(threadId, memory);
			}

			// Extract high-signal content from the unsummarized slice
			const messageBatch = this.extractHighSignalContent(unsummarizedSlice);

			if (messageBatch.length === 0) {
				return this.getCachedSummaryBlock(threadId, memory);
			}

			// Generate the updated summary
			const summary = await generateCompactionSummary(modelId, {
				previousSummary: existing?.summary ?? null,
				messageBatch,
			});

			// Persist the updated compaction state
			const lastCompactedMessage = unsummarizedSlice[unsummarizedSlice.length - 1];
			const newMetadata: ConversationSummaryMetadata = {
				version: (existing?.version ?? 0) + 1,
				upToMessageId: lastCompactedMessage.id,
				summary,
				updatedAt: new Date().toISOString(),
			};

			await this.saveMetadata(threadId, memory, newMetadata);

			return this.formatSummaryBlock(summary);
		} catch (error) {
			this.logger.warn('Conversation compaction failed, continuing without summary', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	/**
	 * Return the cached summary block if one exists, without re-generating.
	 */
	private async getCachedSummaryBlock(threadId: string, memory: Memory): Promise<string | null> {
		const thread = await memory.getThreadById({ threadId });
		const existing = this.parseMetadata(thread?.metadata?.[METADATA_KEY]);
		if (existing?.summary) {
			return this.formatSummaryBlock(existing.summary);
		}
		return null;
	}

	/**
	 * Extract user/assistant text content from messages, skipping tool calls,
	 * tool results, and system messages.
	 */
	private extractHighSignalContent(
		messages: MastraDBMessage[],
	): Array<{ role: string; text: string }> {
		const result: Array<{ role: string; text: string }> = [];

		for (const msg of messages) {
			if (msg.role !== 'user' && msg.role !== 'assistant') continue;

			const text = this.extractTextFromContent(msg.content);
			if (!text) continue;

			result.push({ role: msg.role, text });
		}

		return result;
	}

	/**
	 * Extract plain text from a Mastra message content structure.
	 * Handles both string content and structured content arrays.
	 */
	private extractTextFromContent(content: MastraMessageContentV2): string {
		// Direct string content
		if (typeof content === 'string') return content;

		// Mastra wraps content in { content: [...parts] }
		const inner = (content as Record<string, unknown>)?.content;
		if (typeof inner === 'string') return inner;

		if (Array.isArray(inner)) {
			const textParts: string[] = [];
			for (const part of inner) {
				if (typeof part === 'string') {
					textParts.push(part);
				} else if (isTextPart(part)) {
					textParts.push(part.text);
				}
				// Skip tool-call, tool-result, image, and file parts
			}
			return textParts.join('\n');
		}

		return '';
	}

	private formatSummaryBlock(summary: string): string {
		return `<conversation-summary>\n${summary}\n</conversation-summary>`;
	}

	private parseMetadata(raw: unknown): ConversationSummaryMetadata | null {
		if (!raw || typeof raw !== 'object') return null;
		const obj = raw as Record<string, unknown>;
		if (
			typeof obj.version === 'number' &&
			typeof obj.upToMessageId === 'string' &&
			typeof obj.summary === 'string' &&
			typeof obj.updatedAt === 'string'
		) {
			return obj as unknown as ConversationSummaryMetadata;
		}
		return null;
	}

	private async saveMetadata(
		threadId: string,
		memory: Memory,
		metadata: ConversationSummaryMetadata,
	): Promise<void> {
		const thread = await memory.getThreadById({ threadId });
		if (!thread) return;

		await memory.updateThread({
			id: threadId,
			title: thread.title ?? threadId,
			metadata: {
				...thread.metadata,
				[METADATA_KEY]: metadata,
			},
		});
	}
}

function isTextPart(part: unknown): part is { type: 'text'; text: string } {
	return (
		typeof part === 'object' &&
		part !== null &&
		'type' in part &&
		(part as { type: string }).type === 'text' &&
		'text' in part &&
		typeof (part as { text: unknown }).text === 'string'
	);
}
