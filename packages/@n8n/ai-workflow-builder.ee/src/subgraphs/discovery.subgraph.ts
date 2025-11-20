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
import { WorkflowTechnique, type PromptCategorization } from '../types/categorization';
import { executeSubgraphTools } from '../utils/subgraph-helpers';

/**
 * Strict Output Schema for Discovery
 */
const discoveryOutputSchema = z.object({
	categorization: z
		.object({
			techniques: z.array(z.nativeEnum(WorkflowTechnique)),
			confidence: z.number(),
		})
		.describe('The categorization of the workflow based on the user request'),
	nodesFound: z
		.array(
			z.object({
				nodeName: z.string().describe('The internal name of the node (e.g., n8n-nodes-base.gmail)'),
				reasoning: z.string(),
			}),
		)
		.describe('List of n8n nodes identified as necessary for the workflow'),
	bestPractices: z
		.string()
		.describe('Best practices relevant to the identified workflow techniques'),
	requirements: z.array(z.string()).describe('List of functional requirements identified'),
	constraints: z.array(z.string()).describe('List of constraints identified'),
	dataNeeds: z.array(z.string()).describe('List of data requirements identified'),
	summary: z.string().describe('A comprehensive summary of the discovery findings'),
});

/**
 * Discovery Agent Prompt
 */
const DISCOVERY_PROMPT = `You are a Discovery Agent for n8n AI Workflow Builder.

YOUR ROLE: Gather ALL relevant context needed to successfully build and configure the workflow.

AVAILABLE TOOLS:
- categorize_prompt: Analyze the user request to identify techniques and use cases. ALWAYS CALL THIS FIRST.
- get_best_practices: Retrieve best practices for identified techniques. CALL THIS SECOND.
- search_nodes: Find n8n integration nodes by keyword (e.g., "Gmail", "OpenAI", "HTTP")
- get_node_details: Get complete information about a specific node type
- submit_discovery_results: Submit the FINAL results.

PROCESS:
1. **Categorize**: Call \`categorize_prompt\` to understand the request.
2. **Best Practices**: Call \`get_best_practices\` with the techniques from step 1.
3. **Identify Components**: Identify workflow components from user request and best practices.
4. **Search**: Search for each component type using \`search_nodes\`.
5. **Details**: Get details for ALL promising matches using \`get_node_details\`.
6. **Refine**: Consider alternatives (e.g., both "Gmail" and "HTTP Request" for email sending).
7. **Submit**: Call \`submit_discovery_results\` with ALL gathered information, including the outputs from previous tools.

CRITICAL RULES:
- NEVER ask clarifying questions - work with the information provided.
- ALWAYS categorize the prompt first.
- ALWAYS get best practices.
- Search comprehensively - find ALL relevant nodes.
- Call \`get_node_details\` for EVERY node you find.
- Execute tools in PARALLEL where possible.
- PASS THE EXACT OUTPUTS from \`categorize_prompt\` and \`get_best_practices\` to the \`submit_discovery_results\` tool.

DO NOT:
- Output text commentary between tool calls.
- Stop without calling \`submit_discovery_results\`.
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

	// Output: Found nodes with reasoning
	nodesFound: Annotation<Array<{ nodeType: INodeTypeDescription; reasoning: string }>>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Requirements identified
	requirements: Annotation<string[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Constraints identified
	constraints: Annotation<string[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Data needs identified
	dataNeeds: Annotation<string[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Human-readable summary
	summary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
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
				summary: 'Failed to extract discovery results.',
			};
		}

		// Hydrate node types
		const nodesFound = output.nodesFound.map((n) => {
			// Try to find the node in fetched nodes first, then in all parsed nodes
			let nodeType =
				state.fetchedNodeTypes.get(n.nodeName) ??
				this.config.parsedNodeTypes.find((pt) => pt.name === n.nodeName);

			if (!nodeType) {
				console.warn(`[Discovery] Node type not found for ${n.nodeName}, using placeholder`);
				// Create a placeholder if not found (shouldn't happen if agent used search)
				nodeType = {
					name: n.nodeName,
					displayName: n.nodeName,
					description: 'Unknown node type',
					// Add other required fields with dummy values if needed by INodeTypeDescription
				} as INodeTypeDescription;
			}

			return {
				nodeType,
				reasoning: n.reasoning,
			};
		});

		return {
			nodesFound,
			requirements: output.requirements,
			constraints: output.constraints,
			dataNeeds: output.dataNeeds,
			summary: output.summary,
			categorization: output.categorization,
			bestPractices: output.bestPractices,
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
		const discoveryContext = {
			nodesFound: subgraphOutput.nodesFound || [],
			requirements: subgraphOutput.requirements || [],
			constraints: subgraphOutput.constraints || [],
			dataNeeds: subgraphOutput.dataNeeds || [],
			summary: subgraphOutput.summary || '',
			categorization: subgraphOutput.categorization,
			bestPractices: subgraphOutput.bestPractices,
		};

		// Create a minimal summary for the supervisor
		const supervisorSummary = `Discovery completed. Found ${subgraphOutput.nodesFound.length} nodes. Ready for builder.`;
		const summaryMessage = new HumanMessage({
			content: supervisorSummary,
			name: 'discovery_subgraph',
		});

		return {
			discoveryContext,
			// We don't want to flood the supervisor with the full conversation
			// Just return a summary message or nothing if the state update is enough
			// But the supervisor needs a message to know what happened
			messages: [summaryMessage],
		};
	}
}

// Export factory for backward compatibility if needed, or just use the class
export function createDiscoverySubgraph(config: DiscoverySubgraphConfig) {
	return new DiscoverySubgraph().create(config);
}
