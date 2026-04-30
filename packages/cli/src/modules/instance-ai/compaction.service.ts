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
const MIN_UNSUMMARIZED_TOKENS = 500;
const DEBUG_PREVIEW_CHARS = 500;

// TEMP DEBUG: remove after compaction tuning.
function logCompactionDebug(event: string, metadata: Record<string, unknown>): void {
	// eslint-disable-next-line no-console
	console.log(`[InstanceAI][compaction] ${event}`, metadata);
}

function previewForDebug(text: string | null | undefined): string | undefined {
	if (!text) return undefined;
	return text.length > DEBUG_PREVIEW_CHARS ? `${text.slice(0, DEBUG_PREVIEW_CHARS)}...` : text;
}

function countMessagesByRole(messages: MastraDBMessage[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const message of messages) {
		const role = String(message.role);
		counts[role] = (counts[role] ?? 0) + 1;
	}
	return counts;
}

interface ConversationSummaryMetadata {
	version: number;
	upToMessageId: string;
	summary: string;
	updatedAt: string;
}

interface PendingCompactionInput {
	label: string;
	text: string;
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
		currentInput?: PendingCompactionInput,
	): Promise<string | null> {
		try {
			const recentTail = Math.max(0, lastMessages);
			const currentInputTokens = currentInput ? estimateTokens(currentInput.text) : 0;

			// Load all messages for the thread, ordered chronologically
			const { messages: allMessages } = await this.memoryStorage.listMessages({
				threadId,
				perPage: false,
				orderBy: { field: 'createdAt', direction: 'ASC' },
			});

			// Estimate total token usage across all messages
			const rawMessageTokens = allMessages.reduce(
				(sum, m) => sum + estimateTokens(this.extractRawText(m)),
				0,
			);
			const totalTokens = FIXED_CONTEXT_OVERHEAD_TOKENS + rawMessageTokens + currentInputTokens;

			const modelContextWindow = getContextWindowForModel(modelId);
			const contextWindow =
				this.maxContextWindowTokensCap > 0
					? Math.min(modelContextWindow, this.maxContextWindowTokensCap)
					: modelContextWindow;
			const threshold = contextWindow * compactionThreshold;

			// Load existing compaction state
			const thread = await memory.getThreadById({ threadId });
			const existing = this.parseMetadata(thread?.metadata?.[METADATA_KEY]);
			const existingSummaryTokens = existing ? estimateTokens(existing.summary) : 0;

			logCompactionDebug('loaded', {
				threadId,
				messageCount: allMessages.length,
				roleCounts: countMessagesByRole(allMessages),
				rawMessageTokens,
				currentInputLabel: currentInput?.label,
				currentInputChars: currentInput?.text.length ?? 0,
				currentInputTokens,
				currentInputPreview: previewForDebug(currentInput?.text),
				fixedContextOverheadTokens: FIXED_CONTEXT_OVERHEAD_TOKENS,
				totalTokensBeforeCompaction: totalTokens,
				modelContextWindow,
				configuredContextWindowCap: this.maxContextWindowTokensCap,
				effectiveContextWindow: contextWindow,
				compactionThreshold,
				thresholdTokens: Math.floor(threshold),
				lastMessages: recentTail,
				hasCachedSummary: Boolean(existing?.summary),
				cachedSummaryVersion: existing?.version,
				cachedSummaryUpToMessageId: existing?.upToMessageId,
				cachedSummaryTokens: existingSummaryTokens,
			});

			if (allMessages.length <= recentTail) {
				logCompactionDebug('skip', {
					threadId,
					reason: 'message_count_within_recent_tail',
					messageCount: allMessages.length,
					lastMessages: recentTail,
					totalTokensBeforeCompaction: totalTokens,
					thresholdTokens: Math.floor(threshold),
					returnsCachedSummary: Boolean(existing?.summary),
				});
				return this.formatCachedSummaryBlock(existing);
			}

			// Only compact when context usage exceeds the threshold
			if (totalTokens < threshold) {
				logCompactionDebug('skip', {
					threadId,
					reason: 'below_threshold',
					totalTokensBeforeCompaction: totalTokens,
					thresholdTokens: Math.floor(threshold),
					returnsCachedSummary: Boolean(existing?.summary),
				});
				return this.formatCachedSummaryBlock(existing);
			}

			// Split into prefix (older messages) and tail (recent)
			const prefixEnd = allMessages.length - recentTail;
			const prefix = allMessages.slice(0, prefixEnd);
			const tail = allMessages.slice(prefixEnd);
			const prefixTokens = prefix.reduce(
				(sum, m) => sum + estimateTokens(this.extractRawText(m)),
				0,
			);
			const tailTokens = tail.reduce((sum, m) => sum + estimateTokens(this.extractRawText(m)), 0);

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
			if (unsummarizedTokens < MIN_UNSUMMARIZED_TOKENS) {
				logCompactionDebug('skip', {
					threadId,
					reason: 'unsummarized_delta_too_small',
					prefixMessageCount: prefix.length,
					tailMessageCount: tail.length,
					prefixTokens,
					tailTokens,
					unsummarizedMessageCount: unsummarizedSlice.length,
					unsummarizedTokens,
					minUnsummarizedTokens: MIN_UNSUMMARIZED_TOKENS,
					currentInputTokens,
					totalTokensBeforeCompaction: totalTokens,
					returnsCachedSummary: Boolean(existing?.summary),
				});
				return this.formatCachedSummaryBlock(existing);
			}

			// Extract high-signal content from the unsummarized slice
			const messageBatch = this.extractHighSignalContent(unsummarizedSlice);

			if (messageBatch.length === 0) {
				logCompactionDebug('skip', {
					threadId,
					reason: 'no_high_signal_messages',
					unsummarizedMessageCount: unsummarizedSlice.length,
					unsummarizedTokens,
					currentInputTokens,
					totalTokensBeforeCompaction: totalTokens,
					returnsCachedSummary: Boolean(existing?.summary),
				});
				return this.formatCachedSummaryBlock(existing);
			}

			const messageBatchTokens = messageBatch.reduce(
				(sum, message) => sum + estimateTokens(message.text),
				0,
			);
			const lastCompactedMessage = unsummarizedSlice[unsummarizedSlice.length - 1];
			const estimatedTokensWithCachedSummary =
				FIXED_CONTEXT_OVERHEAD_TOKENS + tailTokens + existingSummaryTokens + currentInputTokens;

			logCompactionDebug('start', {
				threadId,
				nextSummaryVersion: (existing?.version ?? 0) + 1,
				prefixMessageCount: prefix.length,
				tailMessageCount: tail.length,
				prefixTokens,
				tailTokens,
				unsummarizedStartIndex: unsummarizedStart,
				unsummarizedMessageCount: unsummarizedSlice.length,
				unsummarizedTokens,
				highSignalMessageCount: messageBatch.length,
				highSignalTokens: messageBatchTokens,
				previousSummaryVersion: existing?.version,
				previousSummaryTokens: existingSummaryTokens,
				previousSummaryPreview: previewForDebug(existing?.summary),
				lastCompactedMessageId: lastCompactedMessage.id,
				currentInputTokens,
				totalTokensBeforeCompaction: totalTokens,
				estimatedTokensWithCachedSummary,
			});

			// Generate the updated summary
			const summary = await generateCompactionSummary(modelId, {
				previousSummary: existing?.summary ?? null,
				messageBatch,
			});

			// Persist the updated compaction state
			const newMetadata: ConversationSummaryMetadata = {
				version: (existing?.version ?? 0) + 1,
				upToMessageId: lastCompactedMessage.id,
				summary,
				updatedAt: new Date().toISOString(),
			};

			await this.saveMetadata(threadId, memory, newMetadata);

			const summaryTokens = estimateTokens(summary);
			const estimatedTokensAfterCompaction =
				FIXED_CONTEXT_OVERHEAD_TOKENS + tailTokens + summaryTokens + currentInputTokens;
			logCompactionDebug('complete', {
				threadId,
				summaryVersion: newMetadata.version,
				upToMessageId: newMetadata.upToMessageId,
				summaryChars: summary.length,
				summaryTokens,
				summaryPreview: previewForDebug(summary),
				currentInputTokens,
				totalTokensBeforeCompaction: totalTokens,
				estimatedTokensAfterCompaction,
				estimatedTokensReduced: totalTokens - estimatedTokensAfterCompaction,
			});

			return this.formatSummaryBlock(summary);
		} catch (error) {
			this.logger.warn('Conversation compaction failed, continuing without summary', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	private formatCachedSummaryBlock(existing: ConversationSummaryMetadata | null): string | null {
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
