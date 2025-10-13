import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ResponderAgent } from './agents/responder.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import {
	createDiscoverySubgraph,
	createBuilderSubgraph,
	createConfiguratorSubgraph,
} from './subgraphs';
import type { SimpleWorkflow } from './types/workflow';
import type { ChatPayload } from './workflow-builder-agent';

/**
 * Parent Graph State
 *
 * Minimal state that coordinates between subgraphs.
 * Each subgraph has its own isolated state.
 */
export const ParentGraphState = Annotation.Root({
	// Shared: User's conversation history (for responder)
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Shared: Current workflow being built
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),

	// Input: Workflow context (execution data)
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Routing: Next phase to execute
	nextPhase: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Output: Final response to user
	finalResponse: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Discovery results to pass to builder (structured)
	discoveryResults: Annotation<{
		nodesFound: Array<{ nodeType: INodeTypeDescription; reasoning: string }>;
		relevantContext: Array<{ context: string; relevancy?: string }>;
		summary: string;
	} | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),
});

export interface MultiAgentSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llmSimpleTask: BaseChatModel;
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
}

/**
 * Create Multi-Agent Workflow using Subgraph Pattern
 *
 * Each specialist agent runs in its own isolated subgraph.
 * Parent graph orchestrates between subgraphs with minimal shared state.
 */
