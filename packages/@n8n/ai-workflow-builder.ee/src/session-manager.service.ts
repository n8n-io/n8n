import { RunnableConfig } from '@langchain/core/runnables';
import { type Checkpoint, MemorySaver } from '@langchain/langgraph';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';

import { getBuilderToolsForDisplay } from '@/tools/builder-tools';
import { isLangchainMessagesArray, LangchainMessage, Session } from '@/types/sessions';
import { formatMessages } from '@/utils/stream-processor';

@Service()
export class SessionManagerService {
	private checkpointer: MemorySaver;

	private nodeTypes: INodeTypeDescription[];

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
	 */
	static generateThreadId(workflowId?: string, userId?: string): string {
		return workflowId
			? `workflow-${workflowId}-user-${userId ?? new Date().getTime()}`
			: crypto.randomUUID();
	}

	/**
	 * Get the checkpointer instance
	 */
	getCheckpointer(): MemorySaver {
		return this.checkpointer;
	}

	/**
	 * Get sessions for a given workflow and user
	 */
	async getSessions(
		workflowId: string | undefined,
		userId: string | undefined,
	): Promise<{ sessions: Session[] }> {
		// For now, we'll return the current session if we have a workflowId
		// MemorySaver doesn't expose a way to list all threads, so we'll need to
		// track this differently if we want to list all sessions
		const sessions: Session[] = [];

		if (workflowId) {
			const threadId = SessionManagerService.generateThreadId(workflowId, userId);
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
	): Promise<boolean> {
		const threadId = SessionManagerService.generateThreadId(workflowId, userId);
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

			this.logger?.debug('Messages truncated successfully', {
				threadId,
				messageId,
				originalCount: rawMessages.length,
				newCount: truncatedMessages.length,
			});

			return true;
		} catch (error) {
			this.logger?.error('Failed to truncate messages', { threadId, messageId, error });
			return false;
		}
	}
}
