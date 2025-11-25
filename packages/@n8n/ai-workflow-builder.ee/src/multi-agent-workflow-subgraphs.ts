import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, END, START, type MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ResponderAgent } from './agents/responder.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import { ParentGraphState } from './parent-graph-state';
import { BuilderSubgraph } from './subgraphs/builder.subgraph';
import { ConfiguratorSubgraph } from './subgraphs/configurator.subgraph';
import { DiscoverySubgraph } from './subgraphs/discovery.subgraph';
import type { BaseSubgraph } from './subgraphs/subgraph-interface';
import { buildWorkflowSummary } from './utils/context-builders';
import {
	getNextPhaseFromLog,
	getConfiguratorOutput,
	getBuilderOutput,
	summarizeCoordinationLog,
} from './utils/coordination-log';
import { processOperations } from './utils/operations-processor';

export interface MultiAgentSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llmSimpleTask: BaseChatModel;
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
	checkpointer?: MemorySaver;
}

/**
 * Creates a subgraph node handler with standardized error handling
 */
function createSubgraphNodeHandler<
	TSubgraph extends BaseSubgraph<unknown, Record<string, unknown>, Record<string, unknown>>,
>(subgraph: TSubgraph, compiledGraph: ReturnType<TSubgraph['create']>, name: string) {
	return async (state: typeof ParentGraphState.State) => {
		console.log(`\n>>>>>>>>>> ENTERING ${name.toUpperCase()} >>>>>>>>>>`);
		console.log(
			`[${name}] Input state: ${state.messages.length} messages, ${state.workflowJSON.nodes.length} nodes`,
		);
		console.log(`[${name}] Coordination log: ${state.coordinationLog.length} entries`);

		try {
			const input = subgraph.transformInput(state);
			console.log(`[${name}] Invoking compiled subgraph...`);
			const result = await compiledGraph.invoke(input);
			console.log(`[${name}] Subgraph completed, transforming output...`);
			const output = subgraph.transformOutput(result, state);
			const coordLogLength =
				'coordinationLog' in output && Array.isArray(output.coordinationLog)
					? output.coordinationLog.length
					: 0;
			console.log(`[${name}] Output ready: coordinationLog +${coordLogLength} entries`);
			console.log(`<<<<<<<<<< EXITING ${name.toUpperCase()} <<<<<<<<<<\n`);
			return output;
		} catch (error) {
			console.error(`[${name}] ERROR:`, error);
			const errorMessage =
				error instanceof Error ? error.message : `An error occurred in ${name}: ${String(error)}`;

			console.log(`<<<<<<<<<< EXITING ${name.toUpperCase()} (WITH ERROR) <<<<<<<<<<\n`);
			// Route to responder to report error (terminal)
			return {
				nextPhase: 'responder',
				messages: [
					new HumanMessage({
						content: `Error in ${name}: ${errorMessage}`,
						name: 'system_error',
					}),
				],
			};
		}
	};
}

/**
 * Create Multi-Agent Workflow using Subgraph Pattern
 *
 * Each specialist agent runs in its own isolated subgraph.
 * Parent graph orchestrates between subgraphs with minimal shared state.
 */
