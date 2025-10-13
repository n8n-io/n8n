import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	DiscoveryAgent,
	BuilderAgent,
	ConfiguratorAgent,
	ResponderAgent,
	SupervisorAgent,
	type SupervisorRouting,
} from './agents';
import { processOperations } from './utils/operations-processor';
import { executeToolsInParallel } from './utils/tool-executor';
import { prepareMessagesWithContext } from './utils/workflow-context-builder';
import {
	filterMessagesForSupervisor,
	filterMessagesForDiscovery,
	filterMessagesForBuilder,
	filterMessagesForConfigurator,
	filterMessagesForResponder,
} from './utils/message-filter';
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
	const responderAgent = new ResponderAgent({
		llm: llmSimpleTask,
	});

	const discoveryAgent = new DiscoveryAgent({
		llm: llmComplexTask,
		parsedNodeTypes,
	});

	const builderAgent = new BuilderAgent({
		llm: llmComplexTask,
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
		console.log('[Supervisor] Called', {
			messageCount: state.messages.length,
			currentAgent: state.currentAgent,
		});

		const supervisor = supervisorAgent.getAgent();

		// Filter messages to remove tool execution details
		const filteredMessages = filterMessagesForSupervisor(state.messages);

		console.log('[Supervisor] Filtered messages', {
			originalCount: state.messages.length,
			filteredCount: filteredMessages.length,
		});

		// Prepare messages with trimmed workflow context and cache control
		const messagesWithContext = prepareMessagesWithContext(filteredMessages, state);

		console.log('[Supervisor] About to invoke', {
			messageCount: messagesWithContext.length,
		});

		// Invoke supervisor with filtered context
		const routing = (await supervisor.invoke({
			messages: messagesWithContext,
		})) as SupervisorRouting;

		console.log('[Supervisor] Routing decision', routing);

		// Store routing decision in state (no message needed - supervisor is internal coordination)
		return {
			next: routing.next,
			currentAgent: '', // Reset currentAgent for next agent to pick up
		};
	};

	/**
	 * Responder Agent Node
	 * Handles conversational queries
	 */
	const callResponder = async (state: typeof WorkflowState.State) => {
		const agent = responderAgent.getAgent();

		// Filter messages for conversational context only
		const filteredMessages = filterMessagesForResponder(state.messages);

		const response = await agent.invoke({
			messages: filteredMessages,
		});

		return { messages: [response] };
	};

	/**
	 * Discovery Agent Node
	 * Searches for and analyzes nodes
	 */
	const callDiscovery = async (state: typeof WorkflowState.State) => {
		console.log('[Discovery] Called', {
			messageCount: state.messages.length,
			currentAgent: state.currentAgent,
			isReturningAfterTools: state.currentAgent === 'discovery',
		});

		const agent = discoveryAgent.getAgent();

		// Only filter if this is a NEW call from supervisor
		// If returning after tool execution, use full history to preserve tool call/result pairs
		const messagesToUse =
			state.currentAgent === 'discovery'
				? state.messages // Already executing, don't filter (preserve tool pairs)
				: filterMessagesForDiscovery(state.messages); // New call, filter to prevent contamination

		console.log('[Discovery] Message strategy', {
			originalCount: state.messages.length,
			finalCount: messagesToUse.length,
			filtered: state.currentAgent !== 'discovery',
		});

		const response = await agent.invoke({
			messages: messagesToUse,
		});

		console.log('[Discovery] Response received', {
			hasToolCalls: response.tool_calls?.length ?? 0,
			hasContent: !!response.content,
			contentPreview:
				typeof response.content === 'string' ? response.content.substring(0, 100) : '',
		});

		// Update discovery context to track iterations and prevent loops
		const currentCallCount = state.discoveryContext?.callCount ?? 0;
		const discoveryContext = {
			callCount: currentCallCount + 1, // Increment call count
			lastRun: Date.now(),
			completedSearches: state.discoveryContext?.completedSearches ?? [],
		};

		// Mark this agent as currently executing (for tool result routing)
		return {
			messages: [response],
			currentAgent: 'discovery',
			discoveryContext,
		};
	};

	/**
	 * Builder Agent Node
	 * Creates nodes and connections
	 */
	const callBuilder = async (state: typeof WorkflowState.State) => {
		const agent = builderAgent.getAgent();

		// Only filter if this is a NEW call from supervisor
		// If returning after tool execution, use full history to preserve tool call/result pairs
		const messagesToUse =
			state.currentAgent === 'builder'
				? state.messages // Already executing, don't filter
				: filterMessagesForBuilder(state.messages); // New call, filter

		// Prepare messages with workflow structure context and cache control
		const messagesWithContext = prepareMessagesWithContext(messagesToUse, state);

		const response = await agent.invoke({
			messages: messagesWithContext,
		});

		// Mark this agent as currently executing (for tool result routing)
		return { messages: [response], currentAgent: 'builder' };
	};

	/**
	 * Configurator Agent Node
	 * Sets node parameters
	 */
	const callConfigurator = async (state: typeof WorkflowState.State) => {
		console.log('[Configurator] Called', {
			messageCount: state.messages.length,
			currentAgent: state.currentAgent,
			isReturning: state.currentAgent === 'configurator',
			nodeCount: state.workflowJSON.nodes.length,
			nodeNames: state.workflowJSON.nodes.map((n) => n.name),
		});

		const agent = configuratorAgent.getAgent();

		// Only filter if this is a NEW call from supervisor
		// If returning after tool execution, use full history to preserve tool call/result pairs
		const messagesToUse =
			state.currentAgent === 'configurator'
				? state.messages // Already executing, don't filter
				: filterMessagesForConfigurator(state.messages); // New call, filter

		console.log('[Configurator] Message filtering', {
			originalCount: state.messages.length,
			filteredCount: messagesToUse.length,
			filtered: state.currentAgent !== 'configurator',
		});

		// Prepare messages with FULL workflow context and cache control
		const messagesWithContext = prepareMessagesWithContext(messagesToUse, state);

		const lastMsg = messagesWithContext[messagesWithContext.length - 1];
		let hasWorkflowContext = false;
		if (lastMsg?.content) {
			const content = lastMsg.content;
			if (typeof content === 'string') {
				hasWorkflowContext = content.includes('<current_workflow_json>');
			} else if (Array.isArray(content)) {
				hasWorkflowContext = content.some(
					(block) =>
						typeof block === 'object' &&
						block !== null &&
						'text' in block &&
						typeof block.text === 'string' &&
						block.text.includes('<current_workflow_json>'),
				);
			}
		}

		console.log('[Configurator] Context prepared', {
			messageCount: messagesWithContext.length,
			lastMessageHasWorkflowContext: hasWorkflowContext,
			lastMessageContentType: Array.isArray(lastMsg?.content) ? 'array' : typeof lastMsg?.content,
		});

		const response = await agent.invoke({
			messages: messagesWithContext,
			instanceUrl: instanceUrl ?? '',
		});

		console.log('[Configurator] Response received', {
			hasToolCalls: response.tool_calls?.length ?? 0,
			hasContent: !!response.content,
			contentPreview:
				typeof response.content === 'string' ? response.content.substring(0, 150) : '[array]',
		});

		// Mark this agent as currently executing (for tool result routing)
		return { messages: [response], currentAgent: 'configurator' };
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
		const hasToolCalls =
			lastMessage &&
			'tool_calls' in lastMessage &&
			Array.isArray(lastMessage.tool_calls) &&
			lastMessage.tool_calls.length > 0;

		const decision = hasToolCalls ? 'tools' : 'supervisor';

		console.log('[shouldExecuteTools] Decision', {
			currentAgent: state.currentAgent,
			decision,
			hasToolCalls,
			toolCallCount:
				lastMessage && 'tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls)
					? lastMessage.tool_calls.length
					: 0,
		});

		return decision;
	};

	/**
	 * Route after process_operations: back to the agent that called tools, or supervisor
	 */
	const routeAfterOperations = (state: typeof WorkflowState.State) => {
		// Return to the agent that called the tools so it can see results and respond
		const currentAgent = state.currentAgent;

		let destination = 'supervisor';
		if (currentAgent === 'discovery') destination = 'discovery';
		if (currentAgent === 'builder') destination = 'builder';
		if (currentAgent === 'configurator') destination = 'configurator';

		console.log('[routeAfterOperations] Routing', {
			currentAgent,
			destination,
			nodeCount: state.workflowJSON.nodes.length,
			messageCount: state.messages.length,
		});

		return destination;
	};

	/**
	 * Conditional edge: route from supervisor to specialist agent or finish
	 */
	const routeFromSupervisor = (state: typeof WorkflowState.State) => {
		// Get routing decision from state
		const next = state.next as string | undefined;

		let destination = next ?? 'discovery';
		if (next === 'FINISH') {
			destination = 'responder';
		}

		console.log('[routeFromSupervisor] Routing', {
			supervisorDecision: next,
			destination,
			currentAgent: state.currentAgent,
			nodeCount: state.workflowJSON.nodes.length,
			messageCount: state.messages.length,
		});

		return destination;
	};

	// Build the graph
	const workflow = new StateGraph(WorkflowState)
		// Add all nodes
		.addNode('supervisor', callSupervisor)
		.addNode('responder', callResponder)
		.addNode('discovery', callDiscovery)
		.addNode('builder', callBuilder)
		.addNode('configurator', callConfigurator)
		.addNode('tools', executeTools)
		.addNode('process_operations', processOperations)

		// Flow: Start → Supervisor
		.addEdge('__start__', 'supervisor')

		// Flow: Supervisor → Responder/Discovery/Builder/Configurator/END
		// Note: When routeFromSupervisor returns END, LangGraph handles it automatically
		.addConditionalEdges('supervisor', routeFromSupervisor, {
			responder: 'responder',
			discovery: 'discovery',
			builder: 'builder',
			configurator: 'configurator',
		})

		// Flow: Responder always ends (conversational queries complete immediately)
		.addEdge('responder', END)

		// Flow: Each workflow agent → Tools (if needed) or Supervisor
		.addConditionalEdges('discovery', shouldExecuteTools)
		.addConditionalEdges('builder', shouldExecuteTools)
		.addConditionalEdges('configurator', shouldExecuteTools)

		// Flow: Tools → Process Operations → Back to agent (to see results) or Supervisor
		.addEdge('tools', 'process_operations')
		.addConditionalEdges('process_operations', routeAfterOperations, {
			discovery: 'discovery',
			builder: 'builder',
			configurator: 'configurator',
			supervisor: 'supervisor',
		});

	return workflow;
}
