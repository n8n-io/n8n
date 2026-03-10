import { RunnableConfig } from '@langchain/core/runnables';
import { type Checkpoint, MemorySaver } from '@langchain/langgraph';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';

import { generateCodeBuilderThreadId } from '@/code-builder/utils/code-builder-session';
import { getBuilderToolsForDisplay } from '@/tools/builder-tools';
import type { HITLHistoryEntry, HITLInterruptValue } from '@/types/planning';
import { ISessionStorage } from '@/types/session-storage';
import { isLangchainMessagesArray, LangchainMessage, Session } from '@/types/sessions';
import { stripAllCacheControlMarkers } from '@/utils/cache-control/helpers';
import { formatMessages } from '@/utils/stream-processor';
import { generateThreadId as generateThreadIdUtil } from '@/utils/thread-id';

@Service()
export class SessionManagerService {
	private checkpointer: MemorySaver;

	private nodeTypes: INodeTypeDescription[];

	private static readonly HITL_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

	private pendingHitlByThreadId = new Map<
		string,
		{ value: HITLInterruptValue; triggeringMessageId?: string; expiresAt: number }
	>();

	/**
	 * Chronological log of HITL interactions for session replay.
	 * Command.update messages don't persist in the parent checkpoint when a
	 * subgraph node interrupts multiple times, so we store them here.
	 */
	private hitlHistoryByThreadId = new Map<string, HITLHistoryEntry[]>();

	constructor(
		parsedNodeTypes: INodeTypeDescription[],
		private readonly storage?: ISessionStorage,
		private readonly logger?: Logger,
	) {
		this.nodeTypes = parsedNodeTypes;
		this.checkpointer = new MemorySaver();

		if (storage) {
			this.logger?.debug('Using persistent session storage');
		} else {
			this.logger?.debug('Using in-memory session storage (MemorySaver)');
		}
	}

	/**
	 * Whether persistent storage is configured
	 */
	get usesPersistence(): boolean {
		return !!this.storage;
	}

	/**
	 * Update the node types used for formatting messages.
	 * Called when community packages are installed, updated, or uninstalled.
	 */
	updateNodeTypes(nodeTypes: INodeTypeDescription[]) {
		this.nodeTypes = nodeTypes;
	}

	/**
	 * Generate a thread ID for a given workflow and user
	 * @param workflowId - The workflow ID
	 * @param userId - The user ID
	 * @param agentType - Optional agent type to isolate sessions between different agents
	 */
	static generateThreadId(
		workflowId?: string,
		userId?: string,
		agentType?: 'code-builder',
	): string {
		return generateThreadIdUtil(workflowId, userId, agentType);
	}

	/**
	 * Get the checkpointer instance
	 */
	getCheckpointer(): MemorySaver {
		return this.checkpointer;
	}

	setPendingHitl(threadId: string, value: HITLInterruptValue, triggeringMessageId?: string) {
		this.evictExpiredHitl();
		this.pendingHitlByThreadId.set(threadId, {
			value,
			triggeringMessageId,
			expiresAt: Date.now() + SessionManagerService.HITL_TTL_MS,
		});
	}

	clearPendingHitl(threadId: string) {
		this.pendingHitlByThreadId.delete(threadId);
	}

	/**
	 * Atomically get and clear the pending HITL value for a thread.
	 * Prevents TOCTOU races between separate get + clear calls.
	 */
	getAndClearPendingHitl(
		threadId: string,
	): { value: HITLInterruptValue; triggeringMessageId?: string } | undefined {
		this.evictExpiredHitl();
		const entry = this.pendingHitlByThreadId.get(threadId);
		if (!entry) return undefined;
		if (Date.now() > entry.expiresAt) {
			this.pendingHitlByThreadId.delete(threadId);
			return undefined;
		}
		this.pendingHitlByThreadId.delete(threadId);
		return { value: entry.value, triggeringMessageId: entry.triggeringMessageId };
	}

	getPendingHitl(threadId: string): HITLInterruptValue | undefined {
		this.evictExpiredHitl();
		const entry = this.pendingHitlByThreadId.get(threadId);
		if (!entry) return undefined;
		if (Date.now() > entry.expiresAt) {
			this.pendingHitlByThreadId.delete(threadId);
			return undefined;
		}
		return entry.value;
	}

