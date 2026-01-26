import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ConfiguratorReflectionAgent } from '@/agents/configurator-reflection.agent';
import { LLMServiceError } from '@/errors';
import {
	buildConfiguratorPrompt,
	buildRecoveryModeContext,
	INSTANCE_URL_PROMPT,
} from '@/prompts/agents/configurator.prompt';
import type { ResourceLocatorCallback } from '@/types/callbacks';
import type { ProgrammaticViolation } from '@/validation/types';
import type { BuilderFeatureFlags, ChatPayload } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createGetNodeConfigurationExamplesTool } from '../tools/get-node-examples.tool';
import { createGetNodeParameterTool } from '../tools/get-node-parameter.tool';
import { createGetResourceLocatorOptionsTool } from '../tools/get-resource-locator-options.tool';
import { createUpdateNodeParametersTool } from '../tools/update-node-parameters.tool';
import { createValidateConfigurationTool } from '../tools/validate-configuration.tool';
import type { CoordinationLogEntry } from '../types/coordination';
import { createConfiguratorMetadata, createReflectionMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import { isBaseMessage } from '../types/langchain';
import type { ReflectionResult } from '../types/reflection';
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
import {
	detectRLCParametersForPrefetch,
	prefetchRLCOptions,
	formatPrefetchedOptionsForLLM,
	type RLCPrefetchResult,
} from '../utils/rlc-prefetch';
import { cachedTemplatesReducer } from '../utils/state-reducers';
import { executeSubgraphTools, extractUserRequest } from '../utils/subgraph-helpers';

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

	// Pre-fetched RLC options - raw JSON for potential tool use
	prefetchedRLCOptions: Annotation<RLCPrefetchResult[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// CRITIC Pattern: Reflection state fields
	// Track reflection attempts (limit to prevent infinite loops)
	reflectionCount: Annotation<number>({
		reducer: (x, y) => y ?? x,
		default: () => 0,
	}),

	// Current reflection result (passed to next agent call)
	reflectionContext: Annotation<ReflectionResult | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// Previous reflections in this session (reflection bank)
	previousReflections: Annotation<ReflectionResult[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Last validation violations (for reflection routing)
	lastValidationViolations: Annotation<ProgrammaticViolation[]>({
		reducer: (x, y) => y ?? x,
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
	resourceLocatorCallback?: ResourceLocatorCallback;
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
	private nodeTypes: INodeTypeDescription[] = [];
	private resourceLocatorCallback?: ResourceLocatorCallback;
	private logger?: Logger;

	create(config: ConfiguratorSubgraphConfig) {
		this.instanceUrl = config.instanceUrl ?? '';
		this.nodeTypes = config.parsedNodeTypes;
		this.resourceLocatorCallback = config.resourceLocatorCallback;
		this.logger = config.logger;

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
			// Conditionally add resource locator tool if callback is provided
			...(config.resourceLocatorCallback
				? [
						createGetResourceLocatorOptionsTool(
							config.parsedNodeTypes,
							config.resourceLocatorCallback,
							config.logger,
						),
					]
				: []),
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
		 * Prefetch node - pre-fetches RLC options for required empty parameters
		 * This runs before the agent to provide all necessary resource options upfront
		 * Mutates messages in place to append RLC context
		 */
		const prefetchRLCNode = async (state: typeof ConfiguratorSubgraphState.State) => {
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

		// CRITIC Pattern: Create reflection agent for analyzing configuration failures
		const reflectionAgent = new ConfiguratorReflectionAgent({ llm: config.llm });
		const MAX_REFLECTION_ATTEMPTS = 2;

		/**
		 * Build reflection guidance block from reflection result
		 */
		const buildReflectionGuidanceBlock = (reflection: ReflectionResult): string => {
			const parts = [
				'=== REFLECTION GUIDANCE (from previous validation failure) ===',
				`Previous attempt failed: ${reflection.summary}`,
				`Root cause: ${reflection.rootCause}`,
				'Suggested fixes:',
				...reflection.suggestedFixes.map((f) => `- [${f.action}] ${f.guidance}`),
			];
			if (reflection.avoidStrategies.length > 0) {
				parts.push(`AVOID: ${reflection.avoidStrategies.join(', ')}`);
			}
			return parts.join('\n');
		};

		/**
		 * Agent node - calls configurator agent
		 * Context is already in messages from transformInput (with RLC options appended by prefetchRLCNode)
		 */
		const callAgent = async (state: typeof ConfiguratorSubgraphState.State) => {
			// Apply cache markers to accumulated messages (for tool loop iterations)
			applySubgraphCacheMarkers(state.messages);

			// Add reflection guidance if available (CRITIC pattern)
			const messagesWithReflection = state.reflectionContext
				? [
						...state.messages,
						new HumanMessage({ content: buildReflectionGuidanceBlock(state.reflectionContext) }),
					]
				: state.messages;

			const response: unknown = await this.agent.invoke({
				messages: messagesWithReflection,
				instanceUrl: state.instanceUrl ?? '',
			});

			if (!isBaseMessage(response)) {
				throw new LLMServiceError('Configurator agent did not return a valid message');
			}

			// Check if agent is making tool calls
			const hasToolCalls =
				'tool_calls' in response &&
				Array.isArray(response.tool_calls) &&
				response.tool_calls.length > 0;

			return {
				messages: [response],
				// Clear reflection context after use (it's been incorporated)
				reflectionContext: null,
				// Only clear violations if agent has tool calls (will be set again by validation tool)
				// Keep violations if agent is done so shouldContinue can route to reflection
				...(hasToolCalls ? { lastValidationViolations: [] } : {}),
			};
		};

		/**
		 * Reflection node - analyzes configuration validation failures (CRITIC pattern)
		 */
		const reflect = async (state: typeof ConfiguratorSubgraphState.State) => {
			const reflectionResult = await reflectionAgent.invoke({
				violations: state.lastValidationViolations,
				workflowJSON: state.workflowJSON,
				discoveryContext: state.discoveryContext,
				previousReflections: state.previousReflections,
				userRequest: state.userRequest,
			});

			return {
				reflectionContext: reflectionResult,
				previousReflections: [reflectionResult],
				reflectionCount: state.reflectionCount + 1,
			};
		};

		/**
		 * Should continue with tools, reflect on failures, or finish?
		 * CRITIC pattern: Route to reflection when validation fails
		 */
		const shouldContinue = (state: typeof ConfiguratorSubgraphState.State) => {
			const lastMessage = state.messages[state.messages.length - 1];
			const hasToolCalls =
				lastMessage &&
				'tool_calls' in lastMessage &&
				Array.isArray(lastMessage.tool_calls) &&
				lastMessage.tool_calls.length > 0;

			if (hasToolCalls) {
				return 'tools';
			}

			// CRITIC pattern: Route to reflection if validation failed and under limit
			if (
				state.lastValidationViolations.length > 0 &&
				state.reflectionCount < MAX_REFLECTION_ATTEMPTS
			) {
				return 'reflect';
			}

			return END;
		};

		// Build the subgraph with reflection node (CRITIC pattern)
		const subgraph = new StateGraph(ConfiguratorSubgraphState)
			.addNode('prefetch_rlc', prefetchRLCNode)
			.addNode('agent', callAgent)
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			.addNode('process_operations', processOperations)
			.addNode('reflect', reflect)
			.addEdge('__start__', 'prefetch_rlc')
			.addEdge('prefetch_rlc', 'agent')
			.addConditionalEdges('agent', shouldContinue, {
				tools: 'tools',
				reflect: 'reflect',
				[END]: END,
			})
			.addEdge('tools', 'process_operations')
			.addEdge('process_operations', 'agent')
			.addEdge('reflect', 'agent'); // After reflection, retry with guidance

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

		// Build coordination log entries
		const logEntries: CoordinationLogEntry[] = [];

		// CRITIC Pattern: Add reflection entries if any occurred
		if (subgraphOutput.previousReflections.length > 0) {
			for (let i = 0; i < subgraphOutput.previousReflections.length; i++) {
				const reflection = subgraphOutput.previousReflections[i];
				logEntries.push({
					phase: 'reflection',
					status: 'completed',
					timestamp: Date.now(),
					summary: reflection.summary,
					output: reflection.rootCause,
					metadata: createReflectionMetadata({
						violationsAnalyzed: subgraphOutput.lastValidationViolations.length,
						rootCauses: [reflection.category],
						attemptNumber: i + 1,
					}),
				});
			}
		}

		// Create configurator coordination log entry
		logEntries.push({
			phase: 'configurator',
			status: 'completed',
			timestamp: Date.now(),
			summary: `Configured ${nodesConfigured} nodes`,
			output: setupInstructions, // Full setup instructions for responder
			metadata: createConfiguratorMetadata({
				nodesConfigured,
				hasSetupInstructions,
			}),
		});

		return {
			workflowJSON: subgraphOutput.workflowJSON,
			workflowOperations: subgraphOutput.workflowOperations ?? [],
			coordinationLog: logEntries,
			// Propagate cached templates back to parent
			cachedTemplates: subgraphOutput.cachedTemplates,
			// NO messages - clean separation from user-facing conversation
		};
	}
}
