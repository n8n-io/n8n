/**
 * Discovery Subgraph
 *
 * Discovers relevant nodes, best practices, and optional plan generation/approval.
 * Uses tool-loop pattern for discovery with structured submit tool.
 */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, AIMessage } from '@langchain/core/messages';
import { HumanMessage, ToolMessage, isAIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable, RunnableConfig } from '@langchain/core/runnables';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { Annotation, END, START, StateGraph, type BaseCheckpointSaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { createPlannerAgent, invokePlannerNode } from '@/agents/planner.agent';
import { LLMServiceError } from '@/errors';
import type { ParentGraphState } from '@/parent-graph-state';
import { buildDiscoveryPrompt } from '@/prompts';
import { createGetDocumentationTool } from '@/tools/get-documentation.tool';
import { createGetWorkflowExamplesTool } from '@/tools/get-workflow-examples.tool';
import {
	createIntrospectTool,
	extractIntrospectionEventsFromMessages,
} from '@/tools/introspect.tool';
import { createNodeSearchTool } from '@/tools/node-search.tool';
import { submitQuestionsTool } from '@/tools/submit-questions.tool';
import type { CoordinationLogEntry } from '@/types/coordination';
import { createDiscoveryMetadata } from '@/types/coordination';
import type { DiscoveryContext } from '@/types/discovery-types';
import type { PlanDecision, PlanOutput } from '@/types/planning';
import type { WorkflowMetadata } from '@/types/tools';
import type { SimpleWorkflow } from '@/types/workflow';
import { applySubgraphCacheMarkers } from '@/utils/cache-control';
import {
	buildWorkflowSummary,
	buildSelectedNodesSummary,
	createContextMessage,
} from '@/utils/context-builders';
import {
	createResourceCacheKey,
	extractResourceOperations,
	type ResourceOperationInfo,
} from '@/utils/resource-operation-extractor';
import { appendArrayReducer, cachedTemplatesReducer } from '@/utils/state-reducers';
import {
	executeSubgraphTools,
	extractUserRequest,
	extractToolMessagesForPersistence,
} from '@/utils/subgraph-helpers';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';

/**
 * Strict Output Schema for Discovery
 * Simplified to reduce token usage while maintaining utility for downstream subgraphs
 */
const discoveryOutputSchema = z.object({
	nodesFound: z
		.array(
			z.object({
				nodeName: z.string().describe('The internal name of the node (e.g., n8n-nodes-base.gmail)'),
				version: z
					.number()
					.describe('The version number of the node (e.g., 1, 1.1, 2, 3, 3.2, etc.)'),
				reasoning: z.string().describe('Why this node is relevant for the workflow'),
				connectionChangingParameters: z
					.array(
						z.object({
							name: z
								.string()
								.describe('Parameter name (e.g., "mode", "operation", "hasOutputParser")'),
							possibleValues: z
								.array(z.union([z.string(), z.boolean(), z.number()]))
								.describe('Possible values this parameter can take'),
						}),
					)
					.describe(
						'Parameters that affect node connections (inputs/outputs). ONLY include if parameter appears in <input> or <output> expressions',
					),
			}),
		)
		.describe('List of n8n nodes identified as necessary for the workflow'),
});

type DiscoveryOutput = z.infer<typeof discoveryOutputSchema>;

/**
 * Discovery Subgraph State
 */
export const DiscoverySubgraphState = Annotation.Root({
	// Input: What the user wants to build
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Input: Current workflow
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),

	// Plan Mode: Request mode ('build' for direct build, 'plan' for planning first)
	mode: Annotation<'build' | 'plan'>({
		reducer: (x, y) => y ?? x,
		default: () => 'build',
	}),

	// Plan Mode: Current plan (set by planner, consumed by builder)
	planOutput: Annotation<PlanOutput | null>({
		reducer: (x, y) => (y === undefined ? x : y),
		default: () => null,
	}),

	// Plan Mode: Last plan decision after interrupt resume
	planDecision: Annotation<PlanDecision | null>({
		reducer: (x, y) => (y === undefined ? x : y),
		default: () => null,
	}),

	// Plan Mode: Feedback after modify decision
	planFeedback: Annotation<string | null>({
		reducer: (x, y) => (y === undefined ? x : y),
		default: () => null,
	}),

	// Plan Mode: Previous plan to revise
	planPrevious: Annotation<PlanOutput | null>({
		reducer: (x, y) => (y === undefined ? x : y),
		default: () => null,
	}),

	// Plan Mode: Number of modify iterations (capped to prevent infinite loops)
	planModifyCount: Annotation<number>({
		reducer: (x, y) => y ?? x,
		default: () => 0,
	}),

	// Internal: Conversation within this subgraph
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Output: Found nodes with version, reasoning, connection-changing parameters, and available resources
	nodesFound: Annotation<
		Array<{
			nodeName: string;
			version: number;
			reasoning: string;
			connectionChangingParameters: Array<{
				name: string;
				possibleValues: Array<string | boolean | number>;
			}>;
			availableResources?: Array<{
				value: string;
				displayName: string;
				operations: Array<{
					value: string;
					displayName: string;
				}>;
			}>;
		}>
	>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Best practices documentation
	bestPractices: Annotation<string | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Output: Template IDs fetched from workflow examples for telemetry
	templateIds: Annotation<number[]>({
		reducer: appendArrayReducer,
		default: () => [],
	}),

	// Cached workflow templates (passed from parent, updated by tools)
	cachedTemplates: Annotation<WorkflowMetadata[]>({
		reducer: cachedTemplatesReducer,
		default: () => [],
	}),

	// Cache for resource/operation info to avoid duplicate extraction
	// Key: "nodeName:version", Value: ResourceOperationInfo or null
	resourceOperationCache: Annotation<Record<string, ResourceOperationInfo | null>>({
		reducer: (x, y) => ({ ...x, ...y }),
		default: () => ({}),
	}),

	// Selected nodes context for planner (built from workflowContext.selectedNodes)
	selectedNodesContext: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Retry count for when LLM fails to use tool calls properly
	toolCallRetryCount: Annotation<number>({
		reducer: (x, y) => y ?? x,
		default: () => 0,
	}),
});

