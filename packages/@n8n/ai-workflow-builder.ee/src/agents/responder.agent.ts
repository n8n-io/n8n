import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Logger } from '@n8n/backend-common';
import { createAgent, createMiddleware } from 'langchain';
import { z } from 'zod';

import {
	buildDataTableCreationGuidance,
	buildGeneralErrorGuidance,
	buildRecursionErrorNoWorkflowGuidance,
	buildRecursionErrorWithWorkflowGuidance,
	buildResponderPrompt,
} from '@/prompts';
import type { CoordinationLogEntry } from '@/types/coordination';
import type { DiscoveryContext } from '@/types/discovery-types';
import type { SimpleWorkflow } from '@/types/workflow';
import {
	buildSelectedNodesContextBlock,
	buildSimplifiedExecutionContext,
	buildWorkflowOverview,
} from '@/utils/context-builders';
import {
	getBuilderOutput,
	getErrorEntry,
	hasRecursionErrorsCleared,
} from '@/utils/coordination-log';
import { extractDataTableInfo } from '@/utils/data-table-helpers';
import type { ChatPayload } from '@/workflow-builder-agent';

import {
	createIntrospectTool,
	extractIntrospectionEventsFromMessages,
	type IntrospectionEvent,
} from '../tools/introspect.tool';

/**
 * Context required for the responder to generate a response
 */
export interface ResponderContext {
	/** Conversation messages */
	messages: BaseMessage[];
	/** Coordination log tracking subgraph completion */
	coordinationLog: CoordinationLogEntry[];
	/** Discovery results (nodes found) */
	discoveryContext?: DiscoveryContext | null;
	/** Current workflow state */
	workflowJSON: SimpleWorkflow;
	/** Workflow context including selected nodes and execution data */
	workflowContext?: ChatPayload['workflowContext'];
	/** Summary of previous conversation (from compaction) */
	previousSummary?: string;
}

/**
 * Result from invokeResponderAgent
 */
export interface ResponderResult {
	response: BaseMessage;
	introspectionEvents: IntrospectionEvent[];
}

/**
 * Schema for context passed via runtime.context
 */
const responderContextSchema = z.object({
	coordinationLog: z.array(z.any()),
	discoveryContext: z.any().optional().nullable(),
	workflowJSON: z.any(),
	previousSummary: z.string().optional(),
	workflowContext: z.any().optional(),
});

/**
 * Build internal context message from coordination log and state.
 * This is called by the middleware to inject context into the message stream.
 */
function buildContextContent(context: ResponderContext): string | null {
	const contextParts: string[] = [];

	// Previous conversation summary (from compaction)
	if (context.previousSummary) {
		contextParts.push(`**Previous Conversation Summary:**\n${context.previousSummary}`);
	}

	// Check for state management actions (compact/clear)
	const stateManagementEntry = context.coordinationLog.find((e) => e.phase === 'state_management');
	if (stateManagementEntry) {
		contextParts.push(`**State Management:** ${stateManagementEntry.summary}`);
	}

	// Check for errors - provide context-aware guidance (AI-1812)
	// Skip errors that have been cleared (AI-1812)
	const errorEntry = getErrorEntry(context.coordinationLog);
	const errorsCleared = hasRecursionErrorsCleared(context.coordinationLog);

	// Selected nodes context (for deictic resolution)
	const selectedNodesBlock = buildSelectedNodesContextBlock(context.workflowContext);
	if (selectedNodesBlock) {
		contextParts.push(`=== SELECTED NODES ===\n${selectedNodesBlock}`);
	}

	if (errorEntry && !errorsCleared) {
		const hasWorkflow = context.workflowJSON.nodes.length > 0;
		const errorMessage = errorEntry.summary.toLowerCase();
		const isRecursionError =
			errorMessage.includes('recursion') ||
			errorMessage.includes('maximum number of steps') ||
			errorMessage.includes('iteration limit');

		contextParts.push(
			`**Error:** An error occurred in the ${errorEntry.phase} phase: ${errorEntry.summary}`,
		);

		// AI-1812: Provide better guidance based on workflow state and error type
		if (isRecursionError && hasWorkflow) {
			// Recursion error but workflow was created
			const guidance = buildRecursionErrorWithWorkflowGuidance(context.workflowJSON.nodes.length);
			contextParts.push(...guidance);
		} else if (isRecursionError && !hasWorkflow) {
			// Recursion error and no workflow created
			const guidance = buildRecursionErrorNoWorkflowGuidance();
			contextParts.push(...guidance);
		} else {
			// Other errors (not recursion-related)
			contextParts.push(buildGeneralErrorGuidance());
		}
	}

	// Discovery context
	if (context.discoveryContext?.nodesFound.length) {
		contextParts.push(
			`**Discovery:** Found ${context.discoveryContext.nodesFound.length} relevant nodes`,
		);
	}

	// Builder output (handles both node creation and parameter configuration)
	const builderOutput = getBuilderOutput(context.coordinationLog);
	if (builderOutput) {
		contextParts.push(`**Builder:** ${builderOutput}`);
	} else if (context.workflowJSON.nodes.length) {
		// Provide workflow overview with Mermaid diagram and parameters
		contextParts.push(`**Workflow:**\n${buildWorkflowOverview(context.workflowJSON)}`);
	}

	// Data Table creation guidance
	// If the workflow contains Data Table nodes, inform user they need to create tables manually
	const dataTableInfo = extractDataTableInfo(context.workflowJSON);
	if (dataTableInfo.length > 0) {
		const dataTableGuidance = buildDataTableCreationGuidance(dataTableInfo);
		contextParts.push(dataTableGuidance);
	}

	// Execution status (simplified error info for user explanations)
	if (context.workflowContext) {
		const executionStatus = buildSimplifiedExecutionContext(
			context.workflowContext,
			context.workflowJSON.nodes,
		);
		contextParts.push(`**Execution Status:**\n${executionStatus}`);
	}

	if (contextParts.length === 0) {
		return null;
	}

	return `[Internal Context - Use this to craft your response]\n${contextParts.join('\n\n')}`;
}

