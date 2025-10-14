import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';

import { createNodeDetailsTool } from '../tools/node-details.tool';
import { createNodeSearchTool } from '../tools/node-search.tool';
import { executeSubgraphTools } from '../utils/subgraph-helpers';

/**
 * Discovery Agent Prompt
 *
 * Focused on finding and analyzing nodes needed for the workflow.
 * Does NOT build or configure - only discovers and recommends.
 */
const DISCOVERY_PROMPT = `You are a Discovery Agent specialized in finding context for n8n AI Workflow Builder.

Your ONLY job is to:
1. Understand what the user wants to build
2. Search for ALL relevant NODE TYPES (not actual data/URLs)
3. Get detailed information about those node types
4. Report back ALL nodes you found with their capabilities

WHAT YOU SEARCH FOR:
- n8n NODE TYPES like "RSS Read", "OpenAI", "Gmail", "Schedule Trigger"
- NOT actual RSS feed URLs, API endpoints, or data sources
- Think: "What n8n integration nodes exist?" not "What websites have RSS feeds?"

SEARCH STRATEGY:
- Search broadly first (e.g., "OpenAI" not just "ChatGPT")
- Search for ALL node types needed for the workflow
- Call get_node_details for nodes that seem relevant
- Search in PARALLEL when looking for multiple node types
- Consider alternative nodes (e.g., both "HTTP Request" and service-specific nodes)

CRITICAL RULES:
- Call search_nodes to find node types by name
- Call get_node_details to understand node inputs/outputs/parameters
- Execute tools SILENTLY - no commentary before or between tool calls
- Be efficient - you have a call limit
- Find ALL matching nodes, not just the first one

DO NOT:
- Output text before calling tools
- Add commentary between tool calls
- Try to build the workflow (that's the Builder Agent's job)
- Configure parameters (that's the Configurator Agent's job)
- Make assumptions about which nodes to use - always search first
- Stop after finding just one node - find all relevant options

RESPONSE FORMAT:
After ALL tools have completed, provide a comprehensive summary:

**Nodes Found:**
- [Node Display Name] ([Node Type]): [Key capability and why it's relevant]
- [Node Display Name] ([Node Type]): [Key capability and why it's relevant]
...

**Additional Context:**
- Any important details about node compatibility, credentials, or limitations
- Recommendations for the builder (e.g., "Connect HTTP Request output to Code node")
- Data format or API considerations

Example:
**Nodes Found:**
- Schedule Trigger (scheduleTrigger): Triggers workflow on daily schedule
- OpenWeatherMap (openWeatherMap): Fetches weather data by location
- DALL-E (openAiDallE): Generates images from text prompts
- Gmail (gmail): Sends emails with attachments

**Additional Context:**
- OpenWeatherMap requires API credentials
- DALL-E node outputs image URLs, not binary data
- Gmail can attach images via URL

CRITICAL:
- Only respond AFTER all search_nodes and get_node_details tools have executed
- Include ALL nodes you found, not just a selection
- Provide reasoning for WHY each node is relevant`;

/**
 * Discovery Subgraph State
 *
 * Isolated from parent graph - receives user request and optional supervisor instructions.
 * Internally manages its own message history and tool execution.
 * Outputs structured node findings with reasoning and relevant context.
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

	// Output: Relevant context for other agents
	relevantContext: Annotation<
		Array<{ context: string; relevancy?: 'configurator' | 'builder' | 'responder' }>
	>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Human-readable summary
	summary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
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
		reducer: (x, y) => (y !== undefined ? y : x) + 1,
		default: () => 0,
	}),
});

interface DiscoverySubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
}

/**
 * Create Discovery Subgraph
 *
 * Self-contained graph that:
 * 1. Takes user request as input
 * 2. Searches for nodes using search_nodes and get_node_details
 * 3. Loops internally until discovery is complete
 * 4. Returns summary (doesn't mutate parent state)
 */
