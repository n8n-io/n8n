import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, isAIMessage, HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { LLMServiceError } from '@/errors';
import {
	buildDiscoveryPrompt,
	buildPlannerPrompt,
	buildPlannerContextMessage,
	formatTechniqueList,
	formatExampleCategorizations,
} from '@/prompts/agents/discovery.prompt';
import {
	extractResourceOperations,
	createResourceCacheKey,
	type ResourceOperationInfo,
} from '@/utils/resource-operation-extractor';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createGetDocumentationTool } from '../tools/get-documentation.tool';
import { createGetWorkflowExamplesTool } from '../tools/get-workflow-examples.tool';
import { createNodeDetailsTool } from '../tools/node-details.tool';
import { createNodeSearchTool } from '../tools/node-search.tool';
import {
	createSubmitQuestionsTool,
	createSubmitPlanTool,
	submitQuestionsSchema,
	submitPlanSchema,
	SUBMIT_QUESTIONS_TOOL,
	SUBMIT_PLAN_TOOL,
} from '../tools/planner-tools';
import { extractConnectionChangingParameters } from '../tools/utils/connection.utils';
import type { CoordinationLogEntry } from '../types/coordination';
import { createDiscoveryMetadata, createPlannerMetadata } from '../types/coordination';
import type {
	PlannerQuestion,
	PlanOutput,
	QuestionResponse,
	PlannerInputMode,
} from '../types/planner-types';
import type { WorkflowMetadata } from '../types/tools';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import { buildWorkflowSummary, createContextMessage } from '../utils/context-builders';
import { appendArrayReducer, cachedTemplatesReducer } from '../utils/state-reducers';
import { executeSubgraphTools } from '../utils/subgraph-helpers';

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

/**
 * Question phase within the discovery/planner flow.
 * Tracks where we are in the Q&A and planning flow.
 */
export type DiscoveryQuestionPhase =
	| 'discovery' // Standard discovery mode (no questions)
	| 'analyzing' // Analyzing the initial request (plan mode)
	| 'asking' // Questions generated, waiting to emit (plan mode)
	| 'planning' // Generating the plan (plan mode)
	| 'complete'; // Done

/**
 * Discovery Subgraph State
 *
 * Unified state for both discovery (build mode) and planning (plan mode).
 * In build mode: discovers nodes without asking questions
 * In plan mode: asks clarifying questions, then generates a plan with discovery context
 */
