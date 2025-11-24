import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import type { ChatPayload } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import type { DiscoveryContext } from '../types/discovery-types';
import { createAddNodeTool } from '../tools/add-node.tool';
import { createConnectNodesTool } from '../tools/connect-nodes.tool';
import { createRemoveConnectionTool } from '../tools/remove-connection.tool';
import { createRemoveNodeTool } from '../tools/remove-node.tool';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { processOperations } from '../utils/operations-processor';
import { executeSubgraphTools } from '../utils/subgraph-helpers';

/**
 * Builder Agent Prompt
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

<workflow_configuration_node>
CRITICAL: Always include a Workflow Configuration node at the start of every workflow.

The Workflow Configuration node (n8n-nodes-base.set) is a mandatory node that should be placed immediately after the trigger node and before all other processing nodes.
This node centralizes workflow-wide settings and parameters.

Placement rules:
- ALWAYS add between trigger and first processing node
- Connect: Trigger → Workflow Configuration → First processing node
- Name it "Workflow Configuration"
</workflow_configuration_node>

<data_parsing_strategy>
For AI-generated structured data, prefer Structured Output Parser nodes over Code nodes.
Why: Purpose-built parsers are more reliable and handle edge cases better than custom code.

For binary file data, use Extract From File node to extract content from files before processing.

Use Code nodes only for custom business logic beyond parsing.
</data_parsing_strategy>

<proactive_design>
Anticipate workflow needs and suggest enhancements:
- IF nodes for conditional logic when multiple outcomes exist
- Set nodes for data transformation between incompatible formats
- Schedule Triggers for recurring tasks
- Error handling for external service calls

NEVER use Split In Batches nodes.
</proactive_design>

<node_defaults_warning>
⚠️ CRITICAL: NEVER RELY ON DEFAULT PARAMETER VALUES FOR CONNECTIONS ⚠️

Default values often hide connection inputs/outputs. You MUST explicitly configure parameters that affect connections:
- Vector Store: Mode parameter affects available connections - always set explicitly (e.g., mode: "insert", "retrieve", "retrieve-as-tool")
- AI Agent: hasOutputParser default may not match your workflow needs
- Document Loader: textSplittingMode affects whether it accepts a text splitter input

ALWAYS check node details and set connectionParameters explicitly.
</node_defaults_warning>

CONNECTION PARAMETERS EXAMPLES:
- Static nodes (HTTP Request, Set, Code): reasoning="Static inputs/outputs", parameters={{}}
- AI Agent with parser: reasoning="hasOutputParser creates additional input", parameters={{ hasOutputParser: true }}
- Vector Store insert: reasoning="Insert mode requires document input", parameters={{ mode: "insert" }}
- Document Loader custom: reasoning="Custom mode enables text splitter input", parameters={{ textSplittingMode: "custom" }}

<node_connections_understanding>
n8n connections flow from SOURCE (output) to TARGET (input).

<main_connections>
Regular data flow: Source node output → Target node input
Example: HTTP Request → Set (HTTP Request is source, Set is target)
</main_connections>

<ai_connections>
AI sub-nodes PROVIDE capabilities, making them the SOURCE:
- OpenAI Chat Model → AI Agent [ai_languageModel]
- Calculator Tool → AI Agent [ai_tool]
- Window Buffer Memory → AI Agent [ai_memory]
- Token Splitter → Default Data Loader [ai_textSplitter]
- Default Data Loader → Vector Store [ai_document]
- Embeddings OpenAI → Vector Store [ai_embedding]

Why: Sub-nodes enhance main nodes with their capabilities
</ai_connections>
</node_connections_understanding>

<agent_node_distinction>
CRITICAL: Distinguish between two different agent node types:

1. **AI Agent** (@n8n/n8n-nodes-langchain.agent)
   - Main workflow node that orchestrates AI tasks
   - Accepts inputs: trigger data, memory, tools, language models
   - Use for: Primary AI logic, chatbots, autonomous workflows

2. **AI Agent Tool** (@n8n/n8n-nodes-langchain.agentTool)
   - Sub-node that acts as a tool for another AI Agent
   - Provides agent-as-a-tool capability to parent agents
   - Use for: Multi-agent systems where one agent calls another

Default assumption: When discovery results include "agent", use AI Agent
unless explicitly specified as "agent tool" or "sub-agent".
</agent_node_distinction>

<rag_workflow_pattern>
CRITICAL: For RAG (Retrieval-Augmented Generation) workflows, follow this pattern:

Main data flow:
- Data source (e.g., HTTP Request) → Vector Store [main connection]
- The Vector Store receives actual data through its main input

AI capability connections:
- Document Loader → Vector Store [ai_document] - provides document processing
- Embeddings → Vector Store [ai_embedding] - provides embedding generation
- Text Splitter → Document Loader [ai_textSplitter] - provides text chunking

Common mistake to avoid:
- NEVER connect Document Loader to main data outputs
- Document Loader is NOT a data processor in the main flow
- Document Loader is an AI sub-node that gives Vector Store the ability to process documents

Example RAG workflow structure:
1. Schedule Trigger → HTTP Request (download PDF)
2. HTTP Request → Vector Store (main data flow)
3. Token Splitter → Document Loader [ai_textSplitter]
4. Document Loader → Vector Store [ai_document]
5. OpenAI Embeddings → Vector Store [ai_embedding]

Why: Vector Store needs three things: data (main input), document processing
capability (Document Loader), and embedding capability (Embeddings)
</rag_workflow_pattern>

<connection_type_examples>
**Main Connections** (regular data flow):
- Trigger → HTTP Request → Set → Email
- Schedule → API Call → Transform → Database

**AI Language Model Connections** (ai_languageModel):
- OpenAI Chat Model → AI Agent
- Anthropic → AI Agent

**AI Tool Connections** (ai_tool):
- Calculator Tool → AI Agent
- Gmail Tool → AI Agent
- AI Agent Tool → AI Agent (for multi-agent systems)

**AI Document Connections** (ai_document):
- Document Loader → Vector Store
- Document Loader → Summarization Chain

**AI Embedding Connections** (ai_embedding):
- OpenAI Embeddings → Vector Store
- Embeddings Model → Vector Store

**AI Text Splitter Connections** (ai_textSplitter):
- Token Text Splitter → Document Loader
- Recursive Character Text Splitter → Document Loader

**AI Memory Connections** (ai_memory):
- Window Buffer Memory → AI Agent
- Buffer Memory → AI Agent
</connection_type_examples>

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
			// On first call, create initial message with full context
			if (state.messages.length === 0) {
				const contextParts: string[] = [];

				// 1. User request (primary)
				contextParts.push('=== USER REQUEST ===');
				contextParts.push(state.userRequest);
				contextParts.push('');

				// 2. Discovery context (what to use)
				if (state.discoveryContext) {
					contextParts.push('=== DISCOVERY CONTEXT ===');

					if (state.discoveryContext.categorization) {
						const { techniques, confidence } = state.discoveryContext.categorization;
						contextParts.push(
							`Workflow Type: ${techniques.join(', ')} (Confidence: ${confidence})`,
						);
						contextParts.push('');
					}

					if (state.discoveryContext.nodesFound.length > 0) {
						contextParts.push('Discovered Nodes:');
						state.discoveryContext.nodesFound.forEach(
							({ nodeName, version, reasoning, connectionChangingParameters }) => {
								const params =
									connectionChangingParameters.length > 0
										? ` [Connection params: ${connectionChangingParameters.map((p) => p.name).join(', ')}]`
										: '';
								contextParts.push(`- ${nodeName} v${version}: ${reasoning}${params}`);
							},
						);
						contextParts.push('');
					}

					if (state.discoveryContext.bestPractices) {
						contextParts.push('Best Practices:');
						contextParts.push(state.discoveryContext.bestPractices);
						contextParts.push('');
					}
				}

				// 3. Current workflow state
				contextParts.push('=== CURRENT WORKFLOW ===');
				contextParts.push(`Existing nodes: ${state.workflowJSON.nodes.length}`);
				if (state.workflowJSON.nodes.length > 0) {
					contextParts.push(`Nodes: ${state.workflowJSON.nodes.map((n) => n.name).join(', ')}`);
				}

				const contextMessage = new HumanMessage({ content: contextParts.join('\n') });
				const response = await agent.invoke({
					messages: [contextMessage],
				});

				return { messages: [contextMessage, response] };
			}

			// Subsequent calls - just invoke with existing messages
			const response = await agent.invoke({
				messages: state.messages,
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

	transformInput(parentState: typeof ParentGraphState.State) {
		const userMessage = parentState.messages.find((m) => m instanceof HumanMessage);
		const userRequest = typeof userMessage?.content === 'string' ? userMessage.content : '';

		return {
			userRequest,
			workflowJSON: parentState.workflowJSON,
			workflowContext: parentState.workflowContext,
			discoveryContext: parentState.discoveryContext,
			messages: [],
		};
	}

	transformOutput(
		subgraphOutput: typeof BuilderSubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
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

		const summary =
			typeof builderSummary?.content === 'string'
				? builderSummary.content
				: `Created ${subgraphOutput.workflowJSON.nodes.length} nodes: ${subgraphOutput.workflowJSON.nodes.map((n) => n.name).join(', ')}`;

		return {
			workflowJSON: subgraphOutput.workflowJSON,
			workflowOperations: subgraphOutput.workflowOperations ?? [],
			messages: [
				new HumanMessage({
					content: `Builder completed: ${summary}`,
				}),
			],
		};
	}
}

export function createBuilderSubgraph(config: BuilderSubgraphConfig) {
	return new BuilderSubgraph().create(config);
}
