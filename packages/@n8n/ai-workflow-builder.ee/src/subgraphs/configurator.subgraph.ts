import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ConfiguratorAgent } from '../agents/configurator.agent';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { processOperations } from '../utils/operations-processor';
import { executeSubgraphTools } from '../utils/subgraph-helpers';
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
	 * Tool execution node - uses helper for consistent execution
	 */
	const executeTools = async (state: typeof ConfiguratorSubgraphState.State) => {
		return await executeSubgraphTools(state, toolMap);
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
