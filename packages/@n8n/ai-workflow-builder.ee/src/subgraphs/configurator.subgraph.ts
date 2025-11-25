import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';

import { createGetNodeParameterTool } from '../tools/get-node-parameter.tool';
import { createUpdateNodeParametersTool } from '../tools/update-node-parameters.tool';
import type { CoordinationLogEntry, ConfiguratorMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
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
import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';

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
		 * Context is already in messages from transformInput
		 */
		const callAgent = async (state: typeof ConfiguratorSubgraphState.State) => {
			console.log(
				`[Configurator] callAgent iteration=${state.iterationCount} messages=${state.messages.length}`,
			);

			// Apply cache markers to accumulated messages (for tool loop iterations)
			applySubgraphCacheMarkers(state.messages);

			// Messages already contain context from transformInput
			const response = (await this.agent.invoke({
				messages: state.messages,
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
			contextParts.push('=== BEST PRACTICES ===');
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

		console.log('\n========== CONFIGURATOR SUBGRAPH ==========');
		console.log('[Configurator] transformInput called');
		console.log(`[Configurator] User request: "${userRequest.substring(0, 100)}..."`);
		console.log(
			`[Configurator] Workflow nodes to configure: ${parentState.workflowJSON.nodes.length}`,
		);
		if (parentState.workflowJSON.nodes.length > 0) {
			console.log(
				`[Configurator] Node names: ${parentState.workflowJSON.nodes.map((n) => n.name).join(', ')}`,
			);
		}

		return {
			workflowJSON: parentState.workflowJSON,
			workflowContext: parentState.workflowContext,
			instanceUrl: '', // This needs to be passed in config or context, but for now empty
			userRequest,
			discoveryContext: parentState.discoveryContext,
			messages: [contextMessage], // Context already in messages
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

		console.log('[Configurator] transformOutput called');
		console.log(`[Configurator] Final workflow nodes: ${subgraphOutput.workflowJSON.nodes.length}`);
		console.log(
			`[Configurator] Operations queued: ${subgraphOutput.workflowOperations?.length ?? 0}`,
		);
		console.log(`[Configurator] Iterations: ${subgraphOutput.iterationCount}`);
		console.log(
			`[Configurator] Setup instructions preview: "${setupInstructions.substring(0, 100)}..."`,
		);
		console.log('============================================\n');

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
			metadata: {
				phase: 'configurator',
				nodesConfigured,
				hasSetupInstructions,
			} as ConfiguratorMetadata,
		};

		return {
			workflowJSON: subgraphOutput.workflowJSON,
			workflowOperations: subgraphOutput.workflowOperations ?? [],
			coordinationLog: [logEntry],
			// NO messages - clean separation from user-facing conversation
		};
	}
}

export function createConfiguratorSubgraph(config: ConfiguratorSubgraphConfig) {
	return new ConfiguratorSubgraph().create(config);
}
