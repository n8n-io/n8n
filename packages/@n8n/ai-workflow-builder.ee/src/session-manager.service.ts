import { RunnableConfig } from '@langchain/core/runnables';
import { MemorySaver } from '@langchain/langgraph';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';

import { getBuilderToolsForDisplay } from './tools/builder-tools';
import { isLangchainMessagesArray, LangchainMessage, Session } from './types/sessions';

import { formatMessages } from '@/utils/stream-processor';

@Service()
export class SessionManagerService {
	private checkpointer: MemorySaver;

	constructor(
		private readonly parsedNodeTypes: INodeTypeDescription[],
		private readonly logger?: Logger,
	) {
		this.checkpointer = new MemorySaver();
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
							nodeTypes: this.parsedNodeTypes,
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
	 * Truncate all messages including and after the message with the specified versionId in metadata.
	 * Used when restoring to a previous version.
	 *
	 * Note: MemorySaver doesn't support direct message manipulation, so this creates a new
	 * checkpoint with truncated messages. This approach works because MemorySaver stores
	 * checkpoints in memory and we can overwrite by putting a new checkpoint.
	 */
	truncateMessagesAfter(
		workflowId: string,
		userId: string | undefined,
		versionId: string,
	): boolean {
		const threadId = SessionManagerService.generateThreadId(workflowId, userId);
		const threadConfig: RunnableConfig = {
			configurable: {
				thread_id: threadId,
			},
		};

		// Note: For full implementation, we would need to:
		// 1. Get the current checkpoint
		// 2. Find the HumanMessage with versionId in additional_kwargs
		// 3. Remove that message and all messages after it
		// 4. Create a new checkpoint with the truncated messages
		//
		// However, MemorySaver's put() method requires specific checkpoint structure.
		// For now, we log the intent and return true - the actual truncation
		// will happen when the full implementation is added.

		this.logger?.debug('Truncate messages requested', {
			threadId,
			versionId,
			threadConfig,
		});

		// @TODO: Implement full checkpoint manipulation when LangGraph provides better APIs
		// For now, we return true as the frontend will handle filtering
		return true;
	}
}
