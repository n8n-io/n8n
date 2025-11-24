import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, AIMessage } from '@langchain/core/messages';
import { isAIMessage, HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { LLMServiceError } from '@/errors';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createCategorizePromptTool } from '../tools/categorize-prompt.tool';
import { createGetBestPracticesTool } from '../tools/get-best-practices.tool';
import { createNodeDetailsTool } from '../tools/node-details.tool';
import { createNodeSearchTool } from '../tools/node-search.tool';
import type { PromptCategorization } from '../types/categorization';
import { executeSubgraphTools } from '../utils/subgraph-helpers';

/**
 * Strict Output Schema for Discovery
 * Simplified to reduce token usage while maintaining utility for downstream subgraphs
 */
const discoveryOutputSchema = z.object({
	nodesFound: z
		.array(
			z.object({
				nodeName: z.string().describe('The internal name of the node (e.g., n8n-nodes-base.gmail)'),
				reasoning: z.string().describe('Why this node is relevant for the workflow'),
				connectionChangingParameters: z
					.array(
						z.object({
							name: z
								.string()
								.describe('Parameter name (e.g., "mode", "operation", "hasOutputParser")'),
							possibleValues: z
								.array(z.union([z.string(), z.boolean(), z.number()]))
								.describe('Possible values this parameter can take'),
						}),
					)
					.describe(
						'Parameters that affect node connections (inputs/outputs). ONLY include if parameter appears in <input> or <output> expressions',
					),
			}),
		)
		.describe('List of n8n nodes identified as necessary for the workflow'),
});

/**
 * Discovery Agent Prompt
 */
const DISCOVERY_PROMPT = `You are a Discovery Agent for n8n AI Workflow Builder.

YOUR ROLE: Identify relevant n8n nodes and their connection-changing parameters.

AVAILABLE TOOLS:
- categorize_prompt: Analyze the user request (internal context)
- get_best_practices: Retrieve best practices (internal context)
- search_nodes: Find n8n nodes by keyword
- get_node_details: Get complete node information including <connections>
- submit_discovery_results: Submit final results

PROCESS:
1. **Call categorize_prompt** (internal context)
2. **Call get_best_practices** with techniques from step 1 (internal context)
3. **Identify workflow components** from user request and best practices
4. **Call search_nodes IN PARALLEL** for all components (e.g., "Gmail", "OpenAI", "Schedule")
5. **Call get_node_details IN PARALLEL** for ALL promising nodes (batch multiple calls)
6. **Analyze each node's <connections>** to identify connection-changing parameters
7. **Call submit_discovery_results** with nodesFound array

CONNECTION-CHANGING PARAMETERS - CRITICAL RULES:

A parameter is connection-changing ONLY IF it appears in <input> or <output> expressions within <node_details>.

**How to identify:**
1. Look at the <connections> section in node details
2. Check if <input> or <output> uses expressions like: ={{...parameterName...}}
3. If a parameter is referenced in these expressions, it IS connection-changing
4. If a parameter is NOT in <input>/<output> expressions, it is NOT connection-changing

**Example from AI Agent:**
\`\`\`xml
<input>={{...hasOutputParser, needsFallback...}}</input>
\`\`\`
→ hasOutputParser and needsFallback ARE connection-changing (they control which inputs appear)

**Counter-example:**
\`\`\`xml
<properties>
  <property name="promptType">...</property>  <!-- NOT in <input>/<output> -->
  <property name="systemMessage">...</property>  <!-- NOT in <input>/<output> -->
</properties>
\`\`\`
→ promptType and systemMessage are NOT connection-changing (they don't affect connections)

**Common connection-changing parameters:**
- Vector Store: mode (appears in <input>/<output> expressions)
- AI Agent: hasOutputParser, needsFallback (appears in <input> expression)
- Merge: numberInputs (appears in <input> expression)
- Webhook: responseMode (appears in <output> expression)

CRITICAL RULES:
- NEVER ask clarifying questions
- ALWAYS call categorize_prompt and get_best_practices first
- Call search_nodes and get_node_details IN PARALLEL for speed
- ONLY flag connectionChangingParameters if they appear in <input> or <output> expressions
- If no parameters appear in connection expressions, return empty array []
- Output ONLY: nodesFound with {{ nodeName, reasoning, connectionChangingParameters }}

DO NOT:
- Output text commentary between tool calls
- Include bestPractices or categorization in submit_discovery_results
- Flag parameters that don't affect connections
- Stop without calling submit_discovery_results
`;

