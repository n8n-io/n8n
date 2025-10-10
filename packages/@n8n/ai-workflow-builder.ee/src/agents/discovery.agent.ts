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

Your ONLY job is to:
1. Understand what the user wants to build
2. Search for relevant nodes
3. Get detailed information about those nodes
4. Report back what you found

CRITICAL RULES:
- Call search_nodes FIRST to find nodes by name or capability
- Call get_node_details to understand node inputs/outputs/parameters
- Search in PARALLEL when looking for multiple types of nodes
- Be thorough - better to search too broadly than miss important nodes

DO NOT:
- Try to build the workflow (that's the Builder Agent's job)
- Configure parameters (that's the Configurator Agent's job)
- Make assumptions about which nodes to use - always search first

RESPONSE FORMAT:
After gathering all information, provide a brief text message summarizing:
- What nodes you found (by display name)
- Their key capabilities

Example: "I found Schedule Trigger for daily execution, OpenWeatherMap for weather data, OpenAI for image generation, and Gmail for sending emails."

Keep it concise - the tool execution details are already visible to the user.`;

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
