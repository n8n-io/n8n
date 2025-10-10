import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import { StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	DiscoveryAgent,
	BuilderAgent,
	ConfiguratorAgent,
	SupervisorAgent,
	type SupervisorRouting,
} from './agents';
import { processOperations } from './utils/operations-processor';
import { executeToolsInParallel } from './utils/tool-executor';
import { WorkflowState } from './workflow-state';

export interface MultiAgentWorkflowConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llmSimpleTask: BaseChatModel;
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
}

/**
 * Create the multi-agent workflow graph
 *
 * Architecture:
 * User Input → Supervisor → Discovery/Builder/Configurator → Tools → Process Operations → Supervisor → ...
 */
export function createMultiAgentWorkflow(config: MultiAgentWorkflowConfig) {
	const { parsedNodeTypes, llmSimpleTask, llmComplexTask, logger, instanceUrl } = config;

	// Initialize specialist agents
	const discoveryAgent = new DiscoveryAgent({
		llm: llmSimpleTask,
		parsedNodeTypes,
	});

	const builderAgent = new BuilderAgent({
		llm: llmSimpleTask,
		parsedNodeTypes,
		logger,
	});

	const configuratorAgent = new ConfiguratorAgent({
		llm: llmComplexTask, // Use complex model for parameter configuration
		parsedNodeTypes,
		logger,
		instanceUrl,
	});

	const supervisorAgent = new SupervisorAgent({
		llm: llmSimpleTask,
	});

	// Collect all tools from all agents for execution
	const allTools = [
		...discoveryAgent.getTools(),
		...builderAgent.getTools(),
		...configuratorAgent.getTools(),
	];
	const toolMap = new Map(allTools.map((bt) => [bt.tool.name, bt.tool]));

	/**
	 * Supervisor Node
	 * Decides which specialist agent should work next
	 */
	const callSupervisor = async (state: typeof WorkflowState.State) => {
		const supervisor = supervisorAgent.getAgent();

		// Invoke supervisor with current state
		const routing = (await supervisor.invoke({
			messages: state.messages,
		})) as SupervisorRouting;

		logger?.debug('Supervisor routing decision', routing);

		// Create a message with the routing decision
		// Note: We don't include routing details in message content to avoid template variable conflicts
		const routingMessage = new AIMessage({
			content: `Supervisor: Routing to ${routing.next} agent`,
			additional_kwargs: {
				routing,
			},
		});

		return {
			messages: [routingMessage],
			// Store routing in state for conditional edges
			next: routing.next,
		};
	};

	/**
	 * Discovery Agent Node
	 * Searches for and analyzes nodes
	 */
	const callDiscovery = async (state: typeof WorkflowState.State) => {
		const agent = discoveryAgent.getAgent();
		const response = await agent.invoke({
			messages: state.messages,
		});

		return { messages: [response] };
	};

	/**
	 * Builder Agent Node
	 * Creates nodes and connections
	 */
	const callBuilder = async (state: typeof WorkflowState.State) => {
		const agent = builderAgent.getAgent();
		const response = await agent.invoke({
			messages: state.messages,
		});

		return { messages: [response] };
	};

	/**
	 * Configurator Agent Node
	 * Sets node parameters
	 */
	const callConfigurator = async (state: typeof WorkflowState.State) => {
		const agent = configuratorAgent.getAgent();
		const response = await agent.invoke({
			messages: state.messages,
			instanceUrl: instanceUrl ?? '',
		});

		return { messages: [response] };
	};

	/**
	 * Tool Execution Node
	 * Executes tools called by any agent
	 */
	const executeTools = async (state: typeof WorkflowState.State) => {
		return await executeToolsInParallel({ state, toolMap });
	};

	/**
	 * Conditional edge: should agent continue with tools or go back to supervisor?
	 */
	const shouldExecuteTools = (state: typeof WorkflowState.State) => {
		const lastMessage = state.messages[state.messages.length - 1];
		if (
			lastMessage &&
			'tool_calls' in lastMessage &&
			Array.isArray(lastMessage.tool_calls) &&
			lastMessage.tool_calls.length > 0
		) {
			return 'tools';
		}
		return 'supervisor';
	};

	/**
	 * Conditional edge: route from supervisor to specialist agent or finish
	 */
	const routeFromSupervisor = (state: typeof WorkflowState.State) => {
		// Get routing decision from state
		const next = state.next as string | undefined;

		if (next === 'FINISH') {
			return END;
		}

		// Route to appropriate agent
		return next || 'discovery'; // Default to discovery if unclear
	};

	// Build the graph
	const workflow = new StateGraph(WorkflowState)
		// Add all nodes
		.addNode('supervisor', callSupervisor)
		.addNode('discovery', callDiscovery)
		.addNode('builder', callBuilder)
		.addNode('configurator', callConfigurator)
		.addNode('tools', executeTools)
		.addNode('process_operations', processOperations)

		// Flow: Start → Supervisor
		.addEdge('__start__', 'supervisor')

		// Flow: Supervisor → Discovery/Builder/Configurator/END
		.addConditionalEdges('supervisor', routeFromSupervisor, {
			discovery: 'discovery',
			builder: 'builder',
			configurator: 'configurator',
			END,
		})

		// Flow: Each agent → Tools (if needed) or Supervisor
		.addConditionalEdges('discovery', shouldExecuteTools)
		.addConditionalEdges('builder', shouldExecuteTools)
		.addConditionalEdges('configurator', shouldExecuteTools)

		// Flow: Tools → Process Operations → Supervisor
		.addEdge('tools', 'process_operations')
		.addEdge('process_operations', 'supervisor');

	return workflow;
}