	/**
	 * Append an entry to the HITL interaction history for a thread.
	 * Called when a questions or plan interrupt is resumed.
	 */
	addHitlEntry(threadId: string, entry: HITLHistoryEntry) {
		const history = this.hitlHistoryByThreadId.get(threadId) ?? [];
		history.push(entry);
		this.hitlHistoryByThreadId.set(threadId, history);
	}

	getHitlHistory(threadId: string): HITLHistoryEntry[] {
		return this.hitlHistoryByThreadId.get(threadId) ?? [];
	}

	/**
	 * Remove HITL history entries whose afterMessageId references a message
	 * that no longer exists in the surviving checkpoint messages.
	 */
	private truncateHitlHistory(threadId: string, survivingMessages: LangchainMessage[]) {
		const history = this.hitlHistoryByThreadId.get(threadId);
		if (!history || history.length === 0) return;

		const survivingIds = new Set(
			survivingMessages
				.map((m) => m.additional_kwargs?.messageId as string | undefined)
				.filter(Boolean),
		);

		const filtered = history.filter(
			(entry) => !entry.afterMessageId || survivingIds.has(entry.afterMessageId),
		);

		if (filtered.length === 0) {
			this.hitlHistoryByThreadId.delete(threadId);
		} else {
			this.hitlHistoryByThreadId.set(threadId, filtered);
		}
	}

	/**
	 * Inject HITL history entries into the formatted messages array at the
	 * correct positions. Entries with the same afterMessageId are grouped
	 * together in chronological order.
	 */
	private injectHitlHistory(threadId: string, formattedMessages: Array<Record<string, unknown>>) {
		const history = this.getHitlHistory(threadId);
		if (history.length === 0) return;

		// Group entries by afterMessageId (preserving insertion order)
		const groups = new Map<string | undefined, Array<Record<string, unknown>>>();
		for (const entry of history) {
			const key = entry.afterMessageId;
			const msgs = groups.get(key) ?? [];
			msgs.push(...this.hitlEntryToMessages(entry));
			groups.set(key, msgs);
		}

		// Insert each group at the correct position (reverse order for stable indices)
		const keys = [...groups.keys()].reverse();
		for (const afterMessageId of keys) {
			const msgs = groups.get(afterMessageId)!;
			const insertAt = this.findInsertPosition(formattedMessages, afterMessageId);
			formattedMessages.splice(insertAt, 0, ...msgs);
		}
	}

	private hitlEntryToMessages(entry: HITLHistoryEntry): Array<Record<string, unknown>> {
		if (entry.type === 'questions_answered') {
			return [
				{
					role: 'assistant',
					type: 'questions',
					questions: entry.interrupt.questions,
					...(entry.interrupt.introMessage ? { introMessage: entry.interrupt.introMessage } : {}),
				},
				{
					role: 'user',
					type: 'user_answers',
					answers: Array.isArray(entry.answers) ? entry.answers : [],
				},
			];
		}

		// plan_decided (reject or modify — approved plans survive in the checkpoint)
		const messages: Array<Record<string, unknown>> = [
			{
				role: 'assistant',
				type: 'plan',
				plan: entry.plan,
			},
		];

		if (entry.decision === 'reject') {
			messages.push({
				role: 'user',
				type: 'message',
				text: entry.feedback ?? 'Plan rejected',
			});
		} else if (entry.decision === 'modify') {
			messages.push({
				role: 'user',
				type: 'message',
				text: entry.feedback ?? 'Please modify the plan',
			});
		}

		return messages;
	}

	private findInsertPosition(
		formattedMessages: Array<Record<string, unknown>>,
		afterMessageId?: string,
	): number {
		if (afterMessageId) {
			const idx = formattedMessages.findIndex((m) => m.id === afterMessageId);
			if (idx !== -1) return idx + 1;
		}
		// Fallback: after the first user message
		const firstUserIdx = formattedMessages.findIndex((m) => m.role === 'user');
		return firstUserIdx !== -1 ? firstUserIdx + 1 : 0;
	}

	private evictExpiredHitl() {
		const now = Date.now();
		for (const [id, entry] of this.pendingHitlByThreadId) {
			if (now > entry.expiresAt) {
				this.pendingHitlByThreadId.delete(id);
			}
		}
	}