export function createDiscoverySubgraph(config: DiscoverySubgraphConfig) {
	// Create tools
	const tools = [
		createNodeSearchTool(config.parsedNodeTypes),
		createNodeDetailsTool(config.parsedNodeTypes),
	];
	const toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));

	// Create agent with tools bound
	const systemPrompt = ChatPromptTemplate.fromMessages([
		['system', DISCOVERY_PROMPT],
		['placeholder', '{messages}'],
	]);

	if (typeof config.llm.bindTools !== 'function') {
		throw new LLMServiceError('LLM does not support tools', {
			llmModel: config.llm._llmType(),
		});
	}
	const agent = systemPrompt.pipe(config.llm.bindTools(tools.map((bt) => bt.tool)));

	/**
	 * Agent node - calls discovery agent
	 */
	const callAgent = async (state: typeof DiscoverySubgraphState.State) => {
		console.log('[Discovery Agent] Called in subgraph', {
			messageCount: state.messages.length,
			userRequest: state.userRequest.substring(0, 100),
			hasSupervisorInstructions: !!state.supervisorInstructions,
		});

		let message = `<user_request>${state.userRequest}</user_request>`;

		if (state.supervisorInstructions) {
			message += `\n<supervisor_instructions>${state.supervisorInstructions}</supervisor_instructions`;
		}
		// On first call, create initial message
		const messagesToUse =
			state.messages.length === 0
				? [
						new HumanMessage({
							content: message,
						}),
					]
				: state.messages;

		const response = await agent.invoke({
			messages: messagesToUse,
		});

		console.log('[Discovery Agent] Response', {
			hasToolCalls: response.tool_calls?.length ?? 0,
			hasContent: !!response.content,
		});

		return { messages: [response] };
	};

	/**
	 * Tool execution node - tracks get_node_details calls
	 */
	const executeTools = async (state: typeof DiscoverySubgraphState.State) => {
		const result = await executeSubgraphTools(state, toolMap);

		// Track which nodes we fetched details for
		const lastMessage = state.messages[state.messages.length - 1];
		const fetchedNodes = new Map<string, INodeTypeDescription>();

		if (
			lastMessage &&
			'tool_calls' in lastMessage &&
			Array.isArray(lastMessage.tool_calls) &&
			lastMessage.tool_calls.length > 0
		) {
			for (const toolCall of lastMessage.tool_calls) {
				if (
					toolCall &&
					typeof toolCall === 'object' &&
					'name' in toolCall &&
					toolCall.name === 'get_node_details' &&
					'args' in toolCall &&
					toolCall.args
				) {
					const args = toolCall.args as Record<string, unknown>;
					const nodeType = args.nodeType as string | undefined;
					if (nodeType) {
						const nodeDesc = config.parsedNodeTypes.find((n) => n.name === nodeType);
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
	};

	/**
	 * Extract structured results from fetched nodes
	 */
	const extractResults = (state: typeof DiscoverySubgraphState.State) => {
		const lastMessage = state.messages[state.messages.length - 1];
		const summary = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

		// Convert fetched node types to nodesFound format
		const nodesFound = Array.from(state.fetchedNodeTypes.values()).map((nodeType) => ({
			nodeType,
			reasoning: 'Selected for workflow based on requirements',
		}));

		console.log('[Discovery] Extracted results', {
			nodesFoundCount: nodesFound.length,
			nodeNames: nodesFound.map((n) => n.nodeType.displayName),
		});

		return { nodesFound, summary };
	};

	/**
	 * Should continue with tools or finish?
	 */
	const shouldContinue = (state: typeof DiscoverySubgraphState.State) => {
		// Safety: max 30 iterations
		if (state.iterationCount >= 30) {
			console.log('[Discovery Subgraph] Max iterations reached');
			return 'extract';
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

		// No tool calls = agent is done, extract results
		return 'extract';
	};

	// Build the subgraph
	const subgraph = new StateGraph(DiscoverySubgraphState)
		.addNode('agent', callAgent)
		.addNode('tools', executeTools)
		.addNode('extract', extractResults)
		.addEdge('__start__', 'agent')
		// Conditional: tools if has tool calls, extract if done
		.addConditionalEdges('agent', shouldContinue, {
			tools: 'tools',
			extract: 'extract',
		})
		.addEdge('tools', 'agent') // After tools, go back to agent
		.addEdge('extract', END); // After extraction, END

	return subgraph.compile();
}
