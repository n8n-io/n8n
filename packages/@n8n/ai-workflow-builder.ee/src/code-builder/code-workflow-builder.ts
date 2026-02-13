/**
 * Code Workflow Builder
 *
 * Public entry point for the workflow generation system.
 *
 * Architecture:
 * Uses a unified CodeBuilderAgent that combines node discovery and code generation
 * in a single agentic loop, preserving full context throughout the process.
 *
 * Session Management:
 * Supports multi-turn conversations through session persistence. User messages are
 * stored and can be compacted when the count exceeds a threshold. This allows users
 * to make incremental refinement requests without re-explaining the whole workflow.
 */

import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription, ITelemetryTrackProperties } from 'n8n-workflow';

import type { StreamOutput } from '../types/streaming';
import type { ChatPayload } from '../workflow-builder-agent';
import { CodeBuilderAgent } from './code-builder-agent';
import { SessionChatHandler } from './handlers/session-chat-handler';
import type { TokenUsage } from './types';
export type { TokenUsage };

/**
 * Configuration for CodeWorkflowBuilder
 */
export interface CodeWorkflowBuilderConfig {
	/** LLM for workflow generation */
	llm: BaseChatModel;
	/** Parsed node types from n8n */
	nodeTypes: INodeTypeDescription[];
	/** Optional logger */
	logger?: Logger;
	/**
	 * Ordered list of directories to search for built-in node definitions.
	 */
	nodeDefinitionDirs?: string[];
	/**
	 * Optional checkpointer for session persistence.
	 * If provided, enables multi-turn conversation history.
	 */
	checkpointer?: MemorySaver;
	/**
	 * Callback when generation completes successfully (not aborted).
	 * Used for credit deduction and UI updates.
	 */
	onGenerationSuccess?: () => Promise<void>;
	/**
	 * Optional callback to receive token usage data from each LLM invocation.
	 * Called after each LLM call completes. Callers can accumulate for totals.
	 */
	onTokenUsage?: (usage: TokenUsage) => void;
	/**
	 * Optional LangChain callbacks (e.g., LangSmith tracer) for LLM invocations.
	 */
	callbacks?: Callbacks;
	/**
	 * Optional metadata to include in LangSmith traces.
	 */
	runMetadata?: Record<string, unknown>;
	/**
	 * Optional callback for emitting telemetry events.
	 */
	onTelemetryEvent?: (event: string, properties: ITelemetryTrackProperties) => void;
	/**
	 * Whether to generate pin data for new nodes. Defaults to true.
	 */
	generatePinData?: boolean;
}

/**
 * Code Workflow Builder
 *
 * Generates n8n workflows using a unified CodeBuilderAgent that handles
 * both node discovery and code generation in a single pass.
 *
 * Supports multi-turn conversations through session persistence when a
 * checkpointer is provided.
 */
export class CodeWorkflowBuilder {
	private codeBuilderAgent: CodeBuilderAgent;
	private logger?: Logger;
	private sessionChatHandler?: SessionChatHandler;
	private onGenerationSuccess?: () => Promise<void>;

	constructor(config: CodeWorkflowBuilderConfig) {
		this.codeBuilderAgent = new CodeBuilderAgent({
			llm: config.llm,
			nodeTypes: config.nodeTypes,
			logger: config.logger,
			nodeDefinitionDirs: config.nodeDefinitionDirs,
			enableTextEditor: true,
			onTokenUsage: config.onTokenUsage,
			callbacks: config.callbacks,
			runMetadata: config.runMetadata,
			onTelemetryEvent: config.onTelemetryEvent,
			generatePinData: config.generatePinData,
		});

		this.logger = config.logger;
		this.onGenerationSuccess = config.onGenerationSuccess;

		// Initialize session handler if checkpointer is provided
		if (config.checkpointer) {
			this.sessionChatHandler = new SessionChatHandler({
				checkpointer: config.checkpointer,
				llm: config.llm,
				logger: config.logger,
				onGenerationSuccess: config.onGenerationSuccess,
			});
		}
	}

	/**
	 * Main chat method - generates workflow from user request
	 *
	 * @param payload - Chat payload with message and workflow context
	 * @param userId - User ID for logging
	 * @param abortSignal - Optional abort signal
	 * @yields StreamOutput chunks for messages, tool progress, and workflow updates
	 */
	async *chat(
		payload: ChatPayload,
		userId: string,
		abortSignal?: AbortSignal,
	): AsyncGenerator<StreamOutput, void, unknown> {
		const workflowId = payload.workflowContext?.currentWorkflow?.id;

		this.logger?.debug('CodeWorkflowBuilder starting', {
			userId,
			workflowId,
			messageLength: payload.message.length,
			hasSessionHandler: !!this.sessionChatHandler,
		});

		// Use session handler if available (handles onGenerationSuccess internally)
		if (this.sessionChatHandler) {
			yield* this.sessionChatHandler.execute({
				payload,
				userId,
				abortSignal,
				agentChat: (p, u, s, h) => this.codeBuilderAgent.chat(p, u, s, h),
			});
		} else {
			// No session handler - track generation success and call callback manually
			let generationSucceeded = false;

			for await (const chunk of this.codeBuilderAgent.chat(payload, userId, abortSignal)) {
				// Check if this chunk indicates successful workflow generation
				if (chunk.messages?.some((msg) => msg.type === 'workflow-updated')) {
					generationSucceeded = true;
				}
				yield chunk;
			}

			if (generationSucceeded && this.onGenerationSuccess) {
				try {
					await this.onGenerationSuccess();
				} catch (error) {
					this.logger?.warn('Failed to execute onGenerationSuccess callback', { error });
				}
			}
		}
	}
}

/**
 * Factory function to create a CodeWorkflowBuilder
 */
export function createCodeWorkflowBuilder(
	llm: BaseChatModel,
	nodeTypes: INodeTypeDescription[],
	options?: {
		logger?: Logger;
		nodeDefinitionDirs?: string[];
	},
): CodeWorkflowBuilder {
	return new CodeWorkflowBuilder({
		llm,
		nodeTypes,
		logger: options?.logger,
		nodeDefinitionDirs: options?.nodeDefinitionDirs,
	});
}
