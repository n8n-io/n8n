import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createGetNodeParameterTool } from '../tools/get-node-parameter.tool';
import { createUpdateNodeParametersTool } from '../tools/update-node-parameters.tool';
import { createValidateConfigurationTool } from '../tools/validate-configuration.tool';
import type { CoordinationLogEntry } from '../types/coordination';
import { createConfiguratorMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import { isBaseMessage } from '../types/langchain';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import {
	buildWorkflowJsonBlock,
	buildExecutionContextBlock,
	createContextMessage,
} from '../utils/context-builders';
import { processOperations } from '../utils/operations-processor';
import {
	executeSubgraphTools,
	extractUserRequest,
	createStandardShouldContinue,
} from '../utils/subgraph-helpers';
import type { ChatPayload } from '../workflow-builder-agent';

/**
 * Configurator Agent Prompt
 */
const CONFIGURATOR_PROMPT = `You are a Configurator Agent specialized in setting up n8n node parameters.

MANDATORY EXECUTION SEQUENCE:
You MUST follow these steps IN ORDER. Do not skip any step.

STEP 1: CONFIGURE ALL NODES
- Call update_node_parameters for EVERY node in the workflow
- Configure multiple nodes in PARALLEL for efficiency
- Do NOT respond with text - START CONFIGURING immediately

STEP 2: VALIDATE (REQUIRED)
- After ALL configurations complete, call validate_configuration
- This step is MANDATORY - you cannot finish without it
- If validation finds issues, fix them and validate again

STEP 3: RESPOND TO USER
- Only after validation passes, provide your response

NEVER respond to the user without calling validate_configuration first

WORKFLOW JSON DETECTION:
- You receive <current_workflow_json> in your context
- If you see nodes in the workflow JSON, you MUST configure them IMMEDIATELY
- Look at the workflow JSON, identify each node, and call update_node_parameters for ALL of them

PARAMETER CONFIGURATION:
Use update_node_parameters with natural language instructions:
- "Set URL to https://api.example.com/weather"
- "Add header Authorization: Bearer token"
- "Set method to POST"
- "Add field 'status' with value 'processed'"

SPECIAL EXPRESSIONS FOR TOOL NODES:
Tool nodes (types ending in "Tool") support $fromAI expressions:
- "Set sendTo to ={{ $fromAI('to') }}"
- "Set subject to ={{ $fromAI('subject') }}"
- "Set message to ={{ $fromAI('message_html') }}"
- "Set timeMin to ={{ $fromAI('After', '', 'string') }}"

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
- Vector Store mode affects available connections - set explicitly (retrieve-as-tool when using with AI Agent)

<response_format>
After validation passes, provide a concise summary:
- List any placeholders requiring user configuration (e.g., "URL placeholder needs actual endpoint")
- Note which nodes were configured and key settings applied
- Keep it brief - this output is used for coordination with other LLM agents, not displayed directly to users
</response_format>

DO NOT:
- Respond before calling validate_configuration
- Skip validation even if you think configuration is correct
- Add commentary between tool calls - execute tools silently`;

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
	private instanceUrl: string = '';

	create(config: ConfiguratorSubgraphConfig) {
		this.instanceUrl = config.instanceUrl ?? '';
		// Create tools
		const tools = [
			createUpdateNodeParametersTool(
				config.parsedNodeTypes,
				config.llm, // Uses same LLM for parameter updater chain
				config.logger,
				config.instanceUrl,
			),
			createGetNodeParameterTool(),
			createValidateConfigurationTool(config.parsedNodeTypes),
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
		 * Context is already in messages from transformInput
		 */
		const callAgent = async (state: typeof ConfiguratorSubgraphState.State) => {
			// Apply cache markers to accumulated messages (for tool loop iterations)
			applySubgraphCacheMarkers(state.messages);

			// Messages already contain context from transformInput
			const response: unknown = await this.agent.invoke({
				messages: state.messages,
				instanceUrl: state.instanceUrl ?? '',
			});

			if (!isBaseMessage(response)) {
				throw new LLMServiceError('Configurator agent did not return a valid message');
			}

			return { messages: [response] };
		};

		// Build the subgraph
		const subgraph = new StateGraph(ConfiguratorSubgraphState)
			.addNode('agent', callAgent)
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			.addNode('process_operations', processOperations)
			.addEdge('__start__', 'agent')
			// Map 'tools' to tools node, END is handled automatically
			.addConditionalEdges('agent', createStandardShouldContinue())
			.addEdge('tools', 'process_operations')
			.addEdge('process_operations', 'agent'); // Loop back

		return subgraph.compile();
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		const userRequest = extractUserRequest(parentState.messages);

		// Build context parts for Configurator
		const contextParts: string[] = [];

		// 1. User request (primary)
		if (userRequest) {
			contextParts.push('=== USER REQUEST ===');
			contextParts.push(userRequest);
		}

		// 2. Best practices only from discovery (not full nodes list)
		if (parentState.discoveryContext?.bestPractices) {
			contextParts.push(parentState.discoveryContext.bestPractices);
		}

		// 3. Full workflow JSON (nodes to configure)
		contextParts.push('=== WORKFLOW TO CONFIGURE ===');
		contextParts.push(buildWorkflowJsonBlock(parentState.workflowJSON));

		// 4. Full execution context (data + schema for parameter values)
		contextParts.push('=== EXECUTION CONTEXT ===');
		contextParts.push(buildExecutionContextBlock(parentState.workflowContext));

		// Create initial message with context
		const contextMessage = createContextMessage(contextParts);

		return {
			workflowJSON: parentState.workflowJSON,
			workflowContext: parentState.workflowContext,
			instanceUrl: this.instanceUrl,
			userRequest,
			discoveryContext: parentState.discoveryContext,
			messages: [contextMessage],
		};
	}

	transformOutput(
		subgraphOutput: typeof ConfiguratorSubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		// Extract final response (setup instructions)
		const lastMessage = subgraphOutput.messages[subgraphOutput.messages.length - 1];
		const setupInstructions =
			typeof lastMessage?.content === 'string' ? lastMessage.content : 'Configuration complete';

		const nodesConfigured = subgraphOutput.workflowJSON.nodes.length;
		const hasSetupInstructions =
			setupInstructions.includes('Setup') ||
			setupInstructions.includes('setup') ||
			setupInstructions.length > 50;

		// Create coordination log entry (not a message)
		const logEntry: CoordinationLogEntry = {
			phase: 'configurator',
			status: 'completed',
			timestamp: Date.now(),
			summary: `Configured ${nodesConfigured} nodes`,
			output: setupInstructions, // Full setup instructions for responder
			metadata: createConfiguratorMetadata({
				nodesConfigured,
				hasSetupInstructions,
			}),
		};

		return {
			workflowJSON: subgraphOutput.workflowJSON,
			workflowOperations: subgraphOutput.workflowOperations ?? [],
			coordinationLog: [logEntry],
			// NO messages - clean separation from user-facing conversation
		};
	}
}