	/**
	 * Load session messages from persistent storage.
	 * Called before starting a chat to get historical messages to include in the initial state.
	 * Returns the messages so they can be passed explicitly to the stream's initial state.
	 *
	 * Note: Strips all cache_control markers from loaded messages to prevent exceeding
	 * Anthropic's 4 cache_control block limit when combined with fresh system prompts.
	 */
	async loadSessionMessages(threadId: string): Promise<LangchainMessage[]> {
		if (!this.storage) return [];

		const stored = await this.storage.getSession(threadId);
		if (!stored || stored.messages.length === 0) return [];

		// Strip cache_control markers from historical messages to prevent exceeding
		// Anthropic's 4 cache_control block limit when combined with new system prompts
		stripAllCacheControlMarkers(stored.messages);

		this.logger?.debug('Loaded session messages from storage', {
			threadId,
			messageCount: stored.messages.length,
		});

		return stored.messages;
	}

	/**
	 * Save the current checkpointer state to persistent storage.
	 * Called after a chat completes to persist the final state.
	 */
	async saveSessionFromCheckpointer(threadId: string, previousSummary?: string): Promise<void> {
		if (!this.storage) return;

		const threadConfig: RunnableConfig = {
			configurable: { thread_id: threadId },
		};

		const checkpointTuple = await this.checkpointer.getTuple(threadConfig);
		if (!checkpointTuple?.checkpoint) return;

		const rawMessages = checkpointTuple.checkpoint.channel_values?.messages;
		const messages: LangchainMessage[] = isLangchainMessagesArray(rawMessages) ? rawMessages : [];

		await this.storage.saveSession(threadId, {
			messages,
			previousSummary,
			updatedAt: new Date(),
		});

		this.logger?.debug('Saved session from checkpointer', {
			threadId,
			messageCount: messages.length,
		});
	}

	/**
	 * Get the previous summary from persistent storage
	 */
	async getPreviousSummary(threadId: string): Promise<string | undefined> {
		if (!this.storage) return undefined;

		const stored = await this.storage.getSession(threadId);
		return stored?.previousSummary;
	}

	/**
	 * Clear session from both persistent storage and in-memory checkpointer.
	 *
	 * Important: We must clear the in-memory checkpointer state because LangGraph's
	 * messagesStateReducer merges/appends new messages to existing state. Without
	 * clearing, old messages would resurface when the user sends a new message
	 * without refreshing the page (state resurrection).
	 */
	async clearSession(threadId: string): Promise<void> {
		// Clear from persistent storage if available
		if (this.storage) {
			await this.storage.deleteSession(threadId);
		}

		// Clear in-memory checkpointer state by overwriting with empty checkpoint
		// This prevents state resurrection when user sends new messages
		const threadConfig: RunnableConfig = {
			configurable: { thread_id: threadId },
		};

		try {
			const existingTuple = await this.checkpointer.getTuple(threadConfig);
			if (existingTuple?.checkpoint) {
				// Overwrite with empty messages to clear the state
				const emptyCheckpoint: Checkpoint = {
					...existingTuple.checkpoint,
					channel_values: {
						...existingTuple.checkpoint.channel_values,
						messages: [],
					},
				};

				const metadata = existingTuple.metadata ?? {
					source: 'update' as const,
					step: -1,
					parents: {},
				};

				await this.checkpointer.put(threadConfig, emptyCheckpoint, metadata);
			}
		} catch (error) {
			// Log but don't fail - clearing persistent storage is the critical path
			this.logger?.debug('Failed to clear in-memory checkpointer state', { threadId, error });
		}

		// Clear HITL state for this thread
		this.pendingHitlByThreadId.delete(threadId);
		this.hitlHistoryByThreadId.delete(threadId);

		this.logger?.debug('Session cleared', { threadId });
	}

	/**
	 * Clear all sessions for a given workflow and user.
	 * Currently clears the regular multi-agent thread only.
	 * Code-builder session clearing will be handled in a follow-up.
	 */
	async clearAllSessions(workflowId: string, userId: string): Promise<void> {
		const mainThreadId = SessionManagerService.generateThreadId(workflowId, userId);
		await this.clearSession(mainThreadId);

		this.logger?.debug('All sessions cleared for workflow', { workflowId, userId });
	}

