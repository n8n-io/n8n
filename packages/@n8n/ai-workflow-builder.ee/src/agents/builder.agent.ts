import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { createAddNodeTool } from '../tools/add-node.tool';
import { createConnectNodesTool } from '../tools/connect-nodes.tool';
import { createRemoveConnectionTool } from '../tools/remove-connection.tool';
import { createRemoveNodeTool } from '../tools/remove-node.tool';

import type { BuilderTool } from '@/utils/stream-processor';

/**
 * Builder Agent Prompt
 *
 * Focused on constructing workflow structure: creating nodes and connections.
 */
const builderAgentPrompt = `You are a Builder Agent specialized in constructing n8n workflows.

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

const systemPrompt = ChatPromptTemplate.fromMessages([
	['system', builderAgentPrompt],
	['placeholder', '{messages}'],
]);

export interface BuilderAgentConfig {
	llm: BaseChatModel;
	parsedNodeTypes: INodeTypeDescription[];
	logger?: Logger;
}

/**
 * Builder Agent
 *
 * Responsible for creating workflow structure: nodes and connections.
 * Works with add_nodes, connect_nodes, remove_node, remove_connection tools.
 */
export class BuilderAgent {
	private llm: BaseChatModel;
	private tools: BuilderTool[];

	constructor(config: BuilderAgentConfig) {
		this.llm = config.llm;

		// Only bind tools relevant to building structure
		this.tools = [
			createAddNodeTool(config.parsedNodeTypes),
			createConnectNodesTool(config.parsedNodeTypes, config.logger),
			createRemoveNodeTool(config.logger),
			createRemoveConnectionTool(config.logger),
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
