import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { MemorySaver } from '@langchain/langgraph';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';

import { formatMessages } from '@/utils/stream-processor';

import { getBuilderToolsForDisplay } from './tools/builder-tools';

type LangchainMessage = AIMessage | HumanMessage | ToolMessage;

/**
 * Type guard to validate if a value is a valid Langchain message
 */
function isLangchainMessage(value: unknown): value is LangchainMessage {
	if (!value || typeof value !== 'object') {
		return false;
	}

	// Check for required properties that all message types have
	if (!('content' in value)) {
		return false;
	}

	const content = value.content;
	if (typeof content !== 'string' && !Array.isArray(content)) {
		return false;
	}

	// Check for message type indicators
	const hasValidType =
		'_getType' in value || // Common method in Langchain messages
		('constructor' in value &&
			value.constructor !== null &&
			typeof value.constructor === 'function' &&
			'name' in value.constructor &&
			(value.constructor.name === 'AIMessage' ||
				value.constructor.name === 'HumanMessage' ||
				value.constructor.name === 'ToolMessage')) ||
		('role' in value &&
			typeof value.role === 'string' &&
			['assistant', 'human', 'user', 'tool'].includes(value.role));

	return hasValidType;
}

/**
 * Type guard to validate if a value is an array of Langchain messages
 */
function isLangchainMessagesArray(value: unknown): value is LangchainMessage[] {
	if (!Array.isArray(value)) {
		return false;
	}

	return value.every(isLangchainMessage);
}

export interface Session {
	sessionId: string;
	messages: Array<Record<string, unknown>>;
	lastUpdated?: string;
}

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

					sessions.push({
						sessionId: threadId,
						messages: formatMessages(
							messages,
							getBuilderToolsForDisplay({
								nodeTypes: this.parsedNodeTypes,
							}),
						),
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
}
