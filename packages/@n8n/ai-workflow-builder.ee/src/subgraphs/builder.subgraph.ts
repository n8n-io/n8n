import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { BuilderAgent } from '../agents/builder.agent';
import { processOperations } from '../utils/operations-processor';
import { executeSubgraphTools } from '../utils/subgraph-helpers';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';

/**
 * Builder Subgraph State
 *
 * Isolated from parent - receives current workflow and user request.
 * Internally manages message history, tool execution, and operations.
 */
export const BuilderSubgraphState = Annotation.Root({
	// Input: Current workflow to modify
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),

	// Input: What user wants
	userRequest: Annotation<string>({
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

	// Output: Summary
	summary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal: Safety counter
	iterationCount: Annotation<number>({
		reducer: (x, y) => (y !== undefined ? y : x) + 1,
		default: () => 0,
	}),
});

interface BuilderSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: any;
	logger?: Logger;
}

/**
 * Create Builder Subgraph
 *
 * Self-contained graph that:
 * 1. Receives current workflow + user request
 * 2. Adds nodes and creates connections
 * 3. Processes operations internally
 * 4. Returns updated workflow
 */
export function createBuilderSubgraph(config: BuilderSubgraphConfig) {
	const builderAgent = new BuilderAgent({
		llm: config.llm,
		parsedNodeTypes: config.parsedNodeTypes,
		logger: config.logger,
	});

	const tools = builderAgent.getTools();
	const toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));

	/**
	 * Agent node - calls builder agent
	 */
	const callAgent = async (state: typeof BuilderSubgraphState.State) => {
		console.log('[Builder Agent] Called in subgraph', {
			messageCount: state.messages.length,
			nodeCount: state.workflowJSON.nodes.length,
			iteration: state.iterationCount,
		});

		const agent = builderAgent.getAgent();

		// On first call, create initial message with context
		const messagesToUse =
			state.messages.length === 0
				? [
						new HumanMessage({
							content: `Build workflow for: ${state.userRequest}\n\nCurrent workflow has ${state.workflowJSON.nodes.length} nodes: ${state.workflowJSON.nodes.map((n) => n.name).join(', ') || 'none'}`,
						}),
					]
				: state.messages;

		const response = await agent.invoke({
			messages: messagesToUse,
		});

		console.log('[Builder Agent] Response', {
			hasToolCalls: response.tool_calls?.length ?? 0,
			hasContent: !!response.content,
		});

		return { messages: [response] };
	};

	/**
	 * Tool execution node - uses helper for consistent execution
	 */
	const executeTools = async (state: typeof BuilderSubgraphState.State) => {
		return await executeSubgraphTools(state, toolMap);
	};

	/**
	 * Should continue with tools or finish?
	 */
	const shouldContinue = (state: typeof BuilderSubgraphState.State) => {
		// Safety: max 15 iterations
		if (state.iterationCount >= 15) {
			console.log('[Builder Subgraph] Max iterations reached');
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

		// No tool calls = done
		return END;
	};

	// Build the subgraph
	const subgraph = new StateGraph(BuilderSubgraphState)
		.addNode('agent', callAgent)
		.addNode('tools', executeTools)
		.addNode('process_operations', processOperations)
		.addEdge('__start__', 'agent')
		// Map 'tools' to tools node, END is handled automatically
		.addConditionalEdges('agent', shouldContinue)
		.addEdge('tools', 'process_operations')
		.addEdge('process_operations', 'agent'); // Loop back to agent

	return subgraph.compile();
}