	/**
	 * Get sessions for a given workflow and user
	 * @param workflowId - The workflow ID
	 * @param userId - The user ID
	 * @param agentType - Optional agent type to query the correct session thread
	 */
	async getSessions(
		workflowId: string | undefined,
		userId: string | undefined,
		agentType?: 'code-builder',
	): Promise<{ sessions: Session[] }> {
		const sessions: Session[] = [];

		if (!workflowId) {
			return { sessions };
		}

		const threadId = SessionManagerService.generateThreadId(workflowId, userId, agentType);

		// Try persistent storage first if available
		if (this.storage) {
			const stored = await this.storage.getSession(threadId);
			if (stored && stored.messages.length > 0) {
				const formattedMessages = formatMessages(
					stored.messages,
					getBuilderToolsForDisplay({ nodeTypes: this.nodeTypes }),
				);

				// Inject HITL history that isn't in the checkpoint.
				// Command.update messages don't persist when a subgraph node
				// interrupts multiple times, so we replay them from stored history.
				this.injectHitlHistory(threadId, formattedMessages);

				const pendingHitl = this.getPendingHitl(threadId);
				if (pendingHitl) {
					formattedMessages.push({
						role: 'assistant',
						type: pendingHitl.type,
						...(pendingHitl.type === 'questions'
							? {
									questions: pendingHitl.questions,
									...(pendingHitl.introMessage ? { introMessage: pendingHitl.introMessage } : {}),
								}
							: {
									plan: pendingHitl.plan,
								}),
					});
				}

				sessions.push({
					sessionId: threadId,
					messages: formattedMessages,
					lastUpdated: stored.updatedAt.toISOString(),
				});

				return { sessions };
			}
		}

		// Fall back to in-memory checkpointer
		const threadConfig: RunnableConfig = {
			configurable: { thread_id: threadId },
		};

		try {
			const checkpoint = await this.checkpointer.getTuple(threadConfig);

			if (checkpoint?.checkpoint) {
				const rawMessages = checkpoint.checkpoint.channel_values?.messages;
				const messages: LangchainMessage[] = isLangchainMessagesArray(rawMessages)
					? rawMessages
					: [];

				const formattedMessages = formatMessages(
					messages,
					getBuilderToolsForDisplay({ nodeTypes: this.nodeTypes }),
				);

				// Inject HITL history that isn't in the checkpoint.
				// Command.update messages don't persist when a subgraph node
				// interrupts multiple times, so we replay them from stored history.
				this.injectHitlHistory(threadId, formattedMessages);

				const pendingHitl = this.getPendingHitl(threadId);
				if (pendingHitl) {
					formattedMessages.push({
						role: 'assistant',
						type: pendingHitl.type,
						...(pendingHitl.type === 'questions'
							? {
									questions: pendingHitl.questions,
									...(pendingHitl.introMessage ? { introMessage: pendingHitl.introMessage } : {}),
								}
							: {
									plan: pendingHitl.plan,
								}),
					});
				}

				sessions.push({
					sessionId: threadId,
					messages: formattedMessages,
					lastUpdated: checkpoint.checkpoint.ts,
				});
			}
		} catch (error) {
			this.logger?.debug('No session found for workflow:', { workflowId, error });
		}

		return { sessions };
	}

	/**
	 * Load messages from storage or checkpointer for truncation operations.
	 * Returns null if no messages are found.
	 */
	private async loadMessagesForTruncation(
		threadId: string,
	): Promise<{ messages: LangchainMessage[]; previousSummary?: string } | null> {
		if (this.storage) {
			const stored = await this.storage.getSession(threadId);
			if (!stored) {
				return null;
			}
			return { messages: stored.messages, previousSummary: stored.previousSummary };
		}

		const threadConfig: RunnableConfig = {
			configurable: { thread_id: threadId },
		};

		const checkpointTuple = await this.checkpointer.getTuple(threadConfig);
		if (!checkpointTuple?.checkpoint) {
			return null;
		}

		const rawMessages = checkpointTuple.checkpoint.channel_values?.messages;
		if (!isLangchainMessagesArray(rawMessages)) {
			return null;
		}

		return { messages: rawMessages };
	}