/**
 * Middleware that injects coordination context into the model request.
 * This replaces the manual context building in the old class-based implementation.
 */
const contextInjectionMiddleware = createMiddleware({
	name: 'ResponderContextInjection',
	contextSchema: responderContextSchema,
	wrapModelCall: async (request, handler) => {
		const context = request.runtime.context as z.infer<typeof responderContextSchema> | undefined;
		if (!context) {
			return await handler(request);
		}

		// Build the full ResponderContext for the helper function
		// Use explicit casts since the Zod schema uses z.any() for complex types
		const responderContext: ResponderContext = {
			messages: request.messages,
			coordinationLog: (context.coordinationLog ?? []) as CoordinationLogEntry[],
			discoveryContext: context.discoveryContext as DiscoveryContext | null | undefined,
			workflowJSON: (context.workflowJSON ?? { nodes: [], connections: {} }) as SimpleWorkflow,
			previousSummary: context.previousSummary,
			workflowContext: context.workflowContext as ChatPayload['workflowContext'] | undefined,
		};

		const contextContent = buildContextContent(responderContext);
		if (!contextContent) {
			return await handler(request);
		}

		// Inject context as an additional human message
		const contextMessage = new HumanMessage({ content: contextContent });

		return await handler({
			...request,
			messages: [...request.messages, contextMessage],
		});
	},
});

export interface ResponderAgentConfig {
	llm: BaseChatModel;
	/** Enable introspection tool for diagnostic data collection. */
	enableIntrospection?: boolean;
	logger?: Logger;
}

/**
 * Create Responder agent using LangChain v1 createAgent.
 *
 * The Responder synthesizes final user-facing responses from workflow building context.
 * It handles conversational queries and explanations.
 */
export function createResponderAgent(config: ResponderAgentConfig) {
	const tools = config.enableIntrospection ? [createIntrospectTool(config.logger).tool] : [];

	const systemPromptText = buildResponderPrompt({
		enableIntrospection: config.enableIntrospection,
	});

	// Use SystemMessage with cache_control for Anthropic prompt caching
	const systemPrompt = new SystemMessage({
		content: [
			{
				type: 'text',
				text: systemPromptText,
				cache_control: { type: 'ephemeral' },
			},
		],
	});

	return createAgent({
		model: config.llm,
		tools,
		systemPrompt,
		middleware: [contextInjectionMiddleware],
		contextSchema: responderContextSchema,
	});
}

/**
 * Type for the compiled agent returned by createResponderAgent
 */
export type ResponderAgentType = ReturnType<typeof createResponderAgent>;

/**
 * Invoke the responder agent with the given context.
 * This is a convenience wrapper that handles context passing.
 *
 * @returns The response message and any introspection events collected
 */
export async function invokeResponderAgent(
	agent: ResponderAgentType,
	context: ResponderContext,
	config?: RunnableConfig,
	options?: { enableIntrospection?: boolean },
): Promise<ResponderResult> {
	const result = await agent.invoke(
		{ messages: context.messages },
		{
			...config,
			context: {
				coordinationLog: context.coordinationLog,
				discoveryContext: context.discoveryContext,
				workflowJSON: context.workflowJSON,
				previousSummary: context.previousSummary,
				workflowContext: context.workflowContext,
			},
		},
	);

	// Extract the last message from the result
	// The agent returns { messages: BaseMessage[], ... } after processing
	const messages = result.messages;

	// Extract introspection events from tool calls in agent messages
	const introspectionEvents = options?.enableIntrospection
		? extractIntrospectionEventsFromMessages(messages)
		: [];

	const response =
		messages.length === 0
			? new AIMessage({
					content: 'I encountered an issue generating a response. Please try again.',
				})
			: messages[messages.length - 1];

	return { response, introspectionEvents };
}
