import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, isAIMessage } from '@langchain/core/messages';
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
 * Context gatherer for the AI Workflow Builder.
 * Discovers nodes and provides structured context for builder/configurator agents.
 */
const DISCOVERY_PROMPT = `You are a Discovery Agent for n8n AI Workflow Builder.

YOUR ROLE: Gather ALL relevant context needed to successfully build and configure the workflow.

AVAILABLE TOOLS:
- search_nodes: Find n8n integration nodes by keyword (e.g., "Gmail", "OpenAI", "HTTP")
- get_node_details: Get complete information about a specific node type

WHAT TO DISCOVER:
1. **Node Types**: Which n8n integrations are needed (Gmail, Slack, HTTP Request, etc.)
2. **Connection Patterns**: How nodes should connect (sequential, parallel, AI sub-nodes)
3. **Data Requirements**: Input/output formats, API requirements, credential needs
4. **Configuration Hints**: Critical parameters, common pitfalls, best practices

CRITICAL RULES:
- NEVER ask clarifying questions - work with the information provided
- Search comprehensively - find ALL relevant nodes
- Call get_node_details for EVERY node you find (Builder needs full details)
- Execute tools in PARALLEL for efficiency
- Execute tools SILENTLY - no commentary before or between tool calls
- Search broadly (e.g., "OpenAI" finds ChatGPT, DALL-E, Whisper nodes)

SEARCH STRATEGY:
1. Identify workflow components from user request (trigger, data source, processing, action)
2. Search for each component type
3. Get details for ALL promising matches
4. Consider alternatives (e.g., both "Gmail" and "HTTP Request" for email sending)

DO NOT:
- Ask "what API endpoint?" or "which service?" - make reasonable assumptions
- Output commentary between tool calls
- Skip get_node_details (Builder/Configurator need complete node information)
- Try to build or configure workflows (other agents handle that)

OUTPUT FORMAT (after ALL tools complete):

**Nodes:**
- [Display Name] ([node.type]): [Why this node is needed for the workflow]
- [Display Name] ([node.type]): [Why this node is needed for the workflow]

**Context for Builder:**
- [Connection pattern, e.g., "Connect trigger → data fetch → processing → action"]
- [Structural guidance, e.g., "Vector Store needs Document Loader via ai_document connection"]

**Context for Configurator:**
- [Parameter requirements, e.g., "HTTP Request needs POST method and /weather endpoint"]
- [Data format notes, e.g., "Document Loader must use 'binary' dataType for PDF files"]
- [API/credential notes, e.g., "OpenWeather requires API key in query params"]

Example:

**Nodes:**
- Schedule Trigger (n8n-nodes-base.scheduleTrigger): Triggers workflow daily at specified time
- HTTP Request (n8n-nodes-base.httpRequest): Fetches weather data from OpenWeather API
- Gmail (n8n-nodes-base.gmail): Sends formatted weather alert emails

**Context for Builder:**
- Connect sequentially: Schedule Trigger → HTTP Request → Gmail
- Standard main connection flow (no AI sub-nodes needed)

**Context for Configurator:**
- HTTP Request: Set method to GET, URL to https://api.openweathermap.org/data/2.5/weather, add API key header
- Gmail: Use recipient email, subject line with date, body with weather data from HTTP response
- Schedule: Set to run daily at 8 AM

CRITICAL: Respond ONCE after ALL tools complete. NEVER ask questions - work with what you have.`;

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
		reducer: (x, y) => (y ?? x) + 1,
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
		['human', '{prompt}'],
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

		const response = await agent.invoke({
			messages: state.messages,
			prompt: message,
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
		const lastMessage = state.messages.at(-1);
		const fetchedNodes = new Map<string, INodeTypeDescription>();

		if (lastMessage && isAIMessage(lastMessage) && lastMessage.tool_calls) {
			lastMessage.tool_calls
				.filter((tc) => tc.name === 'get_node_details')
				.forEach((tc) => {
					const nodeType = tc.args?.nodeType as string | undefined;
					if (nodeType) {
						const nodeDesc = config.parsedNodeTypes.find((n) => n.name === nodeType);
						if (nodeDesc) {
							fetchedNodes.set(nodeType, nodeDesc);
						}
					}
				});
		}

		return {
			...result,
			fetchedNodeTypes: fetchedNodes,
		};
	};

	/**
	 * Extract structured results from agent's markdown output
	 */
	const extractResults = (state: typeof DiscoverySubgraphState.State) => {
		const lastMessage = state.messages.at(-1);
		const content = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

		// Extract reasoning for each node from **Nodes:** section
		const nodesFound = Array.from(state.fetchedNodeTypes.values()).map((nodeType) => {
			// Try to find this node's line in the markdown
			const nodePattern = new RegExp(`-\\s+${nodeType.displayName}\\s*\\([^)]+\\):\\s*(.+)`, 'i');
			const match = content.match(nodePattern);
			const reasoning = match?.[1]?.trim() ?? 'Selected for workflow';

			return { nodeType, reasoning };
		});

		// Parse "Context for Builder:" section
		const builderMatch = content.match(/\*\*Context for Builder:\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/i);
		const builderContext =
			builderMatch?.[1]
				?.split('\n')
				.filter((line) => line.trim().startsWith('-'))
				.map((line) => ({
					context: line.replace(/^-\s*/, '').trim(),
					relevancy: 'builder' as const,
				})) ?? [];

		// Parse "Context for Configurator:" section
		const configMatch = content.match(
			/\*\*Context for Configurator:\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/i,
		);
		const configContext =
			configMatch?.[1]
				?.split('\n')
				.filter((line) => line.trim().startsWith('-'))
				.map((line) => ({
					context: line.replace(/^-\s*/, '').trim(),
					relevancy: 'configurator' as const,
				})) ?? [];

		const relevantContext = [...builderContext, ...configContext];

		console.log('[Discovery] Extracted results', {
			nodesFoundCount: nodesFound.length,
			nodeNames: nodesFound.map((n) => n.nodeType.displayName),
			relevantContextCount: relevantContext.length,
		});

		return { nodesFound, relevantContext, summary: content };
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
