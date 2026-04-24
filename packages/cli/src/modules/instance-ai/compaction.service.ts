import type { MastraMessageContentV2 } from '@mastra/core/agent';
import type { MastraDBMessage } from '@mastra/core/memory';
import type { Memory } from '@mastra/memory';
import type { ChatHubLLMProvider } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { generateCompactionSummary, patchThread } from '@n8n/instance-ai';
import type { ModelConfig } from '@n8n/instance-ai';

import { maxContextWindowTokens } from '@/modules/chat-hub/context-limits';

import { TypeORMMemoryStorage } from './storage/typeorm-memory-storage';

const METADATA_KEY = 'instanceAiConversationSummary';

const DEFAULT_CONTEXT_WINDOW = 128_000;

/**
 * Rough token estimate: ~4 chars per token for English text.
 * Good enough for triggering decisions — not used for billing.
 */
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * Look up context window size (in tokens) using the Chat Hub model registry.
 * Tries exact match first, then prefix match (e.g. "claude-sonnet-4-5" matches
 * "claude-sonnet-4-5-20250929"), falling back to a conservative default.
 */
function getContextWindowForModel(modelId: ModelConfig): number {
	const raw =
		typeof modelId === 'string'
			? modelId
			: 'specificationVersion' in modelId
				? `${modelId.provider.split('.')[0]}/${modelId.modelId}`
				: modelId.id;
	const slashIndex = raw.indexOf('/');
	if (slashIndex < 0) {
		for (const providerModels of Object.values(maxContextWindowTokens)) {
			if (providerModels[raw]) return providerModels[raw];
			for (const [registryModel, tokens] of Object.entries(providerModels)) {
				if (tokens > 0 && registryModel.startsWith(raw)) return tokens;
			}
		}
		return DEFAULT_CONTEXT_WINDOW;
	}

	const provider = raw.slice(0, slashIndex) as ChatHubLLMProvider;
	const model = raw.slice(slashIndex + 1);

	const providerModels = maxContextWindowTokens[provider];
	if (!providerModels) return DEFAULT_CONTEXT_WINDOW;

	// Exact match
	if (providerModels[model]) return providerModels[model];

	// Prefix match: instance-ai may use short aliases (e.g. "claude-sonnet-4-5")
	// while the registry stores full API IDs (e.g. "claude-sonnet-4-5-20250929")
	for (const [registryModel, tokens] of Object.entries(providerModels)) {
		if (tokens > 0 && registryModel.startsWith(model)) return tokens;
	}

	return DEFAULT_CONTEXT_WINDOW;
}

/** Estimate tokens consumed by system prompt, tools, and working memory overhead. */
const FIXED_CONTEXT_OVERHEAD_TOKENS = 8_000;

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
 * Trigger: compacts when estimated total thread tokens exceed a percentage
 * of the model's context window (default 80%), matching the pattern used
 * by Claude Code and OpenAI's auto-compaction.
 *
 * Design:
 *   - recent tail (lastMessages) is never compacted
 *   - only the older prefix before the tail gets summarized
 *   - raw messages stay in storage for debugging/UI — only model input is compacted
 *   - compaction is best-effort: failures log a warning and return null
 */
@Service()
export class InstanceAiCompactionService {
	private readonly maxContextWindowTokensCap: number;

	constructor(
		private readonly logger: Logger,
		private readonly memoryStorage: TypeORMMemoryStorage,
		globalConfig: GlobalConfig,
	) {
		this.maxContextWindowTokensCap = globalConfig.instanceAi.maxContextWindowTokens;
	}

	/**
	 * If compaction is needed, generate a summary and return a formatted
	 * `<conversation-summary>` block for prompt injection. Returns null if
	 * compaction is not needed or if a cached summary is still valid.
	 *
	 * @param compactionThreshold — fraction of context window that triggers compaction (0-1, default 0.8)
	 */
	async prepareCompactedContext(
		threadId: string,
		memory: Memory,
		modelId: ModelConfig,
		lastMessages: number,
		compactionThreshold = 0.8,
	): Promise<string | null> {
		try {
			const recentTail = lastMessages;

			// Load all messages for the thread, ordered chronologically
			const { messages: allMessages } = await this.memoryStorage.listMessages({
				threadId,
				perPage: false,
				orderBy: { field: 'createdAt', direction: 'ASC' },
			});

			if (allMessages.length <= recentTail) {
				return await this.getCachedSummaryBlock(threadId, memory);
			}

			// Estimate total token usage across all messages
			const totalTokens =
				FIXED_CONTEXT_OVERHEAD_TOKENS +
				allMessages.reduce((sum, m) => sum + estimateTokens(this.extractRawText(m)), 0);

			const modelContextWindow = getContextWindowForModel(modelId);
			const contextWindow =
				this.maxContextWindowTokensCap > 0
					? Math.min(modelContextWindow, this.maxContextWindowTokensCap)
					: modelContextWindow;
			const threshold = contextWindow * compactionThreshold;

			// Only compact when context usage exceeds the threshold
			if (totalTokens < threshold) {
				return await this.getCachedSummaryBlock(threadId, memory);
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

			// Need at least some unsummarized content to justify a compaction call
			const unsummarizedTokens = unsummarizedSlice.reduce(
				(sum, m) => sum + estimateTokens(this.extractRawText(m)),
				0,
			);
			if (unsummarizedTokens < 500) {
				return await this.getCachedSummaryBlock(threadId, memory);
			}

			// Extract high-signal content from the unsummarized slice
			const messageBatch = this.extractHighSignalContent(unsummarizedSlice);

			if (messageBatch.length === 0) {
				return await this.getCachedSummaryBlock(threadId, memory);
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

	/** Get the full serialized text of a message (for token estimation). */
	private extractRawText(msg: MastraDBMessage): string {
		const content: unknown = msg.content;
		if (typeof content === 'string') return content;
		return JSON.stringify(content);
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
		if (typeof content === 'string') return content;

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
		await patchThread(memory, {
			threadId,
			update: ({ metadata: currentMetadata }) => ({
				metadata: {
					...currentMetadata,
					[METADATA_KEY]: metadata,
				},
			}),
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
