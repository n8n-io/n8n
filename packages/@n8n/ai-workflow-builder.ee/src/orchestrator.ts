/**
 * Two-Agent Orchestrator
 *
 * Programmatic orchestrator (not AI) that routes between planning and coding agents:
 * 1. Assembles context (workflow code + recent messages with token limit)
 * 2. Calls Planning Agent, parses JSON response
 * 3. Routes to Coding Agent or returns answer directly
 * 4. Manages streaming and abort propagation
 */

import { inspect } from 'node:util';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { PlanningAgent, type PlanningAgentResponse } from './planning-agent';
import { CodingAgent } from './coding-agent';
import { NodeTypeParser } from './utils/node-type-parser';
import type { StreamOutput, AgentMessageChunk } from './types/streaming';
import type { INodeTypeDescription } from 'n8n-workflow';

/** Token limit for conversation history (~4k tokens) */
const CONVERSATION_HISTORY_TOKEN_LIMIT = 4000;

/** Approximate tokens per character for English text */
const TOKENS_PER_CHAR = 0.25;

/**
 * Configuration for the orchestrator
 */
export interface OrchestratorConfig {
	/** LLM for planning agent */
	planningLLM: BaseChatModel;
	/** LLM for coding agent */
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
 * Conversation message for history
 */
export interface ConversationMessage {
	role: 'user' | 'assistant';
	content: string;
	timestamp?: number;
}

/**
 * Two-Agent Orchestrator
 *
 * Coordinates between the planning agent and coding agent to generate workflows.
 */
export class Orchestrator {
	private planningAgent: PlanningAgent;
	private codingAgent: CodingAgent;
	private logger?: Logger;

	constructor(config: OrchestratorConfig) {
		const nodeTypeParser = new NodeTypeParser(config.nodeTypes);

		this.planningAgent = new PlanningAgent({
			llm: config.planningLLM,
			nodeTypeParser,
			logger: config.logger,
		});

		this.codingAgent = new CodingAgent({
			llm: config.codingLLM,
			logger: config.logger,
			generatedTypesDir: config.generatedTypesDir,
		});

		this.logger = config.logger;

		this.debugLog('CONSTRUCTOR', 'Orchestrator initialized');
	}

	/**
	 * Debug logging helper
	 */
	private debugLog(context: string, message: string, data?: Record<string, unknown>): void {
		const timestamp = new Date().toISOString();
		const prefix = `[ORCHESTRATOR][${timestamp}][${context}]`;

		if (data) {
			const formatted = inspect(data, {
				depth: null,
				colors: true,
				maxStringLength: null,
				maxArrayLength: null,
				breakLength: 120,
			});
			console.log(`${prefix} ${message}\n${formatted}`);
		} else {
			console.log(`${prefix} ${message}`);
		}
	}

	/**
	 * Estimate token count from character count
	 */
	private estimateTokens(text: string): number {
		return Math.ceil(text.length * TOKENS_PER_CHAR);
	}

	/**
	 * Trim conversation history to fit within token limit
	 * Keeps the most recent messages that fit within the limit
	 */
	private trimConversationHistory(
		messages: ConversationMessage[],
		tokenLimit: number,
	): ConversationMessage[] {
		if (messages.length === 0) {
			return [];
		}

		// Calculate total tokens
		let totalTokens = 0;
		for (const msg of messages) {
			totalTokens += this.estimateTokens(msg.content);
		}

		// If within limit, return all messages
		if (totalTokens <= tokenLimit) {
			return messages;
		}

		// Otherwise, keep most recent messages that fit
		const result: ConversationMessage[] = [];
		let usedTokens = 0;

		// Work backwards from most recent
		for (let i = messages.length - 1; i >= 0; i--) {
			const msgTokens = this.estimateTokens(messages[i].content);
			if (usedTokens + msgTokens <= tokenLimit) {
				result.unshift(messages[i]);
				usedTokens += msgTokens;
			} else {
				break;
			}
		}

		this.debugLog('TRIM_HISTORY', 'Trimmed conversation history', {
			originalCount: messages.length,
			trimmedCount: result.length,
			originalTokens: totalTokens,
			usedTokens,
			tokenLimit,
		});

		return result;
	}

