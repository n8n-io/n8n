import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, ToolMessage, AIMessage, isAIMessage } from '@langchain/core/messages';
import { Annotation, StateGraph, END, isCommand } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ConfiguratorAgent } from '../agents/configurator.agent';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { processOperations } from '../utils/operations-processor';
import type { ChatPayload } from '../workflow-builder-agent';

/**
 * Configurator Subgraph State
 *
 * Isolated from parent - receives workflow to configure + execution context.
 * Internally manages message history and parameter updates.
 */
export const ConfiguratorSubgraphState = Annotation.Root({
	// Input: Workflow to configure
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),

	// Input: Execution context (optional)
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Input: Instance URL for webhook nodes
	instanceUrl: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal: Conversation
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Internal: Operations queue
	workflowOperations: Annotation<WorkflowOperation[] | null>({
		reducer: (x, y) => {
			if (y === null) return [];
			if (!y || y.length === 0) return x ?? [];
			return [...(x ?? []), ...y];
		},
		default: () => [],
	}),

	// Output: Final user-facing response
	finalResponse: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal: Safety counter
	iterationCount: Annotation<number>({
		reducer: (x, y) => (y !== undefined ? y : x) + 1,
		default: () => 0,
	}),
});

interface ConfiguratorSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
}

/**
 * Create Configurator Subgraph
 *
 * Self-contained graph that:
 * 1. Receives workflow + execution context
 * 2. Configures all node parameters
 * 3. Processes operations internally
 * 4. Returns final user-facing response
 */
export function createConfiguratorSubgraph(config: ConfiguratorSubgraphConfig) {
	const configuratorAgent = new ConfiguratorAgent({
		llm: config.llm,
		parsedNodeTypes: config.parsedNodeTypes,
		logger: config.logger,
		instanceUrl: config.instanceUrl,
	});

	const tools = configuratorAgent.getTools();
	const toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));

	/**
	 * Agent node - calls configurator agent
	 */
	const callAgent = async (state: typeof ConfiguratorSubgraphState.State) => {
		console.log('[Configurator Agent] Called in subgraph', {
			messageCount: state.messages.length,
			nodeCount: state.workflowJSON.nodes.length,
		});

		const agent = configuratorAgent.getAgent();

		// On first call, create initial message with workflow
		const messagesToUse =
			state.messages.length === 0
				? [
						new HumanMessage({
							content: `Configure all nodes in this workflow:\n\n${JSON.stringify(state.workflowJSON, null, 2)}`,
						}),
					]
				: state.messages;

		const response = await agent.invoke({
			messages: messagesToUse,
			instanceUrl: state.instanceUrl || '',
		});

		console.log('[Configurator Agent] Response', {
			hasToolCalls: response.tool_calls?.length ?? 0,
		});

		return { messages: [response] };
	};

	/**
	 * Tool execution node - simplified for subgraph
	 */
	const executeTools = async (state: typeof ConfiguratorSubgraphState.State) => {
		const lastMessage = state.messages[state.messages.length - 1];

		if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls?.length) {
			return {};
		}

		// Execute tools in parallel
		const toolResults = await Promise.all(
			lastMessage.tool_calls.map(async (toolCall) => {
				const tool = toolMap.get(toolCall.name);
				if (!tool) {
					return new ToolMessage({
						content: `Tool ${toolCall.name} not found`,
						tool_call_id: toolCall.id ?? '',
					});
				}

				try {
					const result = await tool.invoke(toolCall.args ?? {}, {
						toolCall: {
							id: toolCall.id,
							name: toolCall.name,
							args: toolCall.args ?? {},
						},
					});
					return result;
				} catch (error) {
					return new ToolMessage({
						content: `Tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
						tool_call_id: toolCall.id ?? '',
					});
				}
			}),
		);

		// Unwrap Command objects and collect messages/operations
		const messages: BaseMessage[] = [];
		const operations: WorkflowOperation[] = [];

		for (const result of toolResults) {
			if (isCommand(result)) {
				// Tool returned Command - extract update
				const update = result.update as any;
				if (update?.messages) messages.push(...update.messages);
				if (update?.workflowOperations) operations.push(...update.workflowOperations);
			} else if (result instanceof ToolMessage || result instanceof AIMessage) {
				// Direct message
				messages.push(result);
			}
		}

		return {
			messages,
			workflowOperations: operations.length > 0 ? operations : null,
		};
	};

	/**
	 * Should continue with tools or finish?
	 */
	const shouldContinue = (state: typeof ConfiguratorSubgraphState.State) => {
		// Safety: max 15 iterations
		if (state.iterationCount >= 15) {
			console.log('[Configurator Subgraph] Max iterations reached');
			return END;
		}

		const lastMessage = state.messages[state.messages.length - 1];
		const hasToolCalls =
			lastMessage &&
			'tool_calls' in lastMessage &&
			Array.isArray(lastMessage.tool_calls) &&
			lastMessage.tool_calls.length > 0;

		if (hasToolCalls) {
			return 'tools';
		}

		// No tool calls = done, extract final response
		return END;
	};

	// Build the subgraph
	const subgraph = new StateGraph(ConfiguratorSubgraphState)
		.addNode('agent', callAgent)
		.addNode('tools', executeTools)
		.addNode('process_operations', processOperations)
		.addEdge('__start__', 'agent')
		// Map 'tools' to tools node, END is handled automatically
		.addConditionalEdges('agent', shouldContinue)
		.addEdge('tools', 'process_operations')
		.addEdge('process_operations', 'agent'); // Loop back

	return subgraph.compile();
}