	/**
	 * Truncate all messages including and after the message with the specified messageId in metadata.
	 * Used when restoring to a previous version.
	 */
	async truncateMessagesAfter(
		workflowId: string,
		userId: string | undefined,
		messageId: string,
		agentType?: 'code-builder',
	): Promise<boolean> {
		const threadId = SessionManagerService.generateThreadId(workflowId, userId, agentType);

		try {
			const loaded = await this.loadMessagesForTruncation(threadId);
			if (!loaded) {
				this.logger?.debug('No messages found for truncation', { threadId, messageId });
				return false;
			}

			const { messages, previousSummary } = loaded;

			// Find the index of the message with the target messageId
			const msgIndex = messages.findIndex((msg) => msg.additional_kwargs?.messageId === messageId);

			if (msgIndex === -1) {
				this.logger?.debug('Message with messageId not found', { threadId, messageId });
				return false;
			}

			// Keep messages before the target message
			const truncatedMessages = messages.slice(0, msgIndex);

			// Update persistent storage if available
			if (this.storage) {
				await this.storage.saveSession(threadId, {
					messages: truncatedMessages,
					previousSummary,
					updatedAt: new Date(),
				});
			}

			// Also update the in-memory checkpointer
			const threadConfig: RunnableConfig = {
				configurable: { thread_id: threadId },
			};

			const checkpointTuple = await this.checkpointer.getTuple(threadConfig);
			if (checkpointTuple?.checkpoint) {
				const updatedCheckpoint: Checkpoint = {
					...checkpointTuple.checkpoint,
					channel_values: {
						...checkpointTuple.checkpoint.channel_values,
						messages: truncatedMessages,
					},
				};

				const metadata = checkpointTuple.metadata ?? {
					source: 'update' as const,
					step: -1,
					parents: {},
				};

				await this.checkpointer.put(threadConfig, updatedCheckpoint, metadata);
			}

			// Also prune HITL history entries that reference removed messages.
			// Entries whose afterMessageId no longer exists in the surviving
			// messages would fall back near the start and reappear as stale.
			this.truncateHitlHistory(threadId, truncatedMessages);

			// Clear any pending HITL interrupt that belongs to the truncated portion
			this.clearPendingHitl(threadId);

			this.logger?.debug('Messages truncated successfully', {
				threadId,
				messageId,
				originalCount: messages.length,
				newCount: truncatedMessages.length,
			});

			// Reset the code-builder agent context session when truncating code-builder messages
			if (agentType === 'code-builder' && userId) {
				await this.resetCodeBuilderSession(workflowId, userId);
			}

			return true;
		} catch (error) {
			this.logger?.error('Failed to truncate messages', {
				threadId,
				messageId,
				error,
			});
			return false;
		}
	}

	/**
	 * Reset the code-builder agent context session.
	 * Called during restore to clear stale agent context (conversationEntries + summary).
	 */
	private async resetCodeBuilderSession(workflowId: string, userId: string): Promise<void> {
		const sessionThreadId = generateCodeBuilderThreadId(workflowId, userId);
		const sessionConfig: RunnableConfig = {
			configurable: {
				thread_id: sessionThreadId,
			},
		};

		const existingTuple = await this.checkpointer.getTuple(sessionConfig).catch(() => undefined);
		const existingCheckpoint = existingTuple?.checkpoint;

		const checkpoint: Checkpoint = existingCheckpoint
			? {
					...existingCheckpoint,
					ts: new Date().toISOString(),
					channel_values: {
						...existingCheckpoint.channel_values,
						codeBuilderSession: {
							conversationEntries: [],
							previousSummary: undefined,
						},
					},
				}
			: {
					v: 1,
					id: crypto.randomUUID(),
					ts: new Date().toISOString(),
					channel_values: {
						codeBuilderSession: {
							conversationEntries: [],
							previousSummary: undefined,
						},
					},
					channel_versions: {},
					versions_seen: {},
				};

		const sessionMetadata = existingTuple?.metadata ?? {
			source: 'update' as const,
			step: -1,
			parents: {},
		};

		await this.checkpointer.put(sessionConfig, checkpoint, sessionMetadata);

		this.logger?.debug('Code-builder session reset after truncation', {
			sessionThreadId,
			workflowId,
		});
	}
}
