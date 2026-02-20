import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import { buildBuilderPrompt, INSTANCE_URL_PROMPT, buildRecoveryModeContext } from '@/prompts';
import type { ResourceLocatorCallback } from '@/types/callbacks';
import { autoFixConnections } from '@/validation/auto-fix';
import { validateConnections } from '@/validation/checks';
import type { BuilderFeatureFlags, ChatPayload } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
// Tools (alphabetically ordered)
import { createAddNodeTool } from '../tools/add-node.tool';
import { createConnectNodesTool } from '../tools/connect-nodes.tool';
import { createGetExecutionLogsTool } from '../tools/get-execution-logs.tool';
import { createGetExecutionSchemaTool } from '../tools/get-execution-schema.tool';
import { createGetExpressionDataMappingTool } from '../tools/get-expression-data-mapping.tool';
import { createGetNodeContextTool } from '../tools/get-node-context.tool';
import {
	createGetNodeConnectionExamplesTool,
	createGetNodeConfigurationExamplesTool,
} from '../tools/get-node-examples.tool';
import { createGetNodeParameterTool } from '../tools/get-node-parameter.tool';
import { createGetResourceLocatorOptionsTool } from '../tools/get-resource-locator-options.tool';
import { createGetWorkflowOverviewTool } from '../tools/get-workflow-overview.tool';
import {
	createIntrospectTool,
	extractIntrospectionEventsFromMessages,
} from '../tools/introspect.tool';
import { createRemoveConnectionTool } from '../tools/remove-connection.tool';
import { createRemoveNodeTool } from '../tools/remove-node.tool';
import { createRenameNodeTool } from '../tools/rename-node.tool';
import { createUpdateNodeParametersTool } from '../tools/update-node-parameters.tool';
import { mermaidStringify } from '../tools/utils/mermaid.utils';
import { createValidateConfigurationTool } from '../tools/validate-configuration.tool';
import { createValidateStructureTool } from '../tools/validate-structure.tool';
// Types and utilities
import type { CoordinationLogEntry } from '../types/coordination';
import { createBuilderMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import { isBaseMessage } from '../types/langchain';
import type { WorkflowMetadata } from '../types/tools';
import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import {
	buildConversationContext,
	buildDiscoveryContextBlock,
	buildWorkflowJsonBlock,
	buildExecutionSchemaBlock,
	buildExecutionContextBlock,
	buildSelectedNodesContextBlock,
	createContextMessage,
} from '../utils/context-builders';
import { processOperations } from '../utils/operations-processor';
import { formatPlanAsText } from '../utils/plan-helpers';
import {
	detectRLCParametersForPrefetch,
	prefetchRLCOptions,
	formatPrefetchedOptionsForLLM,
	type RLCPrefetchResult,
} from '../utils/rlc-prefetch';
import { cachedTemplatesReducer } from '../utils/state-reducers';
import type { BuilderTool } from '../utils/stream-processor';
import {
	executeSubgraphTools,
	extractUserRequest,
	createStandardShouldContinue,
	extractToolMessagesForPersistence,
} from '../utils/subgraph-helpers';

/**
 * Builder Subgraph State
 *
 * State for the Builder subgraph which handles node creation, connections, and configuration.
 */
export const BuilderSubgraphState = Annotation.Root({
	// Input: Current workflow to modify
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),

	// Input: What user wants
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Input: Execution context (optional)
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Input: Discovery context from parent
	discoveryContext: Annotation<DiscoveryContext | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// Input: Instance URL for webhook nodes
	instanceUrl: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
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

	// Pre-fetched RLC options - raw JSON for potential tool use
	prefetchedRLCOptions: Annotation<RLCPrefetchResult[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),
});

export interface BuilderSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	/** Separate LLM for parameter updater chain (defaults to llm if not provided) */
	llmParameterUpdater?: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
	featureFlags?: BuilderFeatureFlags;
	/** Callback for fetching resource locator options */
	resourceLocatorCallback?: ResourceLocatorCallback;
}

export class BuilderSubgraph extends BaseSubgraph<
	BuilderSubgraphConfig,
	typeof BuilderSubgraphState.State,
	typeof ParentGraphState.State
