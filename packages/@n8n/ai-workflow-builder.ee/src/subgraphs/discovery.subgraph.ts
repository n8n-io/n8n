import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage, isAIMessage } from '@langchain/core/messages';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import { DiscoveryAgent } from '../agents/discovery.agent';

/**
 * Discovery Subgraph State
 *
 * Isolated from parent graph - only receives user request.
 * Internally manages its own message history and tool execution.
 */
export const DiscoverySubgraphState = Annotation.Root({
	// Input: What the user wants to build
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal: Conversation within this subgraph
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Output: Summary of what was found
	summary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal: Track iterations to prevent infinite loops
	iterationCount: Annotation<number>({
		reducer: (x, y) => (y !== undefined ? y : x) + 1,
		default: () => 0,
	}),
});

interface DiscoverySubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
}

/**
 * Create Discovery Subgraph
 *
 * Self-contained graph that:
 * 1. Takes user request as input
 * 2. Searches for nodes using search_nodes and get_node_details
 * 3. Loops internally until discovery is complete
 * 4. Returns summary (doesn't mutate parent state)
 */
export function createDiscoverySubgraph(config: DiscoverySubgraphConfig) {
	const discoveryAgent = new DiscoveryAgent({
		llm: config.llm,
		parsedNodeTypes: config.parsedNodeTypes,
	});

	const tools = discoveryAgent.getTools();
	const toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));

	/**
	 * Agent node - calls discovery agent
	 */
	const callAgent = async (state: typeof DiscoverySubgraphState.State) => {
		// On first call, initialize with user request
		if (state.messages.length === 0) {
			const initialMessage = new AIMessage({
				content: `User request: ${state.userRequest}`,
			});
			return { messages: [initialMessage] };
		}

		const agent = discoveryAgent.getAgent();
		const response = await agent.invoke({
			messages: state.messages,
		});

		return { messages: [response] };
	};

	/**
	 * Tool execution node - simplified for subgraph
	 */
	const executeTools = async (state: typeof DiscoverySubgraphState.State) => {
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

					// Discovery tools return simple messages, not Command objects
					return result;
				} catch (error) {
					return new ToolMessage({
						content: `Tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
						tool_call_id: toolCall.id ?? '',
					});
				}
			}),
		);

		return {
			messages: toolResults as BaseMessage[],
		};
	};

	/**
	 * Should continue with tools or finish?
	 */
	const shouldContinue = (state: typeof DiscoverySubgraphState.State) => {
		// Safety: max 10 iterations
		if (state.iterationCount >= 10) {
			console.log('[Discovery Subgraph] Max iterations reached');
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

		// No tool calls = agent is done
		return END;
	};

	// Build the subgraph
	const subgraph = new StateGraph(DiscoverySubgraphState)
		.addNode('agent', callAgent)
		.addNode('tools', executeTools)
		.addEdge('__start__', 'agent')
		// Map 'tools' to tools node, END is handled automatically
		.addConditionalEdges('agent', shouldContinue, {
			tools: 'tools',
		})
		.addEdge('tools', 'agent'); // After tools, go back to agent

	return subgraph.compile();
}
