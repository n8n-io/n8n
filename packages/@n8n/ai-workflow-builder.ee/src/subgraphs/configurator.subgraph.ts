import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import {
	buildConfiguratorPrompt,
	buildRecoveryModeContext,
	INSTANCE_URL_PROMPT,
} from '@/prompts/agents/configurator.prompt';
import type { BuilderFeatureFlags, ChatPayload } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createGetNodeConfigurationExamplesTool } from '../tools/get-node-examples.tool';
import { createGetNodeParameterTool } from '../tools/get-node-parameter.tool';
import { createUpdateNodeParametersTool } from '../tools/update-node-parameters.tool';
import { createValidateConfigurationTool } from '../tools/validate-configuration.tool';
import type { CoordinationLogEntry } from '../types/coordination';
import { createConfiguratorMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import { isBaseMessage } from '../types/langchain';
import type { WorkflowMetadata } from '../types/tools';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import {
	buildWorkflowJsonBlock,
	buildExecutionContextBlock,
	buildDiscoveryContextBlock,
	createContextMessage,
} from '../utils/context-builders';
import { processOperations } from '../utils/operations-processor';
import { cachedTemplatesReducer } from '../utils/state-reducers';
import {
	executeSubgraphTools,
	extractUserRequest,
	createStandardShouldContinue,
} from '../utils/subgraph-helpers';

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

	// Cached workflow templates (passed from parent, updated by tools)
	cachedTemplates: Annotation<WorkflowMetadata[]>({
		reducer: cachedTemplatesReducer,
		default: () => [],
	}),
});

export interface ConfiguratorSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	/** Separate LLM for parameter updater chain (defaults to llm if not provided) */
	llmParameterUpdater?: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
	featureFlags?: BuilderFeatureFlags;
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

		// Check if template examples are enabled
		const includeExamples = config.featureFlags?.templateExamples === true;

		// Use separate LLM for parameter updater if provided
		const parameterUpdaterLLM = config.llmParameterUpdater ?? config.llm;

		// Create base tools
		const baseTools = [
			createUpdateNodeParametersTool(
				config.parsedNodeTypes,
				parameterUpdaterLLM, // Uses separate LLM for parameter updater chain
				config.logger,
				config.instanceUrl,
			),
			createGetNodeParameterTool(),
			createValidateConfigurationTool(config.parsedNodeTypes),
		];

		// Conditionally add node configuration examples tool if feature flag is enabled
		const tools = includeExamples
			? [...baseTools, createGetNodeConfigurationExamplesTool(config.logger)]
			: baseTools;
		this.toolMap = new Map<string, StructuredTool>(tools.map((bt) => [bt.tool.name, bt.tool]));
		// Create agent with tools bound
		const systemPromptTemplate = ChatPromptTemplate.fromMessages([
			[
				'system',
				[
					{
						type: 'text',
						text: buildConfiguratorPrompt(),
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

		// 2. Discovery context - includes available resources/operations for each node type
		if (parentState.discoveryContext) {
			contextParts.push('=== DISCOVERY CONTEXT ===');
			contextParts.push(buildDiscoveryContextBlock(parentState.discoveryContext, true));
		}

		// 3. Check if this workflow came from a recovered builder recursion error (AI-1812)
		const builderErrorEntry = parentState.coordinationLog?.find((entry) => {
			if (entry.status !== 'error') return false;
			if (entry.phase !== 'builder') return false;
			return (
				entry.metadata.phase === 'error' &&
				'partialBuilderData' in entry.metadata &&
				entry.metadata.partialBuilderData
			);
		});

		if (
			builderErrorEntry?.metadata.phase === 'error' &&
			builderErrorEntry.metadata.partialBuilderData
		) {
			const { nodeCount, nodeNames } = builderErrorEntry.metadata.partialBuilderData;
			contextParts.push(buildRecoveryModeContext(nodeCount, nodeNames));
		}

		// 4. Full workflow JSON (nodes to configure)
		// Note: resource/operation are already set by Builder via initialParameters
		// and filtering happens automatically in update_node_parameters
		contextParts.push('=== WORKFLOW TO CONFIGURE ===');
		contextParts.push(buildWorkflowJsonBlock(parentState.workflowJSON));

		// 5. Full execution context (data + schema for parameter values)
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
			cachedTemplates: parentState.cachedTemplates,
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
			// Propagate cached templates back to parent
			cachedTemplates: subgraphOutput.cachedTemplates,
			// NO messages - clean separation from user-facing conversation
		};
	}
}