	/**
	 * Main chat method - orchestrates between planning and coding agents
	 *
	 * @param userMessage - The user's request
	 * @param currentWorkflow - Optional existing workflow for context
	 * @param conversationHistory - Optional conversation history for context
	 * @param abortSignal - Optional abort signal
	 * @yields StreamOutput chunks for messages, tool progress, and workflow updates
	 */
	async *chat(
		userMessage: string,
		currentWorkflow?: WorkflowJSON,
		conversationHistory?: ConversationMessage[],
		abortSignal?: AbortSignal,
	): AsyncGenerator<StreamOutput, void, unknown> {
		const startTime = Date.now();
		this.debugLog('CHAT', '========== ORCHESTRATOR STARTING ==========');
		this.debugLog('CHAT', 'Input', {
			userMessageLength: userMessage.length,
			hasCurrentWorkflow: !!currentWorkflow,
			currentWorkflowNodeCount: currentWorkflow?.nodes?.length ?? 0,
			conversationHistoryCount: conversationHistory?.length ?? 0,
		});

		this.logger?.debug('Orchestrator starting', {
			userMessageLength: userMessage.length,
			hasCurrentWorkflow: !!currentWorkflow,
		});

		try {
			// Trim conversation history to token limit
			const trimmedHistory = conversationHistory
				? this.trimConversationHistory(conversationHistory, CONVERSATION_HISTORY_TOKEN_LIMIT)
				: [];

			// Build user message with conversation context
			let fullUserMessage = userMessage;
			if (trimmedHistory.length > 0) {
				const historyText = trimmedHistory
					.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
					.join('\n\n');
				fullUserMessage = `<conversation_context>\n${historyText}\n</conversation_context>\n\nCurrent request:\n${userMessage}`;
			}

			// Check for abort before starting
			if (abortSignal?.aborted) {
				this.debugLog('CHAT', 'Abort signal received before starting');
				throw new Error('Aborted');
			}

			// Step 1: Run Planning Agent
			this.debugLog('CHAT', 'Starting Planning Agent...');

			let planningResponse: PlanningAgentResponse | null = null;

			// Stream planning agent output wrapped in tags
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: '<final_workflow_plan>\n',
					} as AgentMessageChunk,
				],
			};

			const planningGenerator = this.planningAgent.run(
				fullUserMessage,
				currentWorkflow,
				abortSignal,
			);

			// Forward planning agent stream
			while (true) {
				const result = await planningGenerator.next();
				if (result.done) {
					planningResponse = result.value;
					break;
				}
				// Forward the stream chunk
				yield result.value;
			}

			// Close planning tags
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: '\n</final_workflow_plan>\n',
					} as AgentMessageChunk,
				],
			};

			if (!planningResponse) {
				throw new Error('Planning agent did not return a response');
			}

			this.debugLog('CHAT', 'Planning Agent completed', {
				responseType: planningResponse.type,
				contentLength: planningResponse.content.length,
			});

			// Step 2: Route based on response type
			if (planningResponse.type === 'answer') {
				// Direct answer - stream it and we're done
				this.debugLog('CHAT', 'Routing: Direct answer');
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'message',
							text: planningResponse.content,
						} as AgentMessageChunk,
					],
				};
			} else if (planningResponse.type === 'plan') {
				// Plan - run coding agent
				this.debugLog('CHAT', 'Routing: Plan → Coding Agent');

				// Stream the plan to user
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'message',
							text: `\n**Workflow Plan:**\n\n${planningResponse.content}\n\n---\n\n**Generating code...**\n`,
						} as AgentMessageChunk,
					],
				};

				// Check for abort before coding
				if (abortSignal?.aborted) {
					this.debugLog('CHAT', 'Abort signal received before coding');
					throw new Error('Aborted');
				}

				// Step 3: Run Coding Agent
				this.debugLog('CHAT', 'Starting Coding Agent...');

				const codingGenerator = this.codingAgent.run(
					planningResponse.content,
					currentWorkflow,
					abortSignal,
				);

				// Forward coding agent stream
				for await (const chunk of codingGenerator) {
					yield chunk;
				}

				this.debugLog('CHAT', 'Coding Agent completed');
			} else {
				throw new Error(`Unknown planning response type: ${String(planningResponse.type)}`);
			}

			const totalDuration = Date.now() - startTime;
			this.debugLog('CHAT', '========== ORCHESTRATOR COMPLETE ==========', {
				totalDurationMs: totalDuration,
			});
		} catch (error) {
			const totalDuration = Date.now() - startTime;
			this.debugLog('CHAT', '========== ORCHESTRATOR FAILED ==========', {
				totalDurationMs: totalDuration,
				errorMessage: error instanceof Error ? error.message : String(error),
			});

			// Stream error message
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
					} as AgentMessageChunk,
				],
			};
		}
	}
}
