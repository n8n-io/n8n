import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import { trimWorkflowJSON } from '@/utils/trim-workflow-context';

import { createGetNodeParameterTool } from '../tools/get-node-parameter.tool';
import { createUpdateNodeParametersTool } from '../tools/update-node-parameters.tool';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import { processOperations } from '../utils/operations-processor';
import {
	executeSubgraphTools,
	extractUserRequest,
	createStandardShouldContinue,
} from '../utils/subgraph-helpers';
import type { ChatPayload } from '../workflow-builder-agent';
import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import type { DiscoveryContext } from '../types/discovery-types';

/**
 * Configurator Agent Prompt
 */
const CONFIGURATOR_PROMPT = `You are a Configurator Agent specialized in setting up n8n node parameters.

Your job is to:
1. Configure ALL nodes that need parameters
2. Use $fromAI expressions correctly for AI tool nodes
3. Set critical parameters that affect node behavior
4. Ensure nodes are ready for execution

CRITICAL: ALWAYS configure nodes - unconfigured nodes WILL fail at runtime!

WORKFLOW JSON DETECTION:
- You receive <current_workflow_json> in your context
- If you see nodes in the workflow JSON, you MUST configure them IMMEDIATELY
- Do NOT respond with text asking what to do - START CONFIGURING
- Look at the workflow JSON, identify each node, and call update_node_parameters for ALL of them

PARALLEL EXECUTION:
- Configure multiple nodes by calling update_node_parameters multiple times in PARALLEL
- Update different nodes simultaneously for efficiency
- Call tools FIRST, then respond with summary

PARAMTER CONFIGURATION:
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

/**
 * Instance URL prompt template
 */
const INSTANCE_URL_PROMPT = `
<instance_url>
The n8n instance base URL is: {instanceUrl}

This URL is essential for webhook nodes and chat triggers as it provides the base URL for:
- Webhook URLs that external services need to call
- Chat trigger URLs for conversational interfaces
- Any node that requires the full instance URL to generate proper callback URLs

