/**
 * Code Workflow Builder
 *
 * Public entry point for the two-agent workflow generation system.
 * Exposes a chat() method matching the existing OneShotWorkflowCodeAgent interface
 * for drop-in replacement.
 *
 * Architecture:
 * - Planning Agent: Categorizes requests, retrieves best practices, creates plans
 * - Coding Agent: Generates TypeScript SDK code following the plan
 * - Orchestrator: Routes between agents programmatically
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { Orchestrator, type ConversationMessage } from './orchestrator';
import type { StreamOutput } from './types/streaming';
import type { ChatPayload } from './workflow-builder-agent';

/**
 * Configuration for CodeWorkflowBuilder
 */
export interface CodeWorkflowBuilderConfig {
	/** LLM for the planning agent */
	planningLLM: BaseChatModel;
	/** LLM for the coding agent */
	codingLLM: BaseChatModel;
	/** Parsed node types from n8n */
	nodeTypes: INodeTypeDescription[];
	/** Optional logger */
	logger?: Logger;
	/**
	 * Path to the generated types directory (from InstanceSettings.generatedTypesDir).
	 * If not provided, falls back to workflow-sdk static types.
	 */
	generatedTypesDir?: string;
}

/**
 * Code Workflow Builder
 *
 * Two-agent system for generating n8n workflows:
 * 1. Planning Agent analyzes requests and creates detailed plans
 * 2. Coding Agent generates TypeScript SDK code following the plan
 *
 * This is a drop-in replacement for OneShotWorkflowCodeAgent with the same
 * chat() interface.
 */
export class CodeWorkflowBuilder {
	private orchestrator: Orchestrator;
	private logger?: Logger;

	constructor(config: CodeWorkflowBuilderConfig) {
		this.orchestrator = new Orchestrator({
			planningLLM: config.planningLLM,
			codingLLM: config.codingLLM,
			nodeTypes: config.nodeTypes,
			logger: config.logger,
			generatedTypesDir: config.generatedTypesDir,
		});

		this.logger = config.logger;
	}

	/**
	 * Main chat method - generates workflow from user request
	 *
	 * This method has the same signature as OneShotWorkflowCodeAgent.chat()
	 * for drop-in replacement compatibility.
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
		this.logger?.debug('CodeWorkflowBuilder starting', {
			userId,
			messageLength: payload.message.length,
		});

		// Extract current workflow from context
		const currentWorkflow = payload.workflowContext?.currentWorkflow as WorkflowJSON | undefined;

		// For now, we don't maintain conversation history in the builder itself.
		// The orchestrator will handle it if we add conversation history support later.
		const conversationHistory: ConversationMessage[] = [];

		// Delegate to orchestrator
		yield* this.orchestrator.chat(
			payload.message,
			currentWorkflow,
			conversationHistory,
			abortSignal,
		);
	}
}

/**
 * Factory function to create a CodeWorkflowBuilder with a single LLM
 * (uses the same LLM for both planning and coding)
 */
export function createCodeWorkflowBuilder(
	llm: BaseChatModel,
	nodeTypes: INodeTypeDescription[],
	options?: {
		logger?: Logger;
		generatedTypesDir?: string;
	},
): CodeWorkflowBuilder {
	return new CodeWorkflowBuilder({
		planningLLM: llm,
		codingLLM: llm,
		nodeTypes,
		logger: options?.logger,
		generatedTypesDir: options?.generatedTypesDir,
	});
}
