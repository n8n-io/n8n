import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { INodeTypeDescription } from 'n8n-workflow';

import { createNodeDetailsTool } from '../tools/node-details.tool';
import { createNodeSearchTool } from '../tools/node-search.tool';

import type { BuilderTool } from '@/utils/stream-processor';

/**
 * Discovery Agent Prompt
 *
 * Focused on finding and analyzing nodes needed for the workflow.
 * Does NOT build or configure - only discovers and recommends.
 */
const discoveryAgentPrompt = `You are a Discovery Agent specialized in finding n8n workflow nodes.

IMPORTANT: You have a LIMIT of 5 calls per workflow. If you've been called multiple times already, complete your search efficiently.

Your ONLY job is to:
1. Understand what the user wants to build
2. Search for NODE TYPES (not actual data/URLs)
3. Get detailed information about those node types
4. Report back what n8n nodes you found

WHAT YOU SEARCH FOR:
- n8n NODE TYPES like "RSS Read", "OpenAI", "Gmail", "Schedule Trigger"
- NOT actual RSS feed URLs, API endpoints, or data sources
- Think: "What n8n integration nodes exist?" not "What websites have RSS feeds?"

CRITICAL RULES:
- Call search_nodes to find node types by name
- Call get_node_details to understand node inputs/outputs/parameters
- Search in PARALLEL when looking for multiple node types
- Execute tools SILENTLY - no commentary before or between tool calls
- Be efficient - you have a call limit

DO NOT:
- Output text before calling tools
- Add commentary between tool calls
- Try to build the workflow (that's the Builder Agent's job)
- Configure parameters (that's the Configurator Agent's job)
- Make assumptions about which nodes to use - always search first

RESPONSE FORMAT:
After ALL tools have completed, provide ONE brief text message summarizing:
- What nodes you found (by display name)
- Their key capabilities

Example: "I found Schedule Trigger for daily execution, OpenWeatherMap for weather data, OpenAI for image generation, and Gmail for sending emails."

CRITICAL: Only respond AFTER all search_nodes and get_node_details tools have executed.`;

const systemPrompt = ChatPromptTemplate.fromMessages([
	['system', discoveryAgentPrompt],
	['placeholder', '{messages}'],
]);

export interface DiscoveryAgentConfig {
	llm: BaseChatModel;
	parsedNodeTypes: INodeTypeDescription[];
}

/**
 * Discovery Agent
 *
 * Responsible for finding and analyzing nodes from the n8n catalog.
 * Works with search_nodes and get_node_details tools.
 */
export class DiscoveryAgent {
	private llm: BaseChatModel;
	private tools: BuilderTool[];

	constructor(config: DiscoveryAgentConfig) {
		this.llm = config.llm;

		// Only bind tools relevant to discovery
		this.tools = [
			createNodeSearchTool(config.parsedNodeTypes),
			createNodeDetailsTool(config.parsedNodeTypes),
		];
	}

	/**
	 * Get the tools for this agent
	 */
	getTools(): BuilderTool[] {
		return this.tools;
	}

	/**
	 * Get the agent's LLM with tools bound
	 */
	getAgent() {
		const toolsForBinding = this.tools.map((bt) => bt.tool);
		if (typeof this.llm.bindTools !== 'function') {
			throw new Error('LLM does not support tools');
		}
		return systemPrompt.pipe(this.llm.bindTools(toolsForBinding));
	}
}