/**
 * Discovery Subgraph State
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

	// Output: Found nodes with reasoning and connection-changing parameters
	nodesFound: Annotation<
		Array<{
			nodeName: string;
			reasoning: string;
			connectionChangingParameters: Array<{
				name: string;
				possibleValues: Array<string | boolean | number>;
			}>;
		}>
	>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Categorization result
	categorization: Annotation<PromptCategorization | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Output: Best practices documentation
	bestPractices: Annotation<string | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Internal: Track which node types we fetched details for
	fetchedNodeTypes: Annotation<Map<string, INodeTypeDescription>>({
		reducer: (x, y) => {
			const merged = new Map(x);
			for (const [key, value] of y) {
				merged.set(key, value);
			}
			return merged;
		},
		default: () => new Map(),
	}),

	// Internal: Track iterations to prevent infinite loops
	iterationCount: Annotation<number>({
		reducer: (x, y) => (y ?? x) + 1,
		default: () => 0,
	}),
});

export interface DiscoverySubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
}

export class DiscoverySubgraph extends BaseSubgraph<
	DiscoverySubgraphConfig,
	typeof DiscoverySubgraphState.State,
	typeof ParentGraphState.State
> {
	name = 'discovery_subgraph';
	description = 'Discovers nodes and context for the workflow';

	private agent!: Runnable;
	private toolMap!: Map<string, StructuredTool>;
	private config!: DiscoverySubgraphConfig;

	constructor() {
		super();
	}

	create(config: DiscoverySubgraphConfig) {
		this.config = config;

		// Create tools
		const tools = [
			createCategorizePromptTool(config.llm),
			createGetBestPracticesTool(),
			createNodeSearchTool(config.parsedNodeTypes),
			createNodeDetailsTool(config.parsedNodeTypes),
		];
		this.toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));

		// Define output tool
		const submitTool = tool(() => {}, {
			name: 'submit_discovery_results',
			description: 'Submit the final discovery results',
			schema: discoveryOutputSchema,
		});

		// Create agent with tools bound (including submit tool)
		const systemPrompt = ChatPromptTemplate.fromMessages([
			['system', DISCOVERY_PROMPT],
			['human', '{prompt}'],
			['placeholder', '{messages}'],
		]);

		if (typeof config.llm.bindTools !== 'function') {
			throw new LLMServiceError('LLM does not support tools', {
				llmModel: config.llm._llmType(),
			});
		}

		// Bind all tools including the output tool
		const allTools = [...tools.map((bt) => bt.tool), submitTool];
		this.agent = systemPrompt.pipe(config.llm.bindTools(allTools));

		// Build the subgraph
		const subgraph = new StateGraph(DiscoverySubgraphState)
			.addNode('agent', this.callAgent.bind(this))
			.addNode('tools', this.executeTools.bind(this))
			.addNode('format_output', this.formatOutput.bind(this))
			.addEdge('__start__', 'agent')
			// Conditional: tools if has tool calls, format_output if submit called
			.addConditionalEdges('agent', this.shouldContinue.bind(this), {
				tools: 'tools',
				format_output: 'format_output',
				end: END, // Fallback
			})
			.addEdge('tools', 'agent') // After tools, go back to agent
			.addEdge('format_output', END); // After formatting, END

		return subgraph.compile();
	}

	/**
	 * Agent node - calls discovery agent
	 */
	private async callAgent(state: typeof DiscoverySubgraphState.State) {
		let message = `<user_request>${state.userRequest}</user_request>`;

		if (state.supervisorInstructions) {
			message += `\n<supervisor_instructions>${state.supervisorInstructions}</supervisor_instructions`;
		}

		const response = (await this.agent.invoke({
			messages: state.messages,
			prompt: message,
		})) as AIMessage;

		return { messages: [response] };
	}

	/**
	 * Tool execution node - tracks get_node_details calls
	 */
	private async executeTools(state: typeof DiscoverySubgraphState.State) {
		const result = await executeSubgraphTools(state, this.toolMap);

		// Track which nodes we fetched details for
		const lastMessage = state.messages.at(-1);
		const fetchedNodes = new Map<string, INodeTypeDescription>();

		if (lastMessage && isAIMessage(lastMessage) && lastMessage.tool_calls) {
			for (const tc of lastMessage.tool_calls) {
				if (tc.name === 'get_node_details') {
					const nodeType = tc.args?.nodeType as string | undefined;
					if (nodeType) {
						const nodeDesc = this.config.parsedNodeTypes.find((n) => n.name === nodeType);
						if (nodeDesc) {
							fetchedNodes.set(nodeType, nodeDesc);
						}
					}
				}
			}
		}

		return {
			...result,
			fetchedNodeTypes: fetchedNodes,
		};
	}

	/**
	 * Format the output from the submit tool call
	 * No hydration - just return raw node names. Subgraphs will hydrate if needed.
	 */
	private formatOutput(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages.at(-1);
		let output: z.infer<typeof discoveryOutputSchema> | undefined;

		if (lastMessage && isAIMessage(lastMessage) && lastMessage.tool_calls) {
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				output = submitCall.args as z.infer<typeof discoveryOutputSchema>;
			}
		}

		if (!output) {
			console.error('[Discovery] No submit tool call found in last message');
			return {
				nodesFound: [],
			};
		}

		// Return raw output without hydration
		return {
			nodesFound: output.nodesFound,
		};
	}

	/**
	 * Should continue with tools or finish?
	 */
	private shouldContinue(state: typeof DiscoverySubgraphState.State) {
		// Safety: max 50 iterations
		if (state.iterationCount >= 50) {
			return 'format_output'; // Try to format whatever we have, or maybe just end
		}

		const lastMessage = state.messages[state.messages.length - 1];

		if (
			lastMessage &&
			isAIMessage(lastMessage) &&
			lastMessage.tool_calls &&
			lastMessage.tool_calls.length > 0
		) {
			// Check if the submit tool was called
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				return 'format_output';
			}
			return 'tools';
		}

		// No tool calls = agent is done (or failed to call tool)
		// In this pattern, we expect a tool call. If none, we might want to force it or just end.
		// For now, let's treat it as an end, but ideally we'd reprompt.
		console.warn('[Discovery Subgraph] Agent stopped without submitting results');
		return 'end';
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		const userMessage = parentState.messages.find((m: BaseMessage) => m instanceof HumanMessage);
		const userRequest =
			typeof userMessage?.content === 'string' ? userMessage.content : 'Build a workflow';

		return {
			userRequest,
			supervisorInstructions: parentState.supervisorInstructions,
			messages: [],
		};
	}

	transformOutput(
		subgraphOutput: typeof DiscoverySubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		// Count total connection-changing parameters across all nodes
		const totalConnectionParams = subgraphOutput.nodesFound.reduce(
			(sum, node) => sum + (node.connectionChangingParameters?.length || 0),
			0,
		);

		const discoveryContext = {
			nodesFound: subgraphOutput.nodesFound || [],
			// Keep categorization and bestPractices from tool calls for downstream use
			categorization: subgraphOutput.categorization,
			bestPractices: subgraphOutput.bestPractices,
		};

		// Create a minimal summary for the supervisor
		const supervisorSummary = `Discovery completed. Found ${subgraphOutput.nodesFound.length} nodes with ${totalConnectionParams} connection-changing parameters. Ready for builder.`;
		const summaryMessage = new HumanMessage({
			content: supervisorSummary,
			name: 'discovery_subgraph',
		});

		return {
			discoveryContext,
			messages: [summaryMessage],
		};
	}
}

// Export factory for backward compatibility if needed, or just use the class
export function createDiscoverySubgraph(config: DiscoverySubgraphConfig) {
	return new DiscoverySubgraph().create(config);
}
