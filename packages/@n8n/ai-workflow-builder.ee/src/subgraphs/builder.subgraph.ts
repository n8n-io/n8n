import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import type { ChatPayload } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createAddNodeTool } from '../tools/add-node.tool';
import { createConnectNodesTool } from '../tools/connect-nodes.tool';
import { createRemoveConnectionTool } from '../tools/remove-connection.tool';
import { createRemoveNodeTool } from '../tools/remove-node.tool';
import { createValidateStructureTool } from '../tools/validate-structure.tool';
import type { CoordinationLogEntry, BuilderMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import {
	buildDiscoveryContextBlock,
	buildWorkflowJsonBlock,
	buildExecutionSchemaBlock,
	createContextMessage,
} from '../utils/context-builders';
import { processOperations } from '../utils/operations-processor';
import {
	executeSubgraphTools,
	extractUserRequest,
	createStandardShouldContinue,
} from '../utils/subgraph-helpers';

/**
 * Builder Agent Prompt
 */
const BUILDER_PROMPT = `You are a Builder Agent specialized in constructing n8n workflows.

<execution_sequence>
Follow these steps in order:

STEP 1: CREATE NODES
- Call add_nodes for every node needed based on discovery results
- Create multiple nodes in PARALLEL for efficiency
- Start building immediately without preliminary text

STEP 2: CONNECT NODES
- Call connect_nodes for all required connections
- Connect multiple node pairs in PARALLEL

STEP 3: VALIDATE
- After all nodes and connections are created, call validate_structure
- If validation finds issues (missing trigger, invalid connections), fix them and validate again
- Validation must pass before completing

STEP 4: RESPOND TO USER
- After validation passes, provide your brief summary
</execution_sequence>

<validation_requirement>
Always call validate_structure before providing your final response. This ensures the workflow is structurally correct and helps catch issues early.
</validation_requirement>

<node_creation>
Each add_nodes call creates ONE node. Provide:
- nodeType: The exact type from discovery (e.g., "n8n-nodes-base.httpRequest")
- name: Descriptive name (e.g., "Fetch Weather Data")
- connectionParametersReasoning: Explain your thinking about connection parameters
- connectionParameters: Parameters that affect connections (or {{}} if none needed)
</node_creation>

<workflow_configuration_node>
Include a Workflow Configuration node at the start of every workflow.

The Workflow Configuration node (n8n-nodes-base.set) should be placed immediately after the trigger node and before all other processing nodes.

Placement rules:
- Add between trigger and first processing node
- Connect: Trigger → Workflow Configuration → First processing node
- Name it "Workflow Configuration"
</workflow_configuration_node>

<data_parsing_strategy>
For AI-generated structured data, prefer Structured Output Parser nodes over Code nodes.
For binary file data, use Extract From File node to extract content from files before processing.
Use Code nodes only for custom business logic beyond parsing.
</data_parsing_strategy>

<proactive_design>
Anticipate workflow needs:
- IF nodes for conditional logic when multiple outcomes exist
- Set nodes for data transformation between incompatible formats
- Schedule Triggers for recurring tasks
- Error handling for external service calls

Avoid Split In Batches nodes.
</proactive_design>

<node_defaults_warning>
Default parameter values often hide connection inputs/outputs. Explicitly configure parameters that affect connections:
- Vector Store: Mode parameter affects available connections - always set explicitly (e.g., mode: "insert", "retrieve", "retrieve-as-tool")
- AI Agent: hasOutputParser default may not match your workflow needs
- Document Loader: textSplittingMode affects whether it accepts a text splitter input

Check node details and set connectionParameters explicitly.
</node_defaults_warning>

<connection_parameters_examples>
- Static nodes (HTTP Request, Set, Code): reasoning="Static inputs/outputs", parameters={{}}
- AI Agent with parser: reasoning="hasOutputParser creates additional input", parameters={{ hasOutputParser: true }}
- Vector Store insert: reasoning="Insert mode requires document input", parameters={{ mode: "insert" }}
- Document Loader custom: reasoning="Custom mode enables text splitter input", parameters={{ textSplittingMode: "custom" }}
</connection_parameters_examples>

<node_connections_understanding>
n8n connections flow from SOURCE (output) to TARGET (input).

Regular data flow: Source node output → Target node input
Example: HTTP Request → Set (HTTP Request is source, Set is target)

AI sub-nodes PROVIDE capabilities, making them the SOURCE:
- OpenAI Chat Model → AI Agent [ai_languageModel]
- Calculator Tool → AI Agent [ai_tool]
- Window Buffer Memory → AI Agent [ai_memory]
- Token Splitter → Default Data Loader [ai_textSplitter]
- Default Data Loader → Vector Store [ai_document]
- Embeddings OpenAI → Vector Store [ai_embedding]
</node_connections_understanding>

<agent_node_distinction>
Two different agent node types:

1. AI Agent (@n8n/n8n-nodes-langchain.agent)
   - Main workflow node that orchestrates AI tasks
   - Use for: Primary AI logic, chatbots, autonomous workflows

2. AI Agent Tool (@n8n/n8n-nodes-langchain.agentTool)
   - Sub-node that acts as a tool for another AI Agent
   - Use for: Multi-agent systems where one agent calls another

Default assumption: When discovery results include "agent", use AI Agent unless explicitly specified as "agent tool" or "sub-agent".
</agent_node_distinction>

<rag_workflow_pattern>
For RAG (Retrieval-Augmented Generation) workflows:

Main data flow:
- Data source (e.g., HTTP Request) → Vector Store [main connection]

AI capability connections:
- Document Loader → Vector Store [ai_document]
- Embeddings → Vector Store [ai_embedding]
- Text Splitter → Document Loader [ai_textSplitter]

Avoid connecting Document Loader to main data outputs - it's an AI sub-node that gives Vector Store document processing capability.
</rag_workflow_pattern>

<connection_type_examples>
Main Connections (regular data flow):
- Trigger → HTTP Request → Set → Email

AI Language Model Connections (ai_languageModel):
- OpenAI Chat Model → AI Agent

AI Tool Connections (ai_tool):
- Calculator Tool → AI Agent
- AI Agent Tool → AI Agent (for multi-agent systems)

AI Document Connections (ai_document):
- Document Loader → Vector Store

AI Embedding Connections (ai_embedding):
- OpenAI Embeddings → Vector Store

AI Text Splitter Connections (ai_textSplitter):
- Token Text Splitter → Document Loader

AI Memory Connections (ai_memory):
- Window Buffer Memory → AI Agent
</connection_type_examples>

<expectations>
- Call validate_structure before responding to user
- Execute tools silently without commentary between tool calls
- Use exactly what Discovery found (node structure is Builder's job, not Discovery's)
- Focus on structure only - parameter configuration is Configurator's job
</expectations>

<response_format>
After validation passes, provide ONE brief text message summarizing:
- What nodes were added
- How they're connected

Example: "Created 4 nodes: Trigger → Weather → Image Generation → Email"
</response_format>`;

/**
 * Builder Subgraph State
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

	// Input: Execution context (optional)
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Input: Discovery context from parent
	discoveryContext: Annotation<DiscoveryContext | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
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

	// Internal: Safety counter
	iterationCount: Annotation<number>({
		reducer: (x, y) => (y ?? x) + 1,
		default: () => 0,
	}),
});

export interface BuilderSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	logger?: Logger;
}

export class BuilderSubgraph extends BaseSubgraph<
	BuilderSubgraphConfig,
	typeof BuilderSubgraphState.State,
	typeof ParentGraphState.State
> {
	name = 'builder_subgraph';
	description = 'Constructs workflow structure: creating nodes and connections';

	create(config: BuilderSubgraphConfig) {
		// Create tools
		const tools = [
			createAddNodeTool(config.parsedNodeTypes),
			createConnectNodesTool(config.parsedNodeTypes, config.logger),
			createRemoveNodeTool(config.logger),
			createRemoveConnectionTool(config.logger),
			createValidateStructureTool(config.parsedNodeTypes),
		];
		const toolMap = new Map<string, StructuredTool>(tools.map((bt) => [bt.tool.name, bt.tool]));
		// Create agent with tools bound
		const systemPrompt = ChatPromptTemplate.fromMessages([
			[
				'system',
				[
					{
						type: 'text',
						text: BUILDER_PROMPT,
						cache_control: { type: 'ephemeral' },
					},
				],
			],
			['placeholder', '{messages}'],
		]);
		if (typeof config.llm.bindTools !== 'function') {
			throw new LLMServiceError('LLM does not support tools', {
				llmModel: config.llm._llmType(),
			});
		}
		const agent = systemPrompt.pipe(config.llm.bindTools(tools.map((bt) => bt.tool)));

		/**
		 * Agent node - calls builder agent
		 * Context is already in messages from transformInput
		 */
		const callAgent = async (state: typeof BuilderSubgraphState.State) => {
			console.log(
				`[Builder] callAgent iteration=${state.iterationCount} messages=${state.messages.length}`,
			);

			// Apply cache markers to accumulated messages (for tool loop iterations)
			applySubgraphCacheMarkers(state.messages);

			// Messages already contain context from transformInput
			const response = await agent.invoke({
				messages: state.messages,
			});

			const toolCalls =
				'tool_calls' in response && Array.isArray(response.tool_calls)
					? response.tool_calls.length
					: 0;
			console.log(`[Builder] Agent response: ${toolCalls} tool calls`);
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
		const shouldContinue = createStandardShouldContinue(15);

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

	transformInput(parentState: typeof ParentGraphState.State) {
		const userRequest = extractUserRequest(parentState.messages);

		// Build context parts for Builder
		const contextParts: string[] = [];

		// 1. User request (primary)
		contextParts.push('=== USER REQUEST ===');
		contextParts.push(userRequest);

		// 2. Discovery context (what nodes to use)
		if (parentState.discoveryContext) {
			contextParts.push('=== DISCOVERY CONTEXT ===');
			contextParts.push(buildDiscoveryContextBlock(parentState.discoveryContext, true));
		}

		// 3. Current workflow JSON (to add nodes to)
		contextParts.push('=== CURRENT WORKFLOW ===');
		if (parentState.workflowJSON.nodes.length > 0) {
			contextParts.push(buildWorkflowJsonBlock(parentState.workflowJSON));
		} else {
			contextParts.push('Empty workflow - ready to build');
		}

		// 4. Execution schema (data types available, NOT full data)
		const schemaBlock = buildExecutionSchemaBlock(parentState.workflowContext);
		if (schemaBlock) {
			contextParts.push('=== AVAILABLE DATA SCHEMA ===');
			contextParts.push(schemaBlock);
		}

		// Create initial message with context
		const contextMessage = createContextMessage(contextParts);

		console.log('\n========== BUILDER SUBGRAPH ==========');
		console.log('[Builder] transformInput called');
		console.log(`[Builder] User request: "${userRequest.substring(0, 100)}..."`);
		console.log(`[Builder] Existing workflow nodes: ${parentState.workflowJSON.nodes.length}`);
		if (parentState.discoveryContext) {
			console.log(
				`[Builder] Discovery context: ${parentState.discoveryContext.nodesFound.length} nodes found`,
			);
		}

		return {
			userRequest,
			workflowJSON: parentState.workflowJSON,
			workflowContext: parentState.workflowContext,
			discoveryContext: parentState.discoveryContext,
			messages: [contextMessage], // Context already in messages
		};
	}

	transformOutput(
		subgraphOutput: typeof BuilderSubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		const nodes = subgraphOutput.workflowJSON.nodes;
		const connections = subgraphOutput.workflowJSON.connections;
		const connectionCount = Object.values(connections).flat().length;

		console.log('[Builder] transformOutput called');
		console.log(`[Builder] Nodes created: ${nodes.length}`);
		if (nodes.length > 0) {
			console.log(`[Builder] Node names: ${nodes.map((n) => n.name).join(', ')}`);
		}
		console.log(`[Builder] Connections: ${connectionCount}`);
		console.log(`[Builder] Operations queued: ${subgraphOutput.workflowOperations?.length ?? 0}`);
		console.log(`[Builder] Iterations: ${subgraphOutput.iterationCount}`);
		console.log('========================================\n');

		// Extract builder's actual summary (last message without tool calls)
		const builderSummary = subgraphOutput.messages
			.slice()
			.reverse()
			.find(
				(m) =>
					m.content &&
					(!('tool_calls' in m) ||
						!m.tool_calls ||
						(m.tool_calls && Array.isArray(m.tool_calls) && m.tool_calls.length === 0)),
			);

		const summaryText =
			typeof builderSummary?.content === 'string' ? builderSummary.content : undefined;

		// Create coordination log entry (not a message)
		const logEntry: CoordinationLogEntry = {
			phase: 'builder',
			status: 'completed',
			timestamp: Date.now(),
			summary: `Created ${nodes.length} nodes with ${connectionCount} connections`,
			output: summaryText,
			metadata: {
				phase: 'builder',
				nodesCreated: nodes.length,
				connectionsCreated: connectionCount,
				nodeNames: nodes.map((n) => n.name),
			} as BuilderMetadata,
		};

		return {
			workflowJSON: subgraphOutput.workflowJSON,
			workflowOperations: subgraphOutput.workflowOperations ?? [],
			coordinationLog: [logEntry],
			// NO messages - clean separation from user-facing conversation
		};
	}
}

export function createBuilderSubgraph(config: BuilderSubgraphConfig) {
	return new BuilderSubgraph().create(config);
}
