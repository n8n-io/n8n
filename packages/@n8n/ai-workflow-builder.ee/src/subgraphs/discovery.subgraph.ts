import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import { DiscoveryAgent } from '../agents/discovery.agent';
import { executeSubgraphTools } from '../utils/subgraph-helpers';

/**
 * Discovery Subgraph State
 *
 * Isolated from parent graph - receives user request and optional supervisor instructions.
 * Internally manages its own message history and tool execution.
 * Outputs structured node findings with reasoning and relevant context.
 */
export const DiscoverySubgraphState = Annotation.Root({
	// Input: What the user wants to build
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Input: Optional instructions from supervisor
	supervisorInstructions: Annotation<string | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// Internal: Conversation within this subgraph
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Output: Found nodes with reasoning
	nodesFound: Annotation<Array<{ nodeType: INodeTypeDescription; reasoning: string }>>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Relevant context for other agents
	relevantContext: Annotation<
		Array<{ context: string; relevancy?: 'configurator' | 'builder' | 'responder' }>
	>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Human-readable summary
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
		console.log('[Discovery Agent] Called in subgraph', {
			messageCount: state.messages.length,
			userRequest: state.userRequest.substring(0, 100),
			hasSupervisorInstructions: !!state.supervisorInstructions,
		});

		const agent = discoveryAgent.getAgent();

		// On first call, create initial message
		const messagesToUse =
			state.messages.length === 0
				? [
						new HumanMessage({
							content: state.supervisorInstructions ?? `Find n8n nodes for: ${state.userRequest}`,
						}),
					]
				: state.messages;

		const response = await agent.invoke({
			messages: messagesToUse,
		});

		console.log('[Discovery Agent] Response', {
			hasToolCalls: response.tool_calls?.length ?? 0,
			hasContent: !!response.content,
		});

		return { messages: [response] };
	};

	/**
	 * Tool execution node - uses helper for consistent execution
	 */
	const executeTools = async (state: typeof DiscoverySubgraphState.State) => {
		return await executeSubgraphTools(state, toolMap);
	};

	/**
	 * Should continue with tools or finish?
	 */
	const shouldContinue = (state: typeof DiscoverySubgraphState.State) => {
		// Safety: max 10 iterations
		if (state.iterationCount >= 30) {
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
		.addConditionalEdges('agent', shouldContinue)
		.addEdge('tools', 'agent'); // After tools, go back to agent

	return subgraph.compile();
}
