import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import { trimWorkflowJSON } from '@/utils/trim-workflow-context';
import type { ChatPayload } from '@/workflow-builder-agent';

import { createAddNodeTool } from '../tools/add-node.tool';
import { createConnectNodesTool } from '../tools/connect-nodes.tool';
import { createRemoveConnectionTool } from '../tools/remove-connection.tool';
import { createRemoveNodeTool } from '../tools/remove-node.tool';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { processOperations } from '../utils/operations-processor';
import { executeSubgraphTools } from '../utils/subgraph-helpers';

/**
 * Builder Agent Prompt
 *
 * Focused on constructing workflow structure: creating nodes and connections.
 */
const BUILDER_PROMPT = `You are a Builder Agent specialized in constructing n8n workflows.

Your job is to:
1. Create nodes based on discovery results
2. Establish connections between nodes
3. Set connection parameters when needed
4. Handle node removal and connection cleanup

PARALLEL EXECUTION:
- Create multiple nodes by calling add_nodes multiple times in PARALLEL
- Connect multiple node pairs in PARALLEL
- All tools support parallel execution
- Execute tools SILENTLY - no commentary before or between tool calls

NODE CREATION:
Each add_nodes call creates ONE node. You must provide:
- nodeType: The exact type from discovery (e.g., "n8n-nodes-base.httpRequest")
- name: Descriptive name (e.g., "Fetch Weather Data")
- connectionParametersReasoning: Explain your thinking about connection parameters
- connectionParameters: Parameters that affect connections (or {{}} if none needed)

CONNECTION PARAMETERS EXAMPLES:
- Static nodes (HTTP Request, Set, Code): reasoning="Static inputs/outputs", parameters={{}}
- AI Agent with parser: reasoning="hasOutputParser creates additional input", parameters={{ hasOutputParser: true }}
- Vector Store insert: reasoning="Insert mode requires document input", parameters={{ mode: "insert" }}
- Document Loader custom: reasoning="Custom mode enables text splitter input", parameters={{ textSplittingMode: "custom" }}

CONNECTIONS:
- Main data flow: Source output → Target input
- AI connections: Sub-nodes PROVIDE capabilities (they are the SOURCE)
  - Example: OpenAI Chat Model → AI Agent [ai_languageModel]
  - Example: Calculator Tool → AI Agent [ai_tool]
  - Example: Document Loader → Vector Store [ai_document]

RAG PATTERN (CRITICAL):
- Data flows: Data source → Vector Store (main connection)
- AI capabilities: Document Loader → Vector Store [ai_document]
- AI capabilities: Embeddings → Vector Store [ai_embedding]
- NEVER connect Document Loader to main data flow - it's an AI sub-node!

DO NOT:
- Output text before calling tools
- Add commentary between tool calls
- Configure node parameters (that's the Configurator Agent's job)
- Search for nodes (that's the Discovery Agent's job)
- Make assumptions about node types - use exactly what Discovery found

RESPONSE FORMAT:
After ALL tools have completed, provide ONE brief text message summarizing:
- What nodes were added
- How they're connected

Example: "Created 4 nodes and connected them sequentially: Trigger → Weather → Image Generation → Email"

CRITICAL: Only respond AFTER all add_nodes and connect_nodes tools have executed.`;

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

	// Input: Execution context (optional)
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Input: Optional instructions from supervisor
	supervisorInstructions: Annotation<string | null>({
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

	// Output: Summary
	summary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal: Safety counter
	iterationCount: Annotation<number>({
		reducer: (x, y) => (y ?? x) + 1,
		default: () => 0,
	}),
});

interface BuilderSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
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
	// Create tools
	const tools = [
		createAddNodeTool(config.parsedNodeTypes),
		createConnectNodesTool(config.parsedNodeTypes, config.logger),
		createRemoveNodeTool(config.logger),
		createRemoveConnectionTool(config.logger),
	];
	const toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));
	// Create agent with tools bound
	const systemPrompt = ChatPromptTemplate.fromMessages([
		[
			'system',
			[
				{
					type: 'text',
					text: BUILDER_PROMPT,
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
	 */
	const callAgent = async (state: typeof BuilderSubgraphState.State) => {
		console.log('[Builder Agent] Called in subgraph', {
			messageCount: state.messages.length,
			nodeCount: state.workflowJSON.nodes.length,
			iteration: state.iterationCount,
			hasSupervisorInstructions: !!state.supervisorInstructions,
		});

		const trimmedWorkflow = trimWorkflowJSON(state.workflowJSON);
		const executionData = state.workflowContext?.executionData ?? {};
		const executionSchema = state.workflowContext?.executionSchema ?? [];

		const workflowContext = [
			'',
			'<current_workflow_json>',
			JSON.stringify(trimmedWorkflow, null, 2),
			'</current_workflow_json>',
			'<trimmed_workflow_json_note>',
			'Note: Large property values of the nodes in the workflow JSON above may be trimmed to fit within token limits.',
			'Use get_node_parameter tool to get full details when needed.',
			'</trimmed_workflow_json_note>',
			'',
			'<current_simplified_execution_data>',
			JSON.stringify(executionData, null, 2),
			'</current_simplified_execution_data>',
			'',
			'<current_execution_nodes_schemas>',
			JSON.stringify(executionSchema, null, 2),
			'</current_execution_nodes_schemas>',
		].join('\n');

		// On first call, create initial message with context
		const messagesToUse =
			state.messages.length === 0
				? [
						new HumanMessage({
							content:
								state.supervisorInstructions ??
								`Build workflow for: ${state.userRequest}\n\nCurrent workflow has ${state.workflowJSON.nodes.length} nodes: ${state.workflowJSON.nodes.map((n) => n.name).join(', ') || 'none'}`,
						}),
					]
				: state.messages;

		messagesToUse.push(new HumanMessage({ content: workflowContext }));
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