export function createMultiAgentWorkflowWithSubgraphs(config: MultiAgentSubgraphConfig) {
	const { parsedNodeTypes, llmSimpleTask, llmComplexTask, logger, instanceUrl } = config;

	// Initialize agents
	const responderAgent = new ResponderAgent({ llm: llmSimpleTask });
	const supervisorAgent = new SupervisorAgent({ llm: llmSimpleTask });

	// Initialize subgraphs
	const discoverySubgraph = createDiscoverySubgraph({
		parsedNodeTypes,
		llm: llmComplexTask,
	});

	const builderSubgraph = createBuilderSubgraph({
		parsedNodeTypes,
		llm: llmComplexTask,
		logger,
	});

	const configuratorSubgraph = createConfiguratorSubgraph({
		parsedNodeTypes,
		llm: llmComplexTask,
		logger,
		instanceUrl,
	});

	/**
	 * Supervisor Node - Decides next phase
	 */
	const callSupervisor = async (state: typeof ParentGraphState.State) => {
		console.log('[Supervisor] Routing', {
			messageCount: state.messages.length,
			nodeCount: state.workflowJSON.nodes.length,
		});

		const supervisor = supervisorAgent.getAgent();
		const routing = await supervisor.invoke({
			messages: state.messages,
		});

		console.log('[Supervisor] Decision', routing);

		return {
			nextPhase: routing.next,
		};
	};

	/**
	 * Responder Node - Handles conversations (uses parent messages)
	 */
	const callResponder = async (state: typeof ParentGraphState.State) => {
		console.log('[Responder] Called');

		const agent = responderAgent.getAgent();
		const response = await agent.invoke({
			messages: state.messages,
		});

		return {
			messages: [response],
			finalResponse:
				typeof response.content === 'string' ? response.content : '[Response received]',
		};
	};

	/**
	 * Discovery Subgraph Node - Invokes discovery subgraph
	 */
	const callDiscoverySubgraph = async (state: typeof ParentGraphState.State) => {
		console.log('[Discovery Subgraph] Starting');

		const userMessage = state.messages.find((m) => m instanceof HumanMessage);
		const userRequest = userMessage?.content?.toString() || 'Build a workflow';

		const result = await discoverySubgraph.invoke({
			userRequest,
			supervisorInstructions: null, // TODO: Get from supervisor routing
		});

		console.log('[Discovery Subgraph] Completed', {
			nodesFoundCount: result.nodesFound?.length ?? 0,
			contextCount: result.relevantContext?.length ?? 0,
			summary: result.summary || '[No summary]',
		});

		// Extract structured discovery results
		const discoveryResults = {
			nodesFound: result.nodesFound || [],
			relevantContext: result.relevantContext || [],
			summary: result.summary || '',
		};

		return {
			discoveryResults,
			messages: [
				new HumanMessage({
					content: `Discovery: ${discoveryResults.summary}`,
				}),
			],
		};
	};

	/**
	 * Builder Subgraph Node - Invokes builder subgraph
	 */
	const callBuilderSubgraph = async (state: typeof ParentGraphState.State) => {
		console.log('[Builder Subgraph] Starting', {
			nodeCount: state.workflowJSON.nodes.length,
		});

		const userMessage = state.messages.find((m) => m instanceof HumanMessage);
		const userRequest = userMessage?.content?.toString() || '';

		// Build context from discovery results
		let builderRequest = userRequest;
		if (state.discoveryResults) {
			const { nodesFound, relevantContext, summary } = state.discoveryResults;

			const contextParts: string[] = [userRequest, '\n\n--- Discovery Results ---'];

			if (summary) {
				contextParts.push(`Summary: ${summary}`);
			}

			if (nodesFound.length > 0) {
				contextParts.push('\nNodes to use:');
				nodesFound.forEach(({ nodeType, reasoning }) => {
					contextParts.push(`- ${nodeType.displayName} (${nodeType.name}): ${reasoning}`);
				});
			}

			const builderContext = relevantContext.filter(
				(c) => !c.relevancy || c.relevancy === 'builder',
			);
			if (builderContext.length > 0) {
				contextParts.push('\nAdditional context:');
				builderContext.forEach(({ context }) => contextParts.push(`- ${context}`));
			}

			builderRequest = contextParts.join('\n');
		}

		console.log('[Builder] Input', {
			hasDiscoveryResults: !!state.discoveryResults,
			nodesFoundCount: state.discoveryResults?.nodesFound.length ?? 0,
			requestPreview: builderRequest.substring(0, 200),
		});

		const result = await builderSubgraph.invoke({
			userRequest: builderRequest,
			workflowJSON: state.workflowJSON,
		});

		// Extract builder's actual summary (last message without tool calls)
		const builderSummary = result.messages
			.slice()
			.reverse()
			.find(
				(m) =>
					m.content &&
					(!('tool_calls' in m) ||
						!m.tool_calls ||
						(m.tool_calls && Array.isArray(m.tool_calls) && m.tool_calls.length === 0)),
			);

		const summary =
			typeof builderSummary?.content === 'string'
				? builderSummary.content
				: `Created ${result.workflowJSON.nodes.length} nodes: ${result.workflowJSON.nodes.map((n) => n.name).join(', ')}`;

		console.log('[Builder Subgraph] Completed', {
			inputNodeCount: state.workflowJSON.nodes.length,
			outputNodeCount: result.workflowJSON.nodes.length,
			nodeNames: result.workflowJSON.nodes.map((n) => n.name),
			summary: summary.substring(0, 150),
		});

		// Update parent workflow with subgraph result
		return {
			workflowJSON: result.workflowJSON,
			messages: [
				new HumanMessage({
					content: `Builder completed: ${summary}`,
				}),
			],
		};
	};

	/**
	 * Configurator Subgraph Node - Invokes configurator subgraph
	 */
	const callConfiguratorSubgraph = async (state: typeof ParentGraphState.State) => {
		console.log('[Configurator Subgraph] Starting', {
			nodeCount: state.workflowJSON.nodes.length,
		});

		const result = await configuratorSubgraph.invoke({
			workflowJSON: state.workflowJSON,
			workflowContext: state.workflowContext,
			instanceUrl: instanceUrl ?? '',
		});

		console.log('[Configurator Subgraph] Completed');

		// Extract final response
		const lastMessage = result.messages[result.messages.length - 1];
		const finalResponse =
			typeof lastMessage?.content === 'string' ? lastMessage.content : 'Configuration complete';

		return {
			workflowJSON: result.workflowJSON,
			finalResponse,
			messages: [new HumanMessage({ content: finalResponse })],
		};
	};

	/**
	 * Route based on supervisor's decision
	 */
	const routeFromSupervisor = (state: typeof ParentGraphState.State) => {
		const next = state.nextPhase;

		console.log('[Router] Routing to', next);

		if (next === 'responder') return 'responder';
		if (next === 'discovery') return 'discovery_subgraph';
		if (next === 'builder') return 'builder_subgraph';
		if (next === 'configurator') return 'configurator_subgraph';
		if (next === 'FINISH') return END;

		// Default
		return 'discovery_subgraph';
	};

	// Build parent graph
	const workflow = new StateGraph(ParentGraphState)
		.addNode('supervisor', callSupervisor)
		.addNode('responder', callResponder)
		.addNode('discovery_subgraph', callDiscoverySubgraph)
		.addNode('builder_subgraph', callBuilderSubgraph)
		.addNode('configurator_subgraph', callConfiguratorSubgraph)
		// Start with supervisor
		.addEdge('__start__', 'supervisor')
		// Supervisor routes to subgraphs or responder
		.addConditionalEdges('supervisor', routeFromSupervisor)
		// All paths end after execution
		.addEdge('responder', END)
		.addEdge('discovery_subgraph', 'supervisor')
		.addEdge('builder_subgraph', 'supervisor')
		.addEdge('configurator_subgraph', END); // Configurator is final

	return workflow;
}
