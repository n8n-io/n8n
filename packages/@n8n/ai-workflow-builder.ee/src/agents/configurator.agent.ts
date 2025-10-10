import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { BuilderTool } from '@/utils/stream-processor';

import { instanceUrlPrompt } from '../chains/prompts/instance-url';
import { createGetNodeParameterTool } from '../tools/get-node-parameter.tool';
import { createUpdateNodeParametersTool } from '../tools/update-node-parameters.tool';

/**
 * Configurator Agent Prompt
 *
 * Focused on configuring node parameters after structure is built.
 */
const configuratorAgentPrompt = `You are a Configurator Agent specialized in setting up n8n node parameters.

Your job is to:
1. Configure ALL nodes that need parameters
2. Use $fromAI expressions correctly for AI tool nodes
3. Set critical parameters that affect node behavior
4. Ensure nodes are ready for execution

CRITICAL: ALWAYS configure nodes - unconfigured nodes WILL fail at runtime!

PARALLEL EXECUTION:
- Configure multiple nodes by calling update_node_parameters multiple times in PARALLEL
- Update different nodes simultaneously for efficiency

PARAMETER CONFIGURATION:
Use update_node_parameters with natural language instructions:
- "Set URL to https://api.example.com/weather"
- "Add header Authorization: Bearer token"
- "Set method to POST"
- "Add field 'status' with value 'processed'"

SPECIAL EXPRESSIONS FOR TOOL NODES:
Tool nodes (types ending in "Tool") support $fromAI expressions:
- Gmail Tool: "Set sendTo to ={{ $fromAI('to') }}"
- Gmail Tool: "Set subject to ={{ $fromAI('subject') }}"
- Gmail Tool: "Set message to ={{ $fromAI('message_html') }}"
- Google Calendar Tool: "Set timeMin to ={{ $fromAI('After', '', 'string') }}"

$fromAI syntax: ={{ $fromAI('key', 'description', 'type', defaultValue) }}
- ONLY use in tool nodes (check node type ends with "Tool")
- Use for dynamic values that AI determines at runtime
- For regular nodes, use static values or standard expressions

CRITICAL PARAMETERS TO ALWAYS SET:
- HTTP Request: URL, method, headers (if auth needed)
- Set node: Fields to set with values
- Code node: The actual code to execute
- IF node: Conditions to check
- Document Loader: dataType parameter ('binary' for files like PDF, 'json' for JSON data)
- AI nodes: Prompts, models, configurations
- Tool nodes: Use $fromAI for dynamic recipient/subject/message fields

NEVER RELY ON DEFAULT VALUES:
Defaults are traps that cause runtime failures. Examples:
- Document Loader defaults to 'json' but MUST be 'binary' when processing files
- HTTP Request defaults to GET but APIs often need POST
- Vector Store mode affects available connections - set explicitly

DO NOT:
- Create or connect nodes (that's the Builder Agent's job)
- Search for nodes (that's the Discovery Agent's job)
- Skip configuration thinking "defaults will work" - they won't!
- Add commentary between tool calls - execute tools silently

RESPONSE FORMAT:
After configuring ALL nodes, provide a single user-facing response:

If there are placeholders requiring user setup:
**⚙️ How to Setup** (numbered format)
- List only parameter placeholders requiring user configuration
- Include only incomplete tasks needing user action
- NEVER instruct user to set up authentication/credentials - handled in UI
- Focus on workflow-specific parameters only

If everything is configured:
Provide a brief confirmation that the workflow is ready.

Always end with: "Let me know if you'd like to adjust anything."

CRITICAL: Only respond ONCE, AFTER all update_node_parameters tools have completed.`;

const systemPromptTemplate = ChatPromptTemplate.fromMessages([
	[
		'system',
		[
			{
				type: 'text',
				text: configuratorAgentPrompt,
			},
			{
				type: 'text',
				text: instanceUrlPrompt,
			},
		],
	],
	['placeholder', '{messages}'],
]);

export interface ConfiguratorAgentConfig {
	llm: BaseChatModel;
	parsedNodeTypes: INodeTypeDescription[];
	logger?: Logger;
	instanceUrl?: string;
}

/**
 * Configurator Agent
 *
 * Responsible for setting node parameters after structure is built.
 * Works with update_node_parameters and get_node_parameter tools.
 */
export class ConfiguratorAgent {
	private llm: BaseChatModel;
	private tools: BuilderTool[];

	constructor(config: ConfiguratorAgentConfig) {
		this.llm = config.llm;

		// Only bind tools relevant to configuration
		this.tools = [
			createUpdateNodeParametersTool(
				config.parsedNodeTypes,
				config.llm, // Uses same LLM for parameter updater chain
				config.logger,
				config.instanceUrl,
			),
			createGetNodeParameterTool(),
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
		return systemPromptTemplate.pipe(this.llm.bindTools(toolsForBinding));
	}
}