> {
	name = 'builder_subgraph';
	description = 'Constructs workflow structure and configures node parameters';

	private config?: BuilderSubgraphConfig;
	private agent!: Runnable;
	private toolMap!: Map<string, StructuredTool>;
	private instanceUrl: string = '';
	private nodeTypes: INodeTypeDescription[] = [];
	private resourceLocatorCallback?: ResourceLocatorCallback;
	private logger?: Logger;

	create(config: BuilderSubgraphConfig) {
		// Store config for use in transformOutput and RLC prefetching
		this.config = config;
		this.instanceUrl = config.instanceUrl ?? '';
		this.nodeTypes = config.parsedNodeTypes;
		this.resourceLocatorCallback = config.resourceLocatorCallback;
		this.logger = config.logger;

		// Check if template examples are enabled
		const includeExamples = config.featureFlags?.templateExamples === true;
		const enableIntrospection = config.featureFlags?.enableIntrospection === true;

		// Use separate LLM for parameter updater if provided
		const parameterUpdaterLLM = config.llmParameterUpdater ?? config.llm;

		// Create all tools (structure + configuration)
		const baseTools: BuilderTool[] = [
			// Structure tools
			createAddNodeTool(config.parsedNodeTypes),
			createConnectNodesTool(config.parsedNodeTypes, config.logger),
			createRemoveNodeTool(config.logger),
			createRemoveConnectionTool(config.logger),
			createRenameNodeTool(config.logger),
			createValidateStructureTool(config.parsedNodeTypes),
			// Configuration tools
			createUpdateNodeParametersTool(
				config.parsedNodeTypes,
				parameterUpdaterLLM,
				config.logger,
				config.instanceUrl,
			),
			createGetNodeParameterTool(),
			createValidateConfigurationTool(config.parsedNodeTypes),
			// Execution data tools
			createGetExecutionSchemaTool(config.logger),
			createGetExecutionLogsTool(config.logger),
			createGetExpressionDataMappingTool(config.logger),
			// Workflow context tools
			createGetWorkflowOverviewTool(config.logger),
			createGetNodeContextTool(config.logger),
		];

		// Conditionally add resource locator tool if callback is provided
		if (config.resourceLocatorCallback) {
			baseTools.push(
				createGetResourceLocatorOptionsTool(
					config.parsedNodeTypes,
					config.resourceLocatorCallback,
					config.logger,
				),
			);
		}

		// Conditionally add introspect tool if feature flag is enabled
		if (enableIntrospection) {
			baseTools.push(createIntrospectTool(config.logger));
		}

		// Conditionally add example tools if feature flag is enabled
		const tools = includeExamples
			? [
					...baseTools,
					createGetNodeConnectionExamplesTool(config.logger),
					createGetNodeConfigurationExamplesTool(config.logger),
				]
			: baseTools;

		this.toolMap = new Map<string, StructuredTool>(tools.map((bt) => [bt.tool.name, bt.tool]));

		// Create agent with tools bound
		const systemPromptTemplate = ChatPromptTemplate.fromMessages([
			[
				'system',
				[
					{
						type: 'text',
						text: buildBuilderPrompt({ includeExamples, enableIntrospection }),
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
		 * Prefetch node - pre-fetches RLC options for required empty parameters
		 * This runs before the agent to provide all necessary resource options upfront
		 * Mutates messages in place to append RLC context
		 */
		const prefetchRLCNode = async (state: typeof BuilderSubgraphState.State) => {
			// Skip if no callback is available
			if (!this.resourceLocatorCallback) {
				return { prefetchedRLCOptions: [] };
			}

			// Detect RLC parameters that need prefetching
			const parametersToFetch = detectRLCParametersForPrefetch(
				state.workflowJSON.nodes,
				this.nodeTypes,
			);

			if (parametersToFetch.length === 0) {
				return { prefetchedRLCOptions: [] };
			}

			this.logger?.debug('Pre-fetching RLC options', {
				parameterCount: parametersToFetch.length,
				parameters: parametersToFetch.map((p) => `${p.nodeName}.${p.parameterPath}`),
			});

			// Fetch all options in parallel
			const results = await prefetchRLCOptions(
				parametersToFetch,
				state.workflowJSON.nodes,
				this.resourceLocatorCallback,
				this.logger,
			);

			this.logger?.debug('RLC prefetch completed', {
				successCount: results.filter((r) => !r.error).length,
				errorCount: results.filter((r) => r.error).length,
			});

			// Format and append RLC options to the first message (mutates in place)
			const formattedOptions = formatPrefetchedOptionsForLLM(results);
			if (formattedOptions && state.messages.length > 0) {
				const firstMessage = state.messages[0];
				if (typeof firstMessage.content === 'string') {
					firstMessage.content = `${firstMessage.content}\n\n${formattedOptions}`;
				}
			}

			return { prefetchedRLCOptions: results };
		};

		/**
		 * Agent node - calls builder agent
		 * Context is already in messages from transformInput (with RLC options appended by prefetchRLCNode)
		 */
		const callAgent = async (state: typeof BuilderSubgraphState.State) => {
			// Apply cache markers to accumulated messages (for tool loop iterations)
			applySubgraphCacheMarkers(state.messages);

			// Messages already contain context from transformInput
			const response: unknown = await this.agent.invoke({
				messages: state.messages,
				instanceUrl: state.instanceUrl ?? '',
			});

			if (!isBaseMessage(response)) {
				throw new LLMServiceError('Builder agent did not return a valid message');
			}

			return { messages: [response] };
		};

		/**
		 * Should continue with tools or finish?
		 */
		const shouldContinue = createStandardShouldContinue();

		// Build the subgraph
		const subgraph = new StateGraph(BuilderSubgraphState)
			.addNode('prefetch_rlc', prefetchRLCNode)
			.addNode('agent', callAgent)
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			.addNode('process_operations', processOperations)
			.addEdge('__start__', 'prefetch_rlc')
			.addEdge('prefetch_rlc', 'agent')
			// Map 'tools' to tools node, END is handled automatically
			.addConditionalEdges('agent', shouldContinue)
			.addEdge('tools', 'process_operations')
			.addEdge('process_operations', 'agent'); // Loop back to agent

		return subgraph.compile();
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		const userRequest = extractUserRequest(parentState.messages);

		// Build context parts
		const contextParts: string[] = [];

		// When a plan exists it is the single authoritative source of truth.
		// The plan may differ from the original request (e.g. user edited the
		// model from gpt-4.1-mini to gpt-5.2-mini). Including conversation
		// context or the raw user request alongside the plan creates conflicting
		// signals that cause the builder to follow the stale original request.
		// The plan is cleared after building (transformOutput), so follow-up
		// messages still get full conversation context.
		if (parentState.planOutput) {
			contextParts.push('=== APPROVED PLAN (FOLLOW THIS) ===');
			contextParts.push(formatPlanAsText(parentState.planOutput));
			if (parentState.workflowJSON?.nodes?.length > 0) {
				const overview = mermaidStringify(
					{ workflow: parentState.workflowJSON },
					{ includeNodeType: true, includeNodeParameters: true, includeNodeName: true },
				);
				contextParts.push(
					'=== EXISTING WORKFLOW (do NOT recreate these nodes) ===',
					overview,
					'Only make the changes described in the plan.',
				);
			}
		} else {
			// Conversation context (history, original request, previous actions)
			// Supports UNDERSTANDING_CONTEXT prompt section for investigating issues
			const conversationContext = buildConversationContext(
				parentState.messages,
				parentState.coordinationLog,
				parentState.previousSummary,
			);
			if (conversationContext) {
				contextParts.push('=== CONVERSATION CONTEXT ===');
				contextParts.push(conversationContext);
			}

			if (userRequest) {
				contextParts.push('=== USER REQUEST ===');
				contextParts.push(userRequest);
			}
		}

		const selectedNodesBlock = buildSelectedNodesContextBlock(parentState.workflowContext);
		if (selectedNodesBlock) {
			contextParts.push('=== SELECTED NODES ===');
			contextParts.push(selectedNodesBlock);
		}

		// Include best practices only when template examples feature flag is enabled
		if (parentState.discoveryContext) {
			const includeBestPractices = this.config?.featureFlags?.templateExamples === true;
			contextParts.push('=== DISCOVERY CONTEXT ===');
			contextParts.push(
				buildDiscoveryContextBlock(parentState.discoveryContext, includeBestPractices),
			);
		}

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

		contextParts.push('=== CURRENT WORKFLOW ===');
		if (parentState.workflowJSON.nodes.length > 0) {
			contextParts.push(buildWorkflowJsonBlock(parentState.workflowJSON));
		} else {
			contextParts.push('Empty workflow - ready to build');
		}

		const schemaBlock = buildExecutionSchemaBlock(parentState.workflowContext);
		if (schemaBlock) {
			contextParts.push('=== AVAILABLE DATA SCHEMA ===');
			contextParts.push(schemaBlock);
		}

		// 7. Full execution context (data + schema for parameter values)
		contextParts.push('=== EXECUTION CONTEXT ===');
		contextParts.push(buildExecutionContextBlock(parentState.workflowContext));

		// Create initial message with context
		const contextMessage = createContextMessage(contextParts);

		return {
			userRequest,
			workflowJSON: parentState.workflowJSON,
			workflowContext: parentState.workflowContext,
			discoveryContext: parentState.discoveryContext,
			instanceUrl: this.instanceUrl,
			messages: [contextMessage], // Context already in messages
			cachedTemplates: parentState.cachedTemplates,
		};
	}

	transformOutput(
		subgraphOutput: typeof BuilderSubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		let workflowJSON = subgraphOutput.workflowJSON;
		let autoFixSummary: string | undefined;

		// Auto-fix missing AI connections before returning to parent
		if (this.config?.parsedNodeTypes) {
			const violations = validateConnections(workflowJSON, this.config.parsedNodeTypes);
			const autoFixResult = autoFixConnections(
				workflowJSON,
				this.config.parsedNodeTypes,
				violations,
			);

			if (autoFixResult.fixed.length > 0) {
				workflowJSON = {
					...workflowJSON,
					connections: autoFixResult.updatedConnections,
				};
				autoFixSummary = `Auto-fixed ${autoFixResult.fixed.length} connection(s): ${autoFixResult.fixed
					.map((fix) => `${fix.sourceNodeName} → ${fix.targetNodeName}`)
					.join(', ')}`;
			}
		}

		const nodes = workflowJSON.nodes;
		const connections = workflowJSON.connections;
		const connectionCount = Object.values(connections).flat().length;

		// Extract final response (builder summary or setup instructions)
		const lastMessage = subgraphOutput.messages[subgraphOutput.messages.length - 1];
		const summaryOrSetupInstructions =
			typeof lastMessage?.content === 'string'
				? lastMessage.content
				: 'Build and configuration complete';

		// Create coordination log entry
		// Use 'builder' phase for compatibility with existing routing
		const summary = autoFixSummary
			? `Created and configured ${nodes.length} nodes with ${connectionCount} connections. ${autoFixSummary}`
			: `Created and configured ${nodes.length} nodes with ${connectionCount} connections`;

		const logEntry: CoordinationLogEntry = {
			phase: 'builder',
			status: 'completed',
			timestamp: Date.now(),
			summary,
			output: summaryOrSetupInstructions, // Full output for responder
			metadata: createBuilderMetadata({
				nodesCreated: nodes.length,
				connectionsCreated: connectionCount,
				nodeNames: nodes.map((n) => n.name),
			}),
		};

		// Extract tool-related messages for persistence (skip the first context message).
		// This allows the frontend to restore UI state (execute button, tool history)
		// after page refresh.
		const toolMessages = extractToolMessagesForPersistence(subgraphOutput.messages);

		// Extract introspection events from subgraph messages
		const introspectionEvents = extractIntrospectionEventsFromMessages(subgraphOutput.messages);

		return {
			workflowJSON,
			workflowOperations: subgraphOutput.workflowOperations ?? [],
			coordinationLog: [logEntry],
			cachedTemplates: subgraphOutput.cachedTemplates,
			introspectionEvents,
			planOutput: null,
			planDecision: null,
			planFeedback: null,
			planPrevious: null,
			messages: toolMessages,
		};
	}
}