export const DiscoverySubgraphState = Annotation.Root({
	// ========================================================================
	// Input fields
	// ========================================================================

	// Input: What the user wants to build
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Input: Mode of operation
	mode: Annotation<'build' | 'plan'>({
		reducer: (x, y) => y ?? x,
		default: () => 'build',
	}),

	// Input: Plan mode sub-mode (fresh, with_answers, refine)
	plannerInputMode: Annotation<PlannerInputMode>({
		reducer: (x, y) => y ?? x,
		default: () => 'fresh',
	}),

	// Input: Existing workflow summary for context
	existingWorkflowSummary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Input: Existing plan for refinement mode
	existingPlan: Annotation<PlanOutput | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// ========================================================================
	// Internal state
	// ========================================================================

	// Internal: Conversation within this subgraph
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Internal: Current phase in the question flow (plan mode)
	questionPhase: Annotation<DiscoveryQuestionPhase>({
		reducer: (x, y) => y ?? x,
		default: () => 'discovery',
	}),

	// Internal: User's previous questions (for answer context)
	previousQuestions: Annotation<PlannerQuestion[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Internal: User's answers to questions (plan mode)
	answers: Annotation<QuestionResponse[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// ========================================================================
	// Output fields
	// ========================================================================

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

	// Output: Generated questions (plan mode)
	questions: Annotation<PlannerQuestion[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Intro message before questions (plan mode)
	introMessage: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Output: Generated plan (plan mode)
	plan: Annotation<PlanOutput | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// ========================================================================
	// Cached/passed-through fields
	// ========================================================================

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
});

export interface DiscoverySubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	/** Separate LLM for plan mode (defaults to llm if not provided) */
	llmPlanner?: BaseChatModel;
	logger?: Logger;
	featureFlags?: BuilderFeatureFlags;
}

export class DiscoverySubgraph extends BaseSubgraph<
	DiscoverySubgraphConfig,
	typeof DiscoverySubgraphState.State,
	typeof ParentGraphState.State
> {
	name = 'discovery_subgraph';
	description = 'Discovers nodes and context for the workflow (unified with plan mode)';

	private discoveryAgent!: Runnable;
	private plannerAgent!: Runnable;
	private toolMap!: Map<string, StructuredTool>;
	private logger?: Logger;
	private parsedNodeTypes!: INodeTypeDescription[];

	create(config: DiscoverySubgraphConfig) {
		this.logger = config.logger;
		this.parsedNodeTypes = config.parsedNodeTypes;

		// Check if template examples are enabled
		const includeExamples = config.featureFlags?.templateExamples === true;

		// Create base discovery tools (shared between discovery and plan mode)
		const baseTools = [
			createGetDocumentationTool(),
			createNodeSearchTool(config.parsedNodeTypes),
			createNodeDetailsTool(config.parsedNodeTypes, config.logger),
		];

		// Conditionally add workflow examples tool if feature flag is enabled
		const tools = includeExamples
			? [...baseTools, createGetWorkflowExamplesTool(config.logger)]
			: baseTools;

		// Build tool map for execution (discovery tools only - output tools don't need execution)
		this.toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));

		// ========================================================================
		// Discovery Mode Agent (build mode - NEVER asks questions)
		// ========================================================================

		// Define discovery output tool
		const submitDiscoveryTool = tool(() => {}, {
			name: 'submit_discovery_results',
			description: 'Submit the final discovery results',
			schema: discoveryOutputSchema,
		});

		// Generate discovery prompt
		const discoveryPrompt = buildDiscoveryPrompt({ includeExamples });

		// Create discovery agent with tools bound
		const discoverySystemPrompt = ChatPromptTemplate.fromMessages([
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

		// Discovery tools: discovery tools + submit_discovery_results
		const discoveryAllTools = [...tools.map((bt) => bt.tool), submitDiscoveryTool];
		this.discoveryAgent = discoverySystemPrompt.pipe(config.llm.bindTools(discoveryAllTools));

		// ========================================================================
		// Planner Mode Agent (plan mode - SHOULD ask questions)
		// ========================================================================

		// Create planner-specific output tools
		const submitQuestionsTool = createSubmitQuestionsTool();
		const submitPlanTool = createSubmitPlanTool();

		// Generate planner prompt
		const plannerPrompt = buildPlannerPrompt({ includeExamples });

		// Create planner agent with tools bound
		const plannerSystemPrompt = ChatPromptTemplate.fromMessages([
			[
				'system',
				[
					{
						type: 'text',
						text: plannerPrompt,
						cache_control: { type: 'ephemeral' },
					},
				],
			],
			['human', '{prompt}'],
			['placeholder', '{messages}'],
		]);

		// Use separate LLM for planner if provided, otherwise fall back to discovery LLM
		const plannerLLM = config.llmPlanner ?? config.llm;

		if (typeof plannerLLM.bindTools !== 'function') {
			throw new LLMServiceError('Planner LLM does not support tools', {
				llmModel: plannerLLM._llmType(),
			});
		}

		// Planner tools: discovery tools + submit_questions + submit_plan
		const plannerAllTools = [...tools.map((bt) => bt.tool), submitQuestionsTool, submitPlanTool];
		this.plannerAgent = plannerSystemPrompt.pipe(plannerLLM.bindTools(plannerAllTools));

		// ========================================================================
		// Build the unified subgraph
		// ========================================================================

		const subgraph = new StateGraph(DiscoverySubgraphState)
			.addNode('agent', this.callAgent.bind(this))
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			.addNode('format_output', this.formatOutput.bind(this))
			.addNode('format_questions', this.formatQuestions.bind(this))
			.addNode('format_plan', this.formatPlan.bind(this))
			.addEdge('__start__', 'agent')
			// Conditional routing based on which output tool was called
			.addConditionalEdges('agent', this.shouldContinue.bind(this), {
				tools: 'tools',
				format_output: 'format_output',
				format_questions: 'format_questions',
				format_plan: 'format_plan',
				end: END,
			})
			.addEdge('tools', 'agent')
			.addEdge('format_output', END)
			.addEdge('format_questions', END) // HITL pause - questions generated
			.addEdge('format_plan', 'format_output'); // Plan goes through format_output for hydration

		return subgraph.compile();
	}

	/**
	 * Agent node - calls the appropriate agent based on mode
	 * Context is already in messages from transformInput
	 */
	private async callAgent(state: typeof DiscoverySubgraphState.State) {
		// Apply cache markers to accumulated messages (for tool loop iterations)
		if (state.messages.length > 0) {
			applySubgraphCacheMarkers(state.messages);
		}

		if (state.mode === 'plan') {
			// Plan mode: Use planner agent with context message
			const context = buildPlannerContextMessage({
				userRequest: state.userRequest,
				existingWorkflowSummary: state.existingWorkflowSummary || undefined,
				previousPlan: state.existingPlan
					? this.formatPlanForContext(state.existingPlan)
					: undefined,
				userAnswers: this.formatAnswersForContext(state.previousQuestions, state.answers),
			});

			const response = (await this.plannerAgent.invoke({
				messages: state.messages,
				prompt: context,
				techniques: formatTechniqueList(),
				exampleCategorizations: formatExampleCategorizations(),
			})) as AIMessage;

			return { messages: [response] };
		}

		// Build mode: Use discovery agent with techniques
		const response = (await this.discoveryAgent.invoke({
			messages: state.messages,
			prompt: state.userRequest,
			techniques: formatTechniqueList(),
			exampleCategorizations: formatExampleCategorizations(),
		})) as AIMessage;

		return { messages: [response] };
	}

	/**
	 * Format the output from the submit tool call or plan hydration.
	 * Hydrates availableResources for each node using node type definitions.
	 */
	private formatOutput(state: typeof DiscoverySubgraphState.State) {
		// If we have a plan (from format_plan), hydrate its nodes
		if (state.plan) {
			return this.hydrateNodesFromPlan(state);
		}

		// Standard discovery output
		const lastMessage = state.messages.at(-1);
		let output: z.infer<typeof discoveryOutputSchema> | undefined;

		if (lastMessage && isAIMessage(lastMessage) && lastMessage.tool_calls) {
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
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

		// Hydrate nodesFound with availableResources
		const hydratedNodesFound = this.hydrateNodes(output.nodesFound, state.resourceOperationCache);

		// Return hydrated output with best practices from state (updated by get_documentation tool)
		return {
			nodesFound: hydratedNodesFound,
			bestPractices: state.bestPractices,
			templateIds: state.templateIds ?? [],
		};
	}

	/**
	 * Format questions from the submit_questions tool call (plan mode)
	 */
	private formatQuestions(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages.at(-1);

		if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls) {
			return {
				questions: [],
				questionPhase: 'complete' as DiscoveryQuestionPhase,
			};
		}

		const questionsCall = lastMessage.tool_calls.find(
			(tc) => tc.name === SUBMIT_QUESTIONS_TOOL.toolName,
		);

		if (!questionsCall) {
			return {
				questions: [],
				questionPhase: 'complete' as DiscoveryQuestionPhase,
			};
		}

		// Validate with schema
		const parseResult = submitQuestionsSchema.safeParse(questionsCall.args);
		if (!parseResult.success) {
			this.logger?.error('[Discovery/Planner] Invalid questions schema', {
				errors: parseResult.error.errors,
			});
			return {
				questions: [],
				questionPhase: 'complete' as DiscoveryQuestionPhase,
			};
		}

		const { questions, introMessage } = parseResult.data;

		// Convert to PlannerQuestion format
		const plannerQuestions: PlannerQuestion[] = questions.map((q) => ({
			id: q.id,
			question: q.question,
			type: q.type,
			options: q.options,
			allowCustom: q.allowCustom ?? true,
		}));

		return {
			questions: plannerQuestions,
			introMessage: introMessage ?? '',
			questionPhase: 'asking' as DiscoveryQuestionPhase,
		};
	}

	/**
	 * Format plan from the submit_plan tool call (plan mode)
	 */
	private formatPlan(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages.at(-1);

		if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls) {
			return {
				plan: null,
				questionPhase: 'complete' as DiscoveryQuestionPhase,
			};
		}

		const planCall = lastMessage.tool_calls.find((tc) => tc.name === SUBMIT_PLAN_TOOL.toolName);

		if (!planCall) {
			return {
				plan: null,
				questionPhase: 'complete' as DiscoveryQuestionPhase,
			};
		}

		// Validate with schema
		const parseResult = submitPlanSchema.safeParse(planCall.args);
		if (!parseResult.success) {
			this.logger?.error('[Discovery/Planner] Invalid plan schema', {
				errors: parseResult.error.errors,
			});
			return {
				plan: null,
				questionPhase: 'complete' as DiscoveryQuestionPhase,
			};
		}

		const planData = parseResult.data;

		// Build PlanOutput
		const plan: PlanOutput = {
			summary: planData.summary,
			trigger: planData.trigger,
			steps: planData.steps.map((s) => ({
				description: s.description,
				subSteps: s.subSteps,
				suggestedNodes: s.suggestedNodes,
			})),
			additionalSpecs: planData.additionalSpecs,
		};

		return {
			plan,
			questionPhase: 'complete' as DiscoveryQuestionPhase,
		};
	}

	// ========================================================================
	// Hydration Helpers
	// ========================================================================

	/**
	 * Hydrate nodes with availableResources from node type definitions or cache.
	 */
	private hydrateNodes(
		nodes: Array<{
			nodeName: string;
			version: number;
			reasoning: string;
			connectionChangingParameters: Array<{
				name: string;
				possibleValues: Array<string | boolean | number>;
			}>;
		}>,
		existingCache: Record<string, ResourceOperationInfo | null>,
	) {
		// Build lookup map for resource hydration
		const nodeTypeMap = new Map<string, INodeTypeDescription>();
		for (const nt of this.parsedNodeTypes) {
			const versions = Array.isArray(nt.version) ? nt.version : [nt.version];
			for (const v of versions) {
				nodeTypeMap.set(`${nt.name}:${v}`, nt);
			}
		}

		// Hydrate nodesFound with availableResources from node type definitions or cache
		return nodes.map((node) => {
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
				this.logger?.warn('[Discovery] Node type not found during resource hydration', {
					nodeName: node.nodeName,
					nodeVersion: node.version,
				});
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
	}

	/**
	 * Hydrate nodes from plan suggestions.
	 * Mirrors the hydration logic from the old planner.subgraph.ts buildDiscoveryContextFromPlan().
	 */
	private hydrateNodesFromPlan(state: typeof DiscoverySubgraphState.State) {
		const plan = state.plan!;
		const suggestedNodes = new Set<string>();

		for (const step of plan.steps) {
			if (step.suggestedNodes) {
				step.suggestedNodes.forEach((n) => suggestedNodes.add(n));
			}
		}

		if (suggestedNodes.size === 0) {
			return {
				nodesFound: [],
				plan,
				questionPhase: 'complete' as DiscoveryQuestionPhase,
			};
		}

		// Build lookup maps for node types
		// Plan may have display names ("HTTP Request") or internal names ("n8n-nodes-base.httpRequest")
		const nodeTypeByInternalName = new Map<string, INodeTypeDescription>();
		const nodeTypeByDisplayName = new Map<string, INodeTypeDescription>();

		for (const nt of this.parsedNodeTypes) {
			const ntMaxVersion = Array.isArray(nt.version) ? Math.max(...nt.version) : nt.version;

			// Store by internal name - keep the one with highest version
			const existingByName = nodeTypeByInternalName.get(nt.name);
			if (!existingByName) {
				nodeTypeByInternalName.set(nt.name, nt);
			} else {
				const existingMaxVersion = Array.isArray(existingByName.version)
					? Math.max(...existingByName.version)
					: existingByName.version;
				if (ntMaxVersion > existingMaxVersion) {
					nodeTypeByInternalName.set(nt.name, nt);
				}
			}

			// Store by display name (e.g., "HTTP Request") - keep the one with highest version
			const displayKey = nt.displayName.toLowerCase();
			const existingByDisplay = nodeTypeByDisplayName.get(displayKey);
			if (!existingByDisplay) {
				nodeTypeByDisplayName.set(displayKey, nt);
			} else {
				const existingMaxVersion = Array.isArray(existingByDisplay.version)
					? Math.max(...existingByDisplay.version)
					: existingByDisplay.version;
				if (ntMaxVersion > existingMaxVersion) {
					nodeTypeByDisplayName.set(displayKey, nt);
				}
			}
		}

		// Debug: Log available node names for troubleshooting
		this.logger?.debug('[Discovery/Planner] Hydration lookup maps built', {
			internalNameCount: nodeTypeByInternalName.size,
			displayNameCount: nodeTypeByDisplayName.size,
			suggestedNodes: Array.from(suggestedNodes),
		});

		// Hydrate nodesFound with actual versions, available resources, and connection-changing parameters
		const nodesFound = Array.from(suggestedNodes).map((nodeName) => {
			// Try multiple matching strategies:
			// 1. Exact internal name match (e.g., "n8n-nodes-base.httpRequest")
			// 2. Exact display name match, case-insensitive (e.g., "HTTP Request")
			// 3. Partial display name match (e.g., "Form Trigger" matches "n8n Form Trigger")
			let nodeType =
				nodeTypeByInternalName.get(nodeName) ?? nodeTypeByDisplayName.get(nodeName.toLowerCase());

			// Try partial match if exact match fails
			if (!nodeType) {
				const nodeNameLower = nodeName.toLowerCase();
				for (const [displayName, nt] of nodeTypeByDisplayName) {
					// Check if suggested name contains the display name or vice versa
					if (displayName.includes(nodeNameLower) || nodeNameLower.includes(displayName)) {
						nodeType = nt;
						this.logger?.debug('[Discovery/Planner] Partial match found', {
							suggestedName: nodeName,
							matchedDisplayName: displayName,
						});
						break;
					}
				}
			}

			if (!nodeType) {
				// Log more details for debugging
				this.logger?.warn('[Discovery/Planner] Node type not found during hydration', {
					nodeName,
					nodeNameLower: nodeName.toLowerCase(),
					triedInternalName: nodeTypeByInternalName.has(nodeName),
					triedDisplayName: nodeTypeByDisplayName.has(nodeName.toLowerCase()),
				});
				return {
					nodeName,
					version: 1,
					reasoning: 'Suggested in plan step',
					connectionChangingParameters: [] as Array<{
						name: string;
						possibleValues: Array<string | boolean | number>;
					}>,
				};
			}

			// Use the internal name for consistency with discovery output
			const internalName = nodeType.name;

			// Get the highest/latest version
			const versions = Array.isArray(nodeType.version) ? nodeType.version : [nodeType.version];
			const latestVersion = Math.max(...versions);

			// Extract resource/operation info
			const resourceOpInfo = extractResourceOperations(nodeType, latestVersion, this.logger);

			// Extract connection-changing parameters from inputs/outputs expressions
			const connectionChangingParameters = extractConnectionChangingParameters(nodeType);

			return {
				nodeName: internalName,
				version: latestVersion,
				reasoning: 'Suggested in plan step',
				connectionChangingParameters,
				...(resourceOpInfo && { availableResources: resourceOpInfo.resources }),
			};
		});

		return {
			nodesFound,
			plan,
			questionPhase: 'complete' as DiscoveryQuestionPhase,
		};
	}

	/**
	 * Should continue with tools or finish?
	 * Routes to appropriate format node based on which output tool was called.
	 */
	private shouldContinue(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages[state.messages.length - 1];

		if (
			lastMessage &&
			isAIMessage(lastMessage) &&
			lastMessage.tool_calls &&
			lastMessage.tool_calls.length > 0
		) {
			// In plan mode, check for planner output tools first
			if (state.mode === 'plan') {
				// Check for submit_questions
				const questionsCall = lastMessage.tool_calls.find(
					(tc) => tc.name === SUBMIT_QUESTIONS_TOOL.toolName,
				);
				if (questionsCall) {
					return 'format_questions';
				}

				// Check for submit_plan
				const planCall = lastMessage.tool_calls.find((tc) => tc.name === SUBMIT_PLAN_TOOL.toolName);
				if (planCall) {
					return 'format_plan';
				}
			}

			// Check for discovery submit tool
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				return 'format_output';
			}

			// Other tools - execute them
			return 'tools';
		}

		// No tool calls = agent is done (or failed to call tool)
		this.logger?.warn(
			'[Discovery] Agent stopped without calling an output tool - check if LLM is producing valid tool calls',
			{ mode: state.mode },
		);
		return 'end';
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		// Extract user request, filtering out answer messages in plan mode
		const userRequest = this.extractOriginalUserRequest(
			parentState.messages,
			parentState.mode === 'plan' ? parentState.pendingQuestions : undefined,
		);

		// Build context parts for Discovery
		const contextParts: string[] = [];

		// 1. User request (primary)
		contextParts.push('<user_request>');
		contextParts.push(userRequest);
		contextParts.push('</user_request>');

		// 2. Current workflow summary (just node names, to know what exists)
		let existingWorkflowSummary = '';
		if (parentState.workflowJSON.nodes.length > 0) {
			existingWorkflowSummary = buildWorkflowSummary(parentState.workflowJSON);
			contextParts.push('<existing_workflow_summary>');
			contextParts.push(existingWorkflowSummary);
			contextParts.push('</existing_workflow_summary>');
		}

		// Create initial message with context
		const contextMessage = createContextMessage(contextParts);

		// Base input (build mode)
		const baseInput = {
			userRequest,
			messages: [contextMessage],
			cachedTemplates: parentState.cachedTemplates,
			existingWorkflowSummary,
		};

		// Build mode: simple discovery
		if (parentState.mode !== 'plan') {
			return {
				...baseInput,
				mode: 'build' as const,
			};
		}

		// Plan mode: determine sub-mode (fresh, with_answers, refine)
		let plannerInputMode: PlannerInputMode = 'fresh';
		let answers: QuestionResponse[] = [];

		// Check if this is an answers submission
		const lastMessage = parentState.messages.at(-1);
		if (lastMessage && this.isAnswersMessage(lastMessage)) {
			plannerInputMode = 'with_answers';
			answers = this.parseAnswersFromMessage(lastMessage);
		} else if (parentState.planOutput && parentState.plannerPhase === 'plan_displayed') {
			// Has existing plan and user sent new message = refinement
			plannerInputMode = 'refine';
		}

		return {
			...baseInput,
			mode: 'plan' as const,
			plannerInputMode,
			answers,
			previousQuestions: parentState.pendingQuestions ?? [],
			existingPlan: parentState.planOutput ?? null,
		};
	}

	transformOutput(
		subgraphOutput: typeof DiscoverySubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		const nodesFound = subgraphOutput.nodesFound || [];
		const templateIds = subgraphOutput.templateIds || [];
		const discoveryContext = {
			nodesFound,
			bestPractices: subgraphOutput.bestPractices,
		};

		// Base output
		const baseOutput: Partial<typeof ParentGraphState.State> = {
			discoveryContext,
			templateIds,
			cachedTemplates: subgraphOutput.cachedTemplates,
		};

		// Build mode: standard discovery output
		if (subgraphOutput.mode !== 'plan') {
			const logEntry: CoordinationLogEntry = {
				phase: 'discovery',
				status: 'completed',
				timestamp: Date.now(),
				summary: `Discovered ${nodesFound.length} nodes`,
				metadata: createDiscoveryMetadata({
					nodesFound: nodesFound.length,
					nodeTypes: nodesFound.map((n) => n.nodeName),
					hasBestPractices: !!subgraphOutput.bestPractices,
				}),
			};

			return {
				...baseOutput,
				coordinationLog: [logEntry],
			};
		}

		// Plan mode: include planner outputs
		const { questions, answers, questionPhase, plan, introMessage } = subgraphOutput;

		// Determine planner phase for parent state
		let plannerPhase: 'idle' | 'waiting_for_answers' | 'plan_displayed' = 'idle';

		if (questionPhase === 'asking' && questions.length > 0) {
			plannerPhase = 'waiting_for_answers';
		} else if (plan) {
			plannerPhase = 'plan_displayed';
		}

		// Add discovery context to plan if generated
		const planWithContext: PlanOutput | null = plan ? { ...plan, discoveryContext } : null;

		// Create coordination log entry
		const logEntry: CoordinationLogEntry = {
			phase: 'planner',
			status: 'completed',
			timestamp: Date.now(),
			summary: plan
				? `Generated plan with ${plan.steps.length} steps`
				: `Generated ${questions.length} questions`,
			metadata: createPlannerMetadata({
				questionsAsked: questions.length,
				questionsAnswered: answers.filter((a) => !a.skipped).length,
				questionsSkipped: answers.filter((a) => a.skipped).length,
				planGenerated: !!plan,
			}),
		};

		// Create special AIMessage for session persistence
		// These messages are detected by formatMessages() and converted to proper types
		const planModeMessages: AIMessage[] = [];

		if (plannerPhase === 'waiting_for_answers' && questions.length > 0) {
			// Add questions as an AIMessage for persistence
			planModeMessages.push(
				new AIMessage({
					content: JSON.stringify({
						type: 'questions',
						introMessage: introMessage ?? '',
						questions: questions.map((q) => ({
							id: q.id,
							question: q.question,
							type: q.type,
							options: q.options,
							allowCustom: q.allowCustom,
						})),
					}),
					additional_kwargs: {
						messageType: 'questions',
					},
				}),
			);
		} else if (plannerPhase === 'plan_displayed' && planWithContext) {
			// Add plan as an AIMessage for persistence
			planModeMessages.push(
				new AIMessage({
					content: JSON.stringify({
						type: 'plan',
						plan: {
							summary: planWithContext.summary,
							trigger: planWithContext.trigger,
							steps: planWithContext.steps.map((s) => ({
								description: s.description,
								subSteps: s.subSteps,
								suggestedNodes: s.suggestedNodes,
							})),
							additionalSpecs: planWithContext.additionalSpecs,
						},
					}),
					additional_kwargs: {
						messageType: 'plan',
					},
				}),
			);
		}

		return {
			...baseOutput,
			...(planModeMessages.length > 0 && { messages: planModeMessages }),
			pendingQuestions: questions,
			introMessage: introMessage ?? '',
			planOutput: planWithContext,
			plannerPhase,
			coordinationLog: [logEntry],
		};
	}

	// ========================================================================
	// Plan Mode Helper Methods
	// ========================================================================

	/**
	 * Check if a message is an answers submission.
	 * Expects structured JSON: { "type": "question_answers", "answers": [...] }
	 */
	private isAnswersMessage(message: BaseMessage | undefined): boolean {
		if (!message) return false;

		const content = message.content;
		if (typeof content !== 'string') return false;

		try {
			const parsed = JSON.parse(content) as { type?: string };
			return parsed.type === 'question_answers';
		} catch {
			return false;
		}
	}

	/**
	 * Parse answers from a message
	 */
	private parseAnswersFromMessage(message: BaseMessage): QuestionResponse[] {
		const content = message.content;
		if (typeof content === 'string') {
			try {
				const parsed = JSON.parse(content) as { answers?: QuestionResponse[] };
				if (parsed.answers && Array.isArray(parsed.answers)) {
					return parsed.answers;
				}
			} catch {
				// Not JSON
			}
		}
		return [];
	}

	/**
	 * Format existing plan for context (used in refinement mode)
	 */
	private formatPlanForContext(plan: PlanOutput): string {
		const parts: string[] = [];
		parts.push(`Summary: ${plan.summary}`);
		parts.push(`Trigger: ${plan.trigger}`);
		parts.push('Steps:');
		plan.steps.forEach((step, i) => {
			parts.push(`${i + 1}. ${step.description}`);
			if (step.subSteps?.length) {
				step.subSteps.forEach((sub) => parts.push(`   - ${sub}`));
			}
		});
		if (plan.additionalSpecs?.length) {
			parts.push('Additional specs:');
			plan.additionalSpecs.forEach((spec) => parts.push(`- ${spec}`));
		}
		return parts.join('\n');
	}

	/**
	 * Format answers for context message (used when generating plan after Q&A)
	 */
	private formatAnswersForContext(
		questions: PlannerQuestion[],
		answers: QuestionResponse[],
	): Array<{ question: string; answer: string }> | undefined {
		if (!answers.length) return undefined;

		const result: Array<{ question: string; answer: string }> = [];

		for (const answer of answers) {
			if (answer.skipped) continue;

			const question = questions.find((q) => q.id === answer.questionId);
			if (!question) continue;

			let answerText = '';
			if (answer.selectedOptions?.length) {
				answerText = answer.selectedOptions.join(', ');
			}
			if (answer.customValue) {
				answerText = answerText ? `${answerText}, ${answer.customValue}` : answer.customValue;
			}

			result.push({
				question: question.question,
				answer: answerText,
			});
		}

		return result.length > 0 ? result : undefined;
	}

	/**
	 * Extract the original user request, intelligently filtering out answer messages.
	 *
	 * In plan mode, subsequent HumanMessages may be answers to questions, not new requests.
	 * We detect answers by checking if the message contains question text from pendingQuestions.
	 *
	 * @param messages - All messages in the conversation
	 * @param pendingQuestions - Questions that were asked (used to detect answer messages)
	 */
	private extractOriginalUserRequest(
		messages: BaseMessage[],
		pendingQuestions?: PlannerQuestion[],
	): string {
		const humanMessages = messages.filter(
			(m): m is HumanMessage =>
				m instanceof HumanMessage && typeof m.content === 'string' && m.content.trim() !== '',
		);

		if (humanMessages.length === 0) {
			return 'Build a workflow';
		}

		// If no pending questions, use standard behavior (last message for iterations)
		if (!pendingQuestions || pendingQuestions.length === 0) {
			const lastMessage = humanMessages[humanMessages.length - 1];
			return lastMessage.content as string;
		}

		// Filter out messages that look like answers to pending questions
		// An answer typically contains the question text (e.g., "What's your location?: New York")
		const questionTexts = pendingQuestions.map((q) => q.question.toLowerCase());

		const nonAnswerMessages = humanMessages.filter((m) => {
			const content = (m.content as string).toLowerCase();
			// Check if this message contains any question text (indicating it's an answer)
			const looksLikeAnswer = questionTexts.some((qText) => {
				// Check if message starts with or contains significant portion of question
				const questionStart = qText.substring(0, Math.min(30, qText.length));
				return content.includes(questionStart);
			});
			return !looksLikeAnswer;
		});

		// Return the last non-answer message (original request or refinement)
		if (nonAnswerMessages.length > 0) {
			return nonAnswerMessages[nonAnswerMessages.length - 1].content as string;
		}

		// Fallback to first message if all messages look like answers
		return humanMessages[0].content as string;
	}
}