When working with webhook or chat trigger nodes, use this URL as the base for constructing proper endpoint URLs.
</instance_url>
`;

/**
 * Configurator Subgraph State
 */
export const ConfiguratorSubgraphState = Annotation.Root({
	// Input: Workflow to configure
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),

	// Input: Execution context (optional)
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Input: Instance URL for webhook nodes
	instanceUrl: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Input: User request
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
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

	// Output: Final user-facing response
	finalResponse: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal: Safety counter
	iterationCount: Annotation<number>({
		reducer: (x, y) => (y ?? x) + 1,
		default: () => 0,
	}),
});

export interface ConfiguratorSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
}

export class ConfiguratorSubgraph extends BaseSubgraph<
	ConfiguratorSubgraphConfig,
	typeof ConfiguratorSubgraphState.State,
	typeof ParentGraphState.State
> {
	name = 'configurator_subgraph';
	description = 'Configures node parameters after structure is built';

	private agent!: Runnable;
	private toolMap!: Map<string, StructuredTool>;
	// private config!: ConfiguratorSubgraphConfig;

	create(config: ConfiguratorSubgraphConfig) {
		// Create tools
		const tools = [
			createUpdateNodeParametersTool(
				config.parsedNodeTypes,
				config.llm, // Uses same LLM for parameter updater chain
				config.logger,
				config.instanceUrl,
			),
			createGetNodeParameterTool(),
		];
		this.toolMap = new Map<string, StructuredTool>(tools.map((bt) => [bt.tool.name, bt.tool]));
		// Create agent with tools bound
		const systemPromptTemplate = ChatPromptTemplate.fromMessages([
			[
				'system',
				[
					{
						type: 'text',
						text: CONFIGURATOR_PROMPT,
					},
					{
						type: 'text',
						text: INSTANCE_URL_PROMPT,
						cache_control: { type: 'ephemeral' },
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

		this.agent = systemPromptTemplate.pipe(config.llm.bindTools(tools.map((bt) => bt.tool)));

		/**
		 * Agent node - calls configurator agent
		 */
		const callAgent = async (state: typeof ConfiguratorSubgraphState.State) => {
			console.log(
				`[Configurator] callAgent iteration=${state.iterationCount} messages=${state.messages.length}`,
			);

			const trimmedWorkflow = trimWorkflowJSON(state.workflowJSON);
			const executionData = state.workflowContext?.executionData ?? {};
			const executionSchema = state.workflowContext?.executionSchema ?? [];

			// On first call, create initial message with context
			if (state.messages.length === 0) {
				const contextParts: string[] = [];

				// 1. User request (primary)
				if (state.userRequest) {
					contextParts.push('=== USER REQUEST ===');
					contextParts.push(state.userRequest);
					contextParts.push('');
				}

				// 2. Discovery best practices
				if (state.discoveryContext?.bestPractices) {
					contextParts.push('=== BEST PRACTICES ===');
					contextParts.push(state.discoveryContext.bestPractices);
					contextParts.push('');
				}

				// 3. Workflow JSON
				contextParts.push('=== WORKFLOW TO CONFIGURE ===');
				contextParts.push('<current_workflow_json>');
				contextParts.push(JSON.stringify(trimmedWorkflow, null, 2));
				contextParts.push('</current_workflow_json>');
				contextParts.push('<trimmed_workflow_json_note>');
				contextParts.push(
					'Note: Large property values may be trimmed. Use get_node_parameter tool for full details.',
				);
				contextParts.push('</trimmed_workflow_json_note>');
				contextParts.push('');

				// 4. Execution data
				contextParts.push('<current_simplified_execution_data>');
				contextParts.push(JSON.stringify(executionData, null, 2));
				contextParts.push('</current_simplified_execution_data>');
				contextParts.push('');
				contextParts.push('<current_execution_nodes_schemas>');
				contextParts.push(JSON.stringify(executionSchema, null, 2));
				contextParts.push('</current_execution_nodes_schemas>');

				const contextMessage = new HumanMessage({ content: contextParts.join('\n') });
				console.log('[Configurator] First call with context message');
				const response = (await this.agent.invoke({
					messages: [contextMessage],
					instanceUrl: state.instanceUrl ?? '',
				})) as BaseMessage;

				const toolCalls =
					'tool_calls' in response && Array.isArray(response.tool_calls)
						? response.tool_calls.length
						: 0;
				console.log(`[Configurator] Agent response: ${toolCalls} tool calls`);
				return { messages: [contextMessage, response] };
			}

			// Subsequent calls - add workflow context and apply cache markers
			const workflowContext = [
				'',
				'<current_workflow_json>',
				JSON.stringify(trimmedWorkflow, null, 2),
				'</current_workflow_json>',
				'',
				'<current_simplified_execution_data>',
				JSON.stringify(executionData, null, 2),
				'</current_simplified_execution_data>',
				'',
				'<current_execution_nodes_schemas>',
				JSON.stringify(executionSchema, null, 2),
				'</current_execution_nodes_schemas>',
			].join('\n');

			const messagesToUse = [...state.messages, new HumanMessage({ content: workflowContext })];

			// Apply cache markers to accumulated messages
			applySubgraphCacheMarkers(messagesToUse);

			const response = (await this.agent.invoke({
				messages: messagesToUse,
				instanceUrl: state.instanceUrl ?? '',
			})) as BaseMessage;

			const toolCalls =
				'tool_calls' in response && Array.isArray(response.tool_calls)
					? response.tool_calls.length
					: 0;
			console.log(`[Configurator] Agent response: ${toolCalls} tool calls`);
			return { messages: [response] };
		};

		/**
		 * Tool execution node - uses helper for consistent execution
		 */
		const executeTools = async (state: typeof ConfiguratorSubgraphState.State) => {
			return await executeSubgraphTools(state, this.toolMap);
		};

		/**
		 * Should continue with tools or finish?
		 */
		const shouldContinue = createStandardShouldContinue(15);

		// Build the subgraph
		const subgraph = new StateGraph(ConfiguratorSubgraphState)
			.addNode('agent', callAgent)
			.addNode('tools', executeTools)
			.addNode('process_operations', processOperations)
			.addEdge('__start__', 'agent')
			// Map 'tools' to tools node, END is handled automatically
			.addConditionalEdges('agent', shouldContinue)
			.addEdge('tools', 'process_operations')
			.addEdge('process_operations', 'agent'); // Loop back

		return subgraph.compile();
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		return {
			workflowJSON: parentState.workflowJSON,
			workflowContext: parentState.workflowContext,
			instanceUrl: '', // This needs to be passed in config or context, but for now empty
			userRequest: extractUserRequest(parentState.messages),
			discoveryContext: parentState.discoveryContext,
			messages: [],
		};
	}

	transformOutput(
		subgraphOutput: typeof ConfiguratorSubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		// Extract final response
		const lastMessage = subgraphOutput.messages[subgraphOutput.messages.length - 1];
		const finalResponse =
			typeof lastMessage?.content === 'string' ? lastMessage.content : 'Configuration complete';

		return {
			workflowJSON: subgraphOutput.workflowJSON,
			workflowOperations: subgraphOutput.workflowOperations ?? [],
			messages: [
				new HumanMessage({
					content: `[configurator_subgraph] ${finalResponse}`,
					name: 'configurator_subgraph',
				}),
			],
		};
	}
}

export function createConfiguratorSubgraph(config: ConfiguratorSubgraphConfig) {
	return new ConfiguratorSubgraph().create(config);
}