export function createMultiAgentWorkflowWithSubgraphs(config: MultiAgentSubgraphConfig) {
	const { parsedNodeTypes, llmComplexTask, logger, instanceUrl, checkpointer, llmSimpleTask } =
		config;

	const supervisorAgent = new SupervisorAgent({ llm: llmSimpleTask });
	const responderAgent = new ResponderAgent({ llm: llmSimpleTask });

	// Create subgraph instances
	const discoverySubgraph = new DiscoverySubgraph();
	const builderSubgraph = new BuilderSubgraph();
	const configuratorSubgraph = new ConfiguratorSubgraph();

	// Compile subgraphs
	const compiledDiscovery = discoverySubgraph.create({ parsedNodeTypes, llm: llmSimpleTask });
	const compiledBuilder = builderSubgraph.create({ parsedNodeTypes, llm: llmComplexTask, logger });
	const compiledConfigurator = configuratorSubgraph.create({
		parsedNodeTypes,
		llm: llmComplexTask,
		logger,
		instanceUrl,
	});

	// Build graph using method chaining for proper TypeScript inference
	return (
		new StateGraph(ParentGraphState)
			// Add Supervisor Node (only used for initial routing)
			.addNode('supervisor', async (state) => {
				console.log('\n========== SUPERVISOR (Initial Routing) ==========');
				console.log(`[Supervisor] Messages: ${state.messages.length}`);
				console.log(`[Supervisor] Workflow nodes: ${state.workflowJSON.nodes.length}`);
				console.log(`[Supervisor] Coordination log entries: ${state.coordinationLog.length}`);
				if (state.messages.length > 0) {
					const lastMsg = state.messages[state.messages.length - 1];
					const content =
						typeof lastMsg.content === 'string'
							? lastMsg.content.substring(0, 100)
							: '[complex content]';
					console.log(`[Supervisor] Last message preview: "${content}..."`);
				}

				// Supervisor only needs summary context for routing decisions
				const contextParts: string[] = [];

				// 1. Workflow summary (node count and names only)
				if (state.workflowJSON.nodes.length > 0) {
					contextParts.push('<workflow_summary>');
					contextParts.push(buildWorkflowSummary(state.workflowJSON));
					contextParts.push('</workflow_summary>');
				}

				// 2. Coordination log summary (what phases completed)
				if (state.coordinationLog.length > 0) {
					contextParts.push('<completed_phases>');
					contextParts.push(summarizeCoordinationLog(state.coordinationLog));
					contextParts.push('</completed_phases>');
				}

				const supervisor = supervisorAgent.getAgent();
				const contextMessage =
					contextParts.length > 0 ? new HumanMessage({ content: contextParts.join('\n\n') }) : null;

				const messagesToSend = contextMessage
					? [...state.messages, contextMessage]
					: state.messages;

				const routing = await supervisor.invoke({
					messages: messagesToSend,
				});

				console.log(`[Supervisor] ➜ Routing to: ${routing.next}`);
				console.log(`[Supervisor] Reasoning: ${routing.reasoning}`);
				console.log('==================================================\n');

				return {
					nextPhase: routing.next,
				};
			})
			// Add Responder Node (synthesizes final user-facing response)
			.addNode('responder', async (state) => {
				console.log('\n========== RESPONDER (Final Response) ==========');
				console.log(
					`[Responder] Coordination log: ${summarizeCoordinationLog(state.coordinationLog)}`,
				);
				console.log(`[Responder] Workflow nodes: ${state.workflowJSON.nodes.length}`);
				const agent = responderAgent.getAgent();

				// Build context for responder from coordination log
				const contextParts: string[] = [];

				if (state.discoveryContext?.nodesFound.length) {
					contextParts.push(
						`**Discovery:** Found ${state.discoveryContext.nodesFound.length} relevant nodes`,
					);
				}

				const builderOutput = getBuilderOutput(state.coordinationLog);
				if (builderOutput) {
					contextParts.push(`**Builder:** ${builderOutput}`);
				} else if (state.workflowJSON.nodes.length) {
					contextParts.push(`**Workflow:** ${state.workflowJSON.nodes.length} nodes created`);
				}

				const configuratorOutput = getConfiguratorOutput(state.coordinationLog);
				if (configuratorOutput) {
					contextParts.push(`**Configuration:**\n${configuratorOutput}`);
				}

				const contextMessage =
					contextParts.length > 0
						? new HumanMessage({
								content: `[Internal Context - Use this to craft your response]\n${contextParts.join('\n\n')}`,
							})
						: null;

				const messagesToSend = contextMessage
					? [...state.messages, contextMessage]
					: state.messages;

				console.log(`[Responder] Context parts: ${contextParts.length}`);
				if (contextParts.length > 0) {
					console.log('[Responder] Context preview:');
					contextParts.forEach((part) => console.log(`  - ${part.substring(0, 80)}...`));
				}

				const response = await agent.invoke({
					messages: messagesToSend,
				});

				const responsePreview =
					typeof response.content === 'string'
						? response.content.substring(0, 150)
						: '[complex content]';
				console.log(`[Responder] Response preview: "${responsePreview}..."`);
				console.log('================================================\n');
				return {
					messages: [response], // Only responder adds to user messages
				};
			})
			// Add process_operations node for hybrid operations approach
			.addNode('process_operations', (state) => {
				console.log('\n---------- PROCESS OPERATIONS ----------');
				console.log(`[ProcessOps] Operations to process: ${state.workflowOperations?.length ?? 0}`);
				console.log(`[ProcessOps] Current workflow nodes: ${state.workflowJSON.nodes.length}`);

				// Process accumulated operations and clear the queue
				const result = processOperations(state);

				console.log(
					`[ProcessOps] Result workflow nodes: ${result.workflowJSON?.nodes?.length ?? state.workflowJSON.nodes.length}`,
				);
				console.log('----------------------------------------\n');

				return {
					...result,
					workflowOperations: [], // Clear operations after processing
				};
			})
			// Add Subgraph Nodes (using helper to reduce duplication)
			.addNode(
				'discovery_subgraph',
				createSubgraphNodeHandler(discoverySubgraph, compiledDiscovery, 'discovery_subgraph'),
			)
			.addNode(
				'builder_subgraph',
				createSubgraphNodeHandler(builderSubgraph, compiledBuilder, 'builder_subgraph'),
			)
			.addNode(
				'configurator_subgraph',
				createSubgraphNodeHandler(
					configuratorSubgraph,
					compiledConfigurator,
					'configurator_subgraph',
				),
			)
			// Connect all subgraphs to process_operations
			.addEdge('discovery_subgraph', 'process_operations')
			.addEdge('builder_subgraph', 'process_operations')
			.addEdge('configurator_subgraph', 'process_operations')
			// Start flows to supervisor (initial routing only)
			.addEdge(START, 'supervisor')
			// Conditional Edge for Supervisor (initial routing via LLM)
			.addConditionalEdges('supervisor', (state) => {
				const next = state.nextPhase;

				if (next === 'responder') return 'responder';

				// Static name mapping
				if (next === 'discovery') return 'discovery_subgraph';
				if (next === 'builder') return 'builder_subgraph';
				if (next === 'configurator') return 'configurator_subgraph';

				// Default fallback to responder (terminal)
				return 'responder';
			})
			// Deterministic routing after subgraphs complete (based on coordination log)
			.addConditionalEdges('process_operations', (state) => {
				// Use deterministic routing based on coordination log
				const next = getNextPhaseFromLog(
					state.coordinationLog,
					state.workflowJSON.nodes.length > 0,
				);
				console.log('\n---------- DETERMINISTIC ROUTER ----------');
				console.log(`[Router] Log: ${summarizeCoordinationLog(state.coordinationLog)}`);
				console.log(`[Router] Workflow has nodes: ${state.workflowJSON.nodes.length > 0}`);
				console.log(`[Router] ➜ Next phase: ${next}`);
				console.log('------------------------------------------\n');

				if (next === 'responder') return 'responder';
				if (next === 'discovery') return 'discovery_subgraph';
				if (next === 'builder') return 'builder_subgraph';
				if (next === 'configurator') return 'configurator_subgraph';

				return 'responder';
			})
			// Responder ends the workflow
			.addEdge('responder', END)
			// Compile the graph
			.compile({ checkpointer })
	);
}
