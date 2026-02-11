import { RunnableConfig } from '@langchain/core/runnables';
import { type Checkpoint, MemorySaver } from '@langchain/langgraph';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';

import { generateCodeBuilderThreadId } from '@/code-builder/utils/code-builder-session';
import { getBuilderToolsForDisplay } from '@/tools/builder-tools';
import type { HITLHistoryEntry, HITLInterruptValue } from '@/types/planning';
import { isLangchainMessagesArray, LangchainMessage, Session } from '@/types/sessions';
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
		private readonly logger?: Logger,
	) {
		this.nodeTypes = parsedNodeTypes;
		this.checkpointer = new MemorySaver();
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
		// For now, we'll return the current session if we have a workflowId
		// MemorySaver doesn't expose a way to list all threads, so we'll need to
		// track this differently if we want to list all sessions
		const sessions: Session[] = [];

		if (workflowId) {
			const threadId = SessionManagerService.generateThreadId(workflowId, userId, agentType);
			const threadConfig: RunnableConfig = {
				configurable: {
					thread_id: threadId,
				},
			};

			try {
				// Try to get the checkpoint for this thread
				const checkpoint = await this.checkpointer.getTuple(threadConfig);

				if (checkpoint?.checkpoint) {
					const rawMessages = checkpoint.checkpoint.channel_values?.messages;
					const messages: LangchainMessage[] = isLangchainMessagesArray(rawMessages)
						? rawMessages
						: [];

					const formattedMessages = formatMessages(
						messages,
						getBuilderToolsForDisplay({
							nodeTypes: this.nodeTypes,
						}),
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
				// Thread doesn't exist yet
				this.logger?.debug('No session found for workflow:', { workflowId, error });
			}
		}

		return { sessions };
	}

	/**
	 * Truncate all messages including and after the message with the specified messageId in metadata.
	 * Used when restoring to a previous version.
	 *
	 * @param workflowId - The workflow ID
	 * @param userId - The user ID
	 * @param messageId - The messageId to find in HumanMessage's additional_kwargs. Messages from this
	 *                    point onward (including the message with this messageId) will be removed.
	 * @returns True if truncation was successful, false if thread or message not found
	 */
	async truncateMessagesAfter(
		workflowId: string,
		userId: string | undefined,
		messageId: string,
		agentType?: 'code-builder',
	): Promise<boolean> {
		const threadId = SessionManagerService.generateThreadId(workflowId, userId, agentType);
		const threadConfig: RunnableConfig = {
			configurable: {
				thread_id: threadId,
			},
		};

		try {
			const checkpointTuple = await this.checkpointer.getTuple(threadConfig);

			if (!checkpointTuple?.checkpoint) {
				this.logger?.debug('No checkpoint found for truncation', { threadId, messageId });
				return false;
			}

			const rawMessages = checkpointTuple.checkpoint.channel_values?.messages;
			if (!isLangchainMessagesArray(rawMessages)) {
				this.logger?.debug('No valid messages found for truncation', { threadId, messageId });
				return false;
			}

			// Find the index of the message with the target messageId in additional_kwargs
			const msgIndex = rawMessages.findIndex(
				(msg) => msg.additional_kwargs?.messageId === messageId,
			);

			if (msgIndex === -1) {
				this.logger?.debug('Message with messageId not found', { threadId, messageId });
				return false;
			}

			// Keep messages before the target message (excluding the target message)
			const truncatedMessages = rawMessages.slice(0, msgIndex);

			// Create updated checkpoint with truncated messages
			const updatedCheckpoint: Checkpoint = {
				...checkpointTuple.checkpoint,
				channel_values: {
					...checkpointTuple.checkpoint.channel_values,
					messages: truncatedMessages,
				},
			};

			// Put the updated checkpoint back with metadata indicating this is an update
			const metadata = checkpointTuple.metadata ?? {
				source: 'update' as const,
				step: -1,
				parents: {},
			};

			await this.checkpointer.put(threadConfig, updatedCheckpoint, metadata);

			// Also prune HITL history entries that reference removed messages.
			// Entries whose afterMessageId no longer exists in the surviving
			// messages would fall back near the start and reappear as stale.
			this.truncateHitlHistory(threadId, truncatedMessages);

			// Clear any pending HITL interrupt that belongs to the truncated portion
			this.clearPendingHitl(threadId);

			this.logger?.debug('Messages truncated successfully', {
				threadId,
				messageId,
				originalCount: rawMessages.length,
				newCount: truncatedMessages.length,
			});

			// Reset the code-builder agent context session when truncating code-builder messages
			if (agentType === 'code-builder' && userId) {
				await this.resetCodeBuilderSession(workflowId, userId);
			}

			return true;
		} catch (error) {
			this.logger?.error('Failed to truncate messages', { threadId, messageId, error });
			return false;
		}
	}

	/**
	 * Reset the code-builder agent context session.
	 * Called during restore to clear stale agent context (userMessages + summary).
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
							userMessages: [],
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
							userMessages: [],
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