export interface DiscoverySubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	plannerLLM: BaseChatModel;
	logger?: Logger;
	featureFlags?: BuilderFeatureFlags;
	/** Optional checkpointer for interrupt/resume support (used in integration tests) */
	checkpointer?: BaseCheckpointSaver;
}

export class DiscoverySubgraph extends BaseSubgraph<
	DiscoverySubgraphConfig,
	typeof DiscoverySubgraphState.State,
	typeof ParentGraphState.State
> {
	name = 'discovery_subgraph';
	description = 'Discovers nodes and context for the workflow';

	private agent!: Runnable;
	private plannerAgent!: ReturnType<typeof createPlannerAgent>;
	private toolMap!: Map<string, StructuredTool>;
	private logger?: Logger;
	private parsedNodeTypes!: INodeTypeDescription[];
	private featureFlags?: BuilderFeatureFlags;

	create(config: DiscoverySubgraphConfig) {
		this.logger = config.logger;
		this.parsedNodeTypes = config.parsedNodeTypes;
		this.featureFlags = config.featureFlags;

		// Check feature flags
		const includeExamples = config.featureFlags?.templateExamples === true;
		const includePlanMode = config.featureFlags?.planMode === true;
		const enableIntrospection = config.featureFlags?.enableIntrospection === true;

		// Create base tools - search_nodes provides all data needed for discovery
		const baseTools: StructuredTool[] = includePlanMode
			? [createNodeSearchTool(config.parsedNodeTypes).tool, submitQuestionsTool]
			: [createNodeSearchTool(config.parsedNodeTypes).tool];

		// Conditionally add introspect tool if feature flag is enabled
		if (enableIntrospection) {
			baseTools.push(createIntrospectTool(config.logger).tool);
		}

		// Conditionally add documentation and workflow examples tools if feature flag is enabled
		const tools = includeExamples
			? [
					...baseTools,
					createGetDocumentationTool().tool,
					createGetWorkflowExamplesTool(config.logger).tool,
				]
			: baseTools;

		this.toolMap = new Map(tools.map((toolInstance) => [toolInstance.name, toolInstance]));

		// Define output tool
		const submitTool = tool(() => {}, {
			name: 'submit_discovery_results',
			description: 'Submit the final discovery results',
			schema: discoveryOutputSchema,
		});

		// Generate prompt based on feature flags
		const discoveryPrompt = buildDiscoveryPrompt({
			includeExamples,
			includeQuestions: includePlanMode,
		});

		// Create agent with tools bound (including submit tool)
		const systemPrompt = ChatPromptTemplate.fromMessages([
			[
				'system',
				[
					{
						type: 'text',
						text: discoveryPrompt,
						cache_control: { type: 'ephemeral' },
					},
				],
			],
			['human', '{prompt}'],
			['placeholder', '{messages}'],
		]);

		if (typeof config.llm.bindTools !== 'function') {
			throw new LLMServiceError('LLM does not support tools', {
				llmModel: config.llm._llmType(),
			});
		}

		// Bind all tools including the output tool
		const allTools = [...tools, submitTool];
		this.agent = systemPrompt.pipe(config.llm.bindTools(allTools));
		this.plannerAgent = createPlannerAgent({
			llm: config.plannerLLM,
			tools: [createGetDocumentationTool().tool],
		});

		// Build the subgraph
		const subgraph = new StateGraph(DiscoverySubgraphState)
			.addNode('discovery_agent', this.callAgent.bind(this))
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			.addNode('format_output', this.formatOutput.bind(this))
			.addNode('reprompt', this.repromptForToolCall.bind(this))
			.addNode('planner', this.plannerNode.bind(this))
			.addEdge(START, 'discovery_agent')
			// Conditional: tools if has tool calls, format_output if submit called, reprompt if no tool calls
			.addConditionalEdges('discovery_agent', this.shouldContinue.bind(this), {
				tools: 'tools',
				format_output: 'format_output',
				reprompt: 'reprompt',
				end: END, // Fallback after max retries
			})
			.addEdge('tools', 'discovery_agent') // After tools, go back to agent
			.addEdge('reprompt', 'discovery_agent') // After reprompt, try agent again
			.addConditionalEdges('format_output', this.shouldPlan.bind(this))
			.addConditionalEdges('planner', this.shouldLoopPlanner.bind(this));

		return subgraph.compile(
			config.checkpointer ? { checkpointer: config.checkpointer } : undefined,
		);
	}

	/**
	 * Agent node - calls discovery agent
	 * Context is already in messages from transformInput
	 */
	private async callAgent(state: typeof DiscoverySubgraphState.State) {
		// Apply cache markers to accumulated messages (for tool loop iterations)
		if (state.messages.length > 0) {
			applySubgraphCacheMarkers(state.messages);
		}

		// Messages already contain context from transformInput
		const response = (await this.agent.invoke({
			messages: state.messages,
			prompt: state.userRequest,
		})) as AIMessage;

		return { messages: [response] };
	}

	/**
	 * Planner node - delegates to the planner agent for plan generation,
	 * interrupt, and decision handling. Skips if plan mode is not active.
	 */
	private async plannerNode(
		state: typeof DiscoverySubgraphState.State,
		runnableConfig?: RunnableConfig,
	) {
		if (!this.featureFlags?.planMode || state.mode !== 'plan' || state.planOutput) {
			return {};
		}

		const result = await invokePlannerNode(
			this.plannerAgent,
			{
				userRequest: state.userRequest || 'Build a workflow',
				discoveryContext: {
					nodesFound: state.nodesFound ?? [],
					bestPractices: state.bestPractices,
				},
				workflowJSON: state.workflowJSON,
				planPrevious: state.planPrevious,
				planFeedback: state.planFeedback,
				selectedNodesContext: state.selectedNodesContext,
			},
			runnableConfig,
		);

		if (result.planDecision === 'modify') {
			return { ...result, planModifyCount: state.planModifyCount + 1 };
		}

		return result;
	}

	private shouldPlan(state: typeof DiscoverySubgraphState.State): 'planner' | typeof END {
		if (!this.featureFlags?.planMode) return END;
		if (state.mode !== 'plan') return END;
		return state.planOutput ? END : 'planner';
	}

	private static readonly MAX_PLAN_MODIFY_ITERATIONS = 5;

	private shouldLoopPlanner(
		state: typeof DiscoverySubgraphState.State,
	): 'discovery_agent' | typeof END {
		if (state.planDecision !== 'modify') return END;
		if (state.planModifyCount >= DiscoverySubgraph.MAX_PLAN_MODIFY_ITERATIONS) {
			this.logger?.warn(
				`[Discovery] Plan modify limit reached (${DiscoverySubgraph.MAX_PLAN_MODIFY_ITERATIONS}), proceeding with last plan`,
			);
			return END;
		}
		return 'discovery_agent';
	}

	/**
	 * Baseline flow control nodes to always include.
	 * These handle common data transformation needs and are available in every workflow.
	 * Reasoning is kept neutral - describes what the node does, not when/how to use it.
	 */
	private readonly BASELINE_NODES = [
		{ name: 'n8n-nodes-base.aggregate', reasoning: 'Combines multiple items into a single item' },
		{
			name: 'n8n-nodes-base.if',
			reasoning: 'Routes items to different output paths based on true/false condition evaluation',
		},
		{
			name: 'n8n-nodes-base.switch',
			reasoning: 'Routes items to different output paths based on rules or expression evaluation',
		},
		{
			name: 'n8n-nodes-base.splitOut',
			reasoning: 'Converts a single item containing an array field into multiple separate items',
		},
		{
			name: 'n8n-nodes-base.merge',
			reasoning: 'Combines data from multiple parallel input branches into a single output',
		},
		{
			name: 'n8n-nodes-base.set',
			reasoning: 'Transforms data by adding, modifying, or removing fields from items',
		},
	];

	/**
	 * Format the output from the submit tool call
	 * Hydrates availableResources for each node using node type definitions.
	 */
	// eslint-disable-next-line complexity
	private formatOutput(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages.at(-1);
		let output: DiscoveryOutput | undefined;
		let submitToolCallId: string | undefined;

		if (lastMessage && isAIMessage(lastMessage) && lastMessage.tool_calls) {
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				submitToolCallId = submitCall.id;
				// Use Zod safeParse for type-safe validation instead of casting
				const parseResult = discoveryOutputSchema.safeParse(submitCall.args);
				if (!parseResult.success) {
					this.logger?.error(
						'[Discovery] Invalid discovery output schema - returning empty results',
						{
							errors: parseResult.error.errors,
							lastMessageContent:
								typeof lastMessage?.content === 'string'
									? lastMessage.content.substring(0, 200)
									: JSON.stringify(lastMessage?.content)?.substring(0, 200),
						},
					);
					return {
						nodesFound: [],
						templateIds: [],
					};
				}
				output = parseResult.data;
			}
		}

		if (!output) {
			this.logger?.error(
				'[Discovery] No submit_discovery_results tool call found - agent may have stopped early',
				{
					messageCount: state.messages.length,
					lastMessageType: lastMessage?.getType(),
				},
			);
			return {
				nodesFound: [],
				templateIds: [],
			};
		}

		// Correct node versions against actual parsedNodeTypes.
		// The LLM may return stale versions from its training data even when
		// search_nodes provided the correct version.
		const latestVersionMap = new Map<string, number>();
		for (const nt of this.parsedNodeTypes) {
			const ver = Array.isArray(nt.version) ? Math.max(...nt.version) : nt.version;
			const existing = latestVersionMap.get(nt.name);
			if (existing === undefined || ver > existing) {
				latestVersionMap.set(nt.name, ver);
			}
		}

		for (const node of output.nodesFound) {
			const latest = latestVersionMap.get(node.nodeName);
			if (latest !== undefined) {
				node.version = latest;
			}
		}

		// Add baseline flow control nodes if not already discovered
		const discoveredNames = new Set(output.nodesFound.map((node) => node.nodeName));
		const baselineNodesToAdd = this.BASELINE_NODES.filter(
			(baselineNode) => !discoveredNames.has(baselineNode.name),
		);

		for (const baselineNode of baselineNodesToAdd) {
			const version = latestVersionMap.get(baselineNode.name);
			if (version !== undefined) {
				output.nodesFound.push({
					nodeName: baselineNode.name,
					version,
					reasoning: baselineNode.reasoning,
					connectionChangingParameters: [],
				});
			}
		}

		// Build lookup map for resource hydration
		const nodeTypeMap = new Map<string, INodeTypeDescription>();
		for (const nt of this.parsedNodeTypes) {
			const versions = Array.isArray(nt.version) ? nt.version : [nt.version];
			for (const v of versions) {
				nodeTypeMap.set(`${nt.name}:${v}`, nt);
			}
		}

		// Get the resource operation cache from state
		const existingCache = state.resourceOperationCache ?? {};

		// Hydrate nodesFound with availableResources from node type definitions or cache
		const hydratedNodesFound = output.nodesFound.map((node) => {
			const cacheKey = createResourceCacheKey(node.nodeName, node.version);

			// Check cache first (populated by node_details tool during discovery)
			if (cacheKey in existingCache) {
				const cached = existingCache[cacheKey];
				if (cached) {
					return {
						...node,
						availableResources: cached.resources,
					};
				}
				// Cached as null means no resources for this node
				return node;
			}

			// Cache miss - extract fresh (O(1) lookup using pre-built map)
			const nodeType = nodeTypeMap.get(cacheKey);

			if (!nodeType) {
				this.logger?.warn(
					`[Discovery] Node type not found during resource hydration ${node.nodeName}:${node.version}`,
					{
						nodeName: node.nodeName,
						nodeVersion: node.version,
					},
				);
				return node;
			}

			// Extract resource/operation info
			const resourceOpInfo = extractResourceOperations(nodeType, node.version, this.logger);

			if (!resourceOpInfo) {
				return node;
			}

			// Add availableResources to the node
			return {
				...node,
				availableResources: resourceOpInfo.resources,
			};
		});

		// Add a ToolMessage for the submit_discovery_results call that was routed here
		// instead of through the tools node. This keeps the message history valid for
		// the Anthropic API (every tool_use must have a matching tool_result).
		const toolResponseMessages = submitToolCallId
			? [
					new ToolMessage({
						content: `Discovery complete: found ${hydratedNodesFound.length} nodes.`,
						tool_call_id: submitToolCallId,
					}),
				]
			: [];

		// Return hydrated output with best practices from state (updated by get_documentation tool)
		return {
			nodesFound: hydratedNodesFound,
			bestPractices: state.bestPractices,
			templateIds: state.templateIds ?? [],
			messages: toolResponseMessages,
		};
	}

	/**
	 * Should continue with tools or finish?
	 */
	private shouldContinue(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages[state.messages.length - 1];

		if (
			lastMessage &&
			isAIMessage(lastMessage) &&
			lastMessage.tool_calls &&
			lastMessage.tool_calls.length > 0
		) {
			// Check if the submit tool was called
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				return 'format_output';
			}
			return 'tools';
		}

		// No tool calls = agent may have output text instead of using tool calling API
		// This can happen when the model outputs XML-style invocations as text
		// Allow one retry to reprompt the agent to use proper tool calls
		const MAX_TOOL_CALL_RETRIES = 1;
		if (state.toolCallRetryCount < MAX_TOOL_CALL_RETRIES) {
			this.logger?.warn(
				'[Discovery] Agent stopped without tool calls - will reprompt to use submit_discovery_results tool',
				{
					retryCount: state.toolCallRetryCount,
					lastMessageContent:
						typeof lastMessage?.content === 'string'
							? lastMessage.content.substring(0, 200)
							: undefined,
				},
			);
			return 'reprompt';
		}

		// Max retries exceeded - give up
		this.logger?.error(
			'[Discovery] Agent failed to use tool calls after retry - check if LLM is producing valid tool calls',
			{
				retryCount: state.toolCallRetryCount,
			},
		);
		return 'end';
	}

	/**
	 * Reprompt the agent to use the tool calling API instead of text output
	 */
	private repromptForToolCall(state: typeof DiscoverySubgraphState.State) {
		const repromptMessage = new HumanMessage({
			content:
				'You must use the submit_discovery_results tool to submit your results. Do not output the results as text or XML - use the actual tool call. The downstream system can only process results submitted via the tool calling API, not text output. Please call the submit_discovery_results tool now with your nodesFound array.',
		});

		return {
			messages: [repromptMessage],
			toolCallRetryCount: state.toolCallRetryCount + 1,
		};
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		const userRequest = extractUserRequest(parentState.messages, 'Build a workflow');

		// Build context parts for Discovery
		const contextParts: string[] = [];

		// 1. User request (primary)
		contextParts.push('<user_request>');
		contextParts.push(userRequest);
		contextParts.push('</user_request>');

		const selectedNodesSummary = buildSelectedNodesSummary(parentState.workflowContext);
		if (selectedNodesSummary) {
			contextParts.push('=== SELECTED NODES ===');
			contextParts.push('<selected_nodes>');
			contextParts.push(selectedNodesSummary);
			contextParts.push(
				'When user says "add X before/after this", find nodes that work well with the selected node(s).',
			);
			contextParts.push('</selected_nodes>');
		}

		if (parentState.workflowJSON.nodes.length > 0) {
			contextParts.push('<existing_workflow_summary>');
			contextParts.push(buildWorkflowSummary(parentState.workflowJSON));
			contextParts.push('</existing_workflow_summary>');
		}

		// Create initial message with context
		const contextMessage = createContextMessage(contextParts);

		return {
			userRequest,
			workflowJSON: parentState.workflowJSON,
			mode: parentState.mode,
			planOutput: parentState.planOutput,
			planDecision: null,
			planFeedback: parentState.planFeedback ?? null,
			planPrevious: parentState.planPrevious ?? null,
			selectedNodesContext: selectedNodesSummary ?? '',
			messages: [contextMessage], // Context already in messages
			cachedTemplates: parentState.cachedTemplates,
		};
	}

	transformOutput(
		subgraphOutput: typeof DiscoverySubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		const nodesFound = subgraphOutput.nodesFound || [];
		const templateIds = subgraphOutput.templateIds || [];
		const discoveryContext: DiscoveryContext = {
			nodesFound,
			bestPractices: subgraphOutput.bestPractices,
		};

		// Create coordination log entry (not a message)
		const logEntry: CoordinationLogEntry = {
			phase: 'discovery',
			status: 'completed',
			timestamp: Date.now(),
			summary: `Discovered ${nodesFound.length} nodes`,
			metadata: createDiscoveryMetadata({
				nodesFound: nodesFound.length,
				nodeTypes: nodesFound.map((node) => node.nodeName),
				hasBestPractices: !!subgraphOutput.bestPractices,
			}),
		};

		// Extract tool-related messages for persistence (skip the first context message).
		// This allows the frontend to restore UI state after page refresh.
		const toolMessages = extractToolMessagesForPersistence(subgraphOutput.messages);

		// If the modify-loop cap was reached, the subgraph exited with the
		// last plan but planDecision is still 'modify'. Clear it so the
		// parent router doesn't send the flow back to discovery again,
		// which would reset the subgraph-local counter and bypass the cap.
		const cappedModify =
			subgraphOutput.planDecision === 'modify' &&
			subgraphOutput.planModifyCount >= DiscoverySubgraph.MAX_PLAN_MODIFY_ITERATIONS;

		// Extract introspection events from subgraph messages
		const introspectionEvents = extractIntrospectionEventsFromMessages(subgraphOutput.messages);

		return {
			discoveryContext,
			coordinationLog: [logEntry],
			// Pass template IDs for telemetry
			templateIds,
			// Propagate cached templates back to parent
			cachedTemplates: subgraphOutput.cachedTemplates,
			planOutput: subgraphOutput.planOutput,
			planDecision: cappedModify ? null : subgraphOutput.planDecision,
			planFeedback: subgraphOutput.planFeedback,
			planPrevious: subgraphOutput.planPrevious,
			...(subgraphOutput.mode ? { mode: subgraphOutput.mode } : {}),
			introspectionEvents,
			// Include tool messages for persistence to restore frontend state on refresh
			messages: toolMessages,
		};
	}
}
