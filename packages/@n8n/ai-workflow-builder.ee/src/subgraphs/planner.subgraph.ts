/**
 * Planner Subgraph
 *
 * Guides users through clarifying questions before generating a detailed
 * implementation plan. Handles HITL (Human-in-the-Loop) flow for Q&A.
 *
 * Flow:
 * - Fresh mode: analyze request → ask questions (if needed) → generate plan
 * - With answers: process answers → generate plan
 * - Refine mode: update existing plan based on feedback
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredTool } from '@langchain/core/tools';
import { END, StateGraph } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import { buildPlannerPrompt, buildPlannerContextMessage } from '@/prompts/agents/planner.prompt';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import {
	PlannerSubgraphState,
	type PlannerState,
	type PlannerQuestionPhase,
} from './planner-state';
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
import type { CoordinationLogEntry } from '../types/coordination';
import { createPlannerMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import type { PlannerQuestion, PlanOutput, QuestionResponse } from '../types/planner-types';
import { extractConnectionChangingParameters } from '../tools/utils/connection.utils';
import { extractResourceOperations } from '../utils/resource-operation-extractor';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import { buildWorkflowSummary, createContextMessage } from '../utils/context-builders';
import { executeSubgraphTools, extractUserRequest } from '../utils/subgraph-helpers';

// ============================================================================
// Configuration
// ============================================================================

export interface PlannerSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	logger?: Logger;
	featureFlags?: BuilderFeatureFlags;
}

// ============================================================================
// Planner Subgraph Implementation
// ============================================================================

export class PlannerSubgraph extends BaseSubgraph<
	PlannerSubgraphConfig,
	PlannerState,
	typeof ParentGraphState.State
> {
	name = 'planner_subgraph';
	description = 'Guides users through questions and generates implementation plans';

	private agent!: Runnable;
	private toolMap!: Map<string, StructuredTool>;
	private logger?: Logger;
	private parsedNodeTypes!: INodeTypeDescription[];

	create(config: PlannerSubgraphConfig) {
		this.logger = config.logger;
		this.parsedNodeTypes = config.parsedNodeTypes;

		// Check if template examples are enabled
		const includeExamples = config.featureFlags?.templateExamples === true;

		// Create discovery tools (reused for node identification during planning)
		const documentationTool = createGetDocumentationTool();
		const searchTool = createNodeSearchTool(config.parsedNodeTypes);
		const detailsTool = createNodeDetailsTool(config.parsedNodeTypes, config.logger);

		// Build tool map for execution (only discovery tools need execution)
		this.toolMap = new Map<string, StructuredTool>();
		this.toolMap.set(documentationTool.toolName, documentationTool.tool);
		this.toolMap.set(searchTool.toolName, searchTool.tool);
		this.toolMap.set(detailsTool.toolName, detailsTool.tool);

		// Conditionally add workflow examples tool
		if (includeExamples) {
			const examplesTool = createGetWorkflowExamplesTool(config.logger);
			this.toolMap.set(examplesTool.toolName, examplesTool.tool);
		}

		// Create planner-specific output tools
		const submitQuestionsTool = createSubmitQuestionsTool();
		const submitPlanTool = createSubmitPlanTool();

		// All tools for the agent (discovery + output tools)
		const allTools: StructuredTool[] = [
			documentationTool.tool,
			searchTool.tool,
			detailsTool.tool,
			...(includeExamples ? [createGetWorkflowExamplesTool(config.logger).tool] : []),
			submitQuestionsTool,
			submitPlanTool,
		];

		// Generate prompt
		const plannerPrompt = buildPlannerPrompt({ includeExamples });

		// Create system prompt template
		const systemPrompt = ChatPromptTemplate.fromMessages([
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

		if (typeof config.llm.bindTools !== 'function') {
			throw new LLMServiceError('LLM does not support tools', {
				llmModel: config.llm._llmType(),
			});
		}

		// Bind tools to LLM
		this.agent = systemPrompt.pipe(config.llm.bindTools(allTools));

		// Build the subgraph
		const subgraph = new StateGraph(PlannerSubgraphState)
			// Entry node - routes based on input mode
			.addNode('route_by_mode', this.routeByMode.bind(this))
			// Agent node - calls LLM
			.addNode('agent', this.callAgent.bind(this))
			// Tool execution node
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			// Output formatting nodes
			.addNode('format_questions', this.formatQuestions.bind(this))
			.addNode('format_plan', this.formatPlan.bind(this))

			// Entry edge
			.addEdge('__start__', 'route_by_mode')

			// Route by mode
			.addConditionalEdges('route_by_mode', (state) => state.next, {
				agent: 'agent',
				format_plan: 'format_plan', // Direct to plan for refine mode
			})

			// Agent routing - check what output tool was called
			.addConditionalEdges('agent', this.routeAfterAgent.bind(this), {
				tools: 'tools',
				format_questions: 'format_questions',
				format_plan: 'format_plan',
				agent: 'agent', // Retry if no valid output
			})

			// After tools, back to agent
			.addEdge('tools', 'agent')

			// Terminal nodes
			.addEdge('format_questions', END)
			.addEdge('format_plan', END);

		return subgraph.compile();
	}

	// ========================================================================
	// Graph Nodes
	// ========================================================================

	/**
	 * Routes based on input mode (fresh, with_answers, refine)
	 */
	private routeByMode(state: PlannerState): Partial<PlannerState> {
		switch (state.mode) {
			case 'fresh':
				// Start by calling agent to analyze and possibly ask questions
				return {
					next: 'agent',
					questionPhase: 'analyzing' as PlannerQuestionPhase,
				};

			case 'with_answers':
				// User submitted answers, go to agent to generate plan
				return {
					next: 'agent',
					questionPhase: 'planning' as PlannerQuestionPhase,
				};

			case 'refine':
				// User wants to modify existing plan
				return {
					next: 'agent',
					questionPhase: 'planning' as PlannerQuestionPhase,
				};

			default:
				return { next: 'agent' };
		}
	}

	/**
	 * Calls the planner agent
	 */
	private async callAgent(state: PlannerState): Promise<Partial<PlannerState>> {
		console.log('[Planner.callAgent] state.mode:', state.mode);
		console.log('[Planner.callAgent] state.messages.length:', state.messages.length);
		console.log('[Planner.callAgent] state.userRequest:', state.userRequest.substring(0, 100));

		// Apply cache markers to accumulated messages
		if (state.messages.length > 0) {
			applySubgraphCacheMarkers(state.messages);
		}

		// Build context based on mode and state
		const context = buildPlannerContextMessage({
			userRequest: state.userRequest,
			existingWorkflowSummary: state.existingWorkflowSummary || undefined,
			previousPlan: state.existingPlan ? this.formatPlanForContext(state.existingPlan) : undefined,
			userAnswers: this.formatAnswersForContext(state.questions, state.answers),
		});

		console.log('[Planner.callAgent] context (first 300 chars):', context.substring(0, 300));

		// Call agent
		const response = (await this.agent.invoke({
			messages: state.messages,
			prompt: context,
		})) as AIMessage;

		console.log(
			'[Planner.callAgent] response.tool_calls:',
			response.tool_calls?.map((tc) => tc.name),
		);

		return { messages: [response] };
	}

	/**
	 * Routes after agent based on which output tool was called
	 */
	private routeAfterAgent(state: PlannerState): string {
		const lastMessage = state.messages.at(-1);

		console.log('[Planner.routeAfterAgent] messages.length:', state.messages.length);
		console.log('[Planner.routeAfterAgent] lastMessage type:', lastMessage?.constructor.name);

		if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls?.length) {
			// No tool calls - this shouldn't happen, retry or end
			console.log(
				'[Planner.routeAfterAgent] No tool calls! isAIMessage:',
				lastMessage ? isAIMessage(lastMessage) : false,
			);
			console.log(
				'[Planner.routeAfterAgent] lastMessage.content:',
				typeof lastMessage?.content === 'string'
					? lastMessage.content.substring(0, 200)
					: '[non-string]',
			);
			this.logger?.warn('[Planner] Agent stopped without tool calls');
			return 'agent'; // Retry
		}

		const toolNames = lastMessage.tool_calls.map((tc) => tc.name);
		console.log('[Planner.routeAfterAgent] tool_calls:', toolNames);

		// Check for submit_questions
		const questionsCall = lastMessage.tool_calls.find(
			(tc) => tc.name === SUBMIT_QUESTIONS_TOOL.toolName,
		);
		if (questionsCall) {
			console.log('[Planner.routeAfterAgent] → format_questions');
			return 'format_questions';
		}

		// Check for submit_plan
		const planCall = lastMessage.tool_calls.find((tc) => tc.name === SUBMIT_PLAN_TOOL.toolName);
		if (planCall) {
			console.log('[Planner.routeAfterAgent] → format_plan');
			return 'format_plan';
		}

		// Other tools (discovery tools) - execute them
		console.log('[Planner.routeAfterAgent] → tools');
		return 'tools';
	}

	/**
	 * Formats questions from the submit_questions tool call
	 */
	private formatQuestions(state: PlannerState): Partial<PlannerState> {
		const lastMessage = state.messages.at(-1);

		if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls) {
			return {
				questions: [],
				questionPhase: 'complete' as PlannerQuestionPhase,
			};
		}

		const questionsCall = lastMessage.tool_calls.find(
			(tc) => tc.name === SUBMIT_QUESTIONS_TOOL.toolName,
		);

		if (!questionsCall) {
			return {
				questions: [],
				questionPhase: 'complete' as PlannerQuestionPhase,
			};
		}

		// Validate with schema
		const parseResult = submitQuestionsSchema.safeParse(questionsCall.args);
		if (!parseResult.success) {
			this.logger?.error('[Planner] Invalid questions schema', {
				errors: parseResult.error.errors,
			});
			return {
				questions: [],
				questionPhase: 'complete' as PlannerQuestionPhase,
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
			questionPhase: 'asking' as PlannerQuestionPhase,
		};
	}

	/**
	 * Formats plan from the submit_plan tool call
	 */
	private formatPlan(state: PlannerState): Partial<PlannerState> {
		const lastMessage = state.messages.at(-1);

		if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls) {
			return {
				plan: null,
				questionPhase: 'complete' as PlannerQuestionPhase,
			};
		}

		const planCall = lastMessage.tool_calls.find((tc) => tc.name === SUBMIT_PLAN_TOOL.toolName);

		if (!planCall) {
			return {
				plan: null,
				questionPhase: 'complete' as PlannerQuestionPhase,
			};
		}

		// Validate with schema
		const parseResult = submitPlanSchema.safeParse(planCall.args);
		if (!parseResult.success) {
			this.logger?.error('[Planner] Invalid plan schema', {
				errors: parseResult.error.errors,
			});
			return {
				plan: null,
				questionPhase: 'complete' as PlannerQuestionPhase,
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
			// discoveryContext will be populated from state in transformOutput
		};

		return {
			plan,
			questionPhase: 'complete' as PlannerQuestionPhase,
		};
	}

	// ========================================================================
	// Transform Methods
	// ========================================================================

	transformInput(parentState: typeof ParentGraphState.State): Partial<PlannerState> {
		// DEBUG: Log all parent messages
		console.log(
			'[Planner.transformInput] parentState.messages.length:',
			parentState.messages.length,
		);
		console.log(
			'[Planner.transformInput] all messages:',
			parentState.messages.map((m, i) => ({
				index: i,
				type: m.constructor.name,
				content: typeof m.content === 'string' ? m.content.substring(0, 80) : '[non-string]',
			})),
		);

		const userRequest = extractUserRequest(parentState.messages, 'Plan a workflow');
		console.log('[Planner.transformInput] extracted userRequest:', userRequest.substring(0, 100));

		// Determine mode based on parent state
		let mode: 'fresh' | 'with_answers' | 'refine' = 'fresh';

		// Check if this is an answers submission
		const lastMessage = parentState.messages.at(-1);
		if (this.isAnswersMessage(lastMessage)) {
			mode = 'with_answers';
		} else if (parentState.planOutput && parentState.plannerPhase === 'plan_displayed') {
			// Has existing plan and user sent new message = refinement
			mode = 'refine';
		}

		console.log(
			'[Planner.transformInput] determined mode:',
			mode,
			'| plannerPhase:',
			parentState.plannerPhase,
		);

		// Build context parts
		const contextParts: string[] = [];
		contextParts.push('<user_request>');
		contextParts.push(userRequest);
		contextParts.push('</user_request>');

		// Add workflow summary if exists
		let existingWorkflowSummary = '';
		if (parentState.workflowJSON.nodes.length > 0) {
			existingWorkflowSummary = buildWorkflowSummary(parentState.workflowJSON);
		}

		// Create initial message
		const contextMessage = createContextMessage(contextParts);

		// Parse answers if in with_answers mode
		const answers: QuestionResponse[] =
			mode === 'with_answers' && lastMessage ? this.parseAnswersFromMessage(lastMessage) : [];

		return {
			mode,
			userRequest,
			existingWorkflowSummary,
			existingPlan: parentState.planOutput ?? null,
			messages: [contextMessage],
			questions: parentState.pendingQuestions ?? [],
			answers,
			questionPhase: 'analyzing' as PlannerQuestionPhase,
		};
	}

	transformOutput(
		subgraphOutput: PlannerState,
		_parentState: typeof ParentGraphState.State,
	): Partial<typeof ParentGraphState.State> {
		const { questions, answers, questionPhase, plan, introMessage } = subgraphOutput;

		console.log('[Planner.transformOutput] questionPhase:', questionPhase);
		console.log('[Planner.transformOutput] questions.length:', questions.length);
		console.log('[Planner.transformOutput] introMessage:', introMessage?.substring(0, 50));
		console.log('[Planner.transformOutput] plan:', plan ? 'exists' : 'null');
		console.log(
			'[Planner.transformOutput] subgraphOutput.messages.length:',
			subgraphOutput.messages.length,
		);

		// Determine planner phase for parent state
		let plannerPhase: 'idle' | 'waiting_for_answers' | 'plan_displayed' = 'idle';

		if (questionPhase === 'asking' && questions.length > 0) {
			plannerPhase = 'waiting_for_answers';
		} else if (plan) {
			plannerPhase = 'plan_displayed';
		}

		console.log('[Planner.transformOutput] determined plannerPhase:', plannerPhase);

		// Build discovery context from plan suggestions
		const discoveryContext: DiscoveryContext | null = plan
			? this.buildDiscoveryContextFromPlan(plan)
			: null;

		// Add discovery context to plan if generated
		const planWithContext: PlanOutput | null = plan
			? { ...plan, discoveryContext: discoveryContext ?? undefined }
			: null;

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

		return {
			pendingQuestions: questions,
			introMessage: introMessage ?? '',
			planOutput: planWithContext,
			plannerPhase,
			discoveryContext,
			coordinationLog: [logEntry],
		};
	}

	// ========================================================================
	// Helper Methods
	// ========================================================================

	/**
	 * Check if a message is an answers submission
	 */
	private isAnswersMessage(message: BaseMessage | undefined): boolean {
		if (!message) return false;

		// Check message content for question_answers type
		const content = message.content;
		if (typeof content === 'string') {
			try {
				const parsed = JSON.parse(content) as { type?: string };
				return parsed.type === 'question_answers';
			} catch {
				return false;
			}
		}
		return false;
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
	 * Format existing plan for context
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
	 * Format answers for context message
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
	 * Build discovery context from plan suggestions.
	 * Hydrates nodes with actual versions and available resources from parsedNodeTypes.
	 * Mirrors the hydration logic from discovery.subgraph.ts formatOutput().
	 */
	private buildDiscoveryContextFromPlan(plan: PlanOutput): DiscoveryContext | null {
		const suggestedNodes = new Set<string>();

		for (const step of plan.steps) {
			if (step.suggestedNodes) {
				step.suggestedNodes.forEach((n) => suggestedNodes.add(n));
			}
		}

		if (suggestedNodes.size === 0) {
			return null;
		}

		// Build lookup maps for node types
		// Plan may have display names ("HTTP Request") or internal names ("n8n-nodes-base.httpRequest")
		// So we need to support both lookup strategies
		const nodeTypeByInternalName = new Map<string, INodeTypeDescription>();
		const nodeTypeByDisplayName = new Map<string, INodeTypeDescription>();

		for (const nt of this.parsedNodeTypes) {
			// Get the max version for this node type
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
			// Use lowercase for case-insensitive matching
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

		// Hydrate nodesFound with actual versions, available resources, and connection-changing parameters
		const nodesFound = Array.from(suggestedNodes).map((nodeName) => {
			// Try internal name first, then display name (case-insensitive)
			let nodeType = nodeTypeByInternalName.get(nodeName);
			if (!nodeType) {
				nodeType = nodeTypeByDisplayName.get(nodeName.toLowerCase());
			}

			if (!nodeType) {
				this.logger?.warn('[Planner] Node type not found during hydration', { nodeName });
				return {
					nodeName,
					version: 1,
					reasoning: 'Suggested in plan step',
					connectionChangingParameters: [],
				};
			}

			// Use the internal name for consistency with discovery output
			const internalName = nodeType.name;

			// Get the highest/latest version
			const versions = Array.isArray(nodeType.version) ? nodeType.version : [nodeType.version];
			const latestVersion = Math.max(...versions);

			// Extract resource/operation info (same as discovery.subgraph.ts)
			const resourceOpInfo = extractResourceOperations(nodeType, latestVersion, this.logger);

			// Extract connection-changing parameters from inputs/outputs expressions
			const connectionChangingParameters = extractConnectionChangingParameters(nodeType);

			return {
				nodeName: internalName, // Use internal name for downstream compatibility
				version: latestVersion,
				reasoning: 'Suggested in plan step',
				connectionChangingParameters,
				...(resourceOpInfo && { availableResources: resourceOpInfo.resources }),
			};
		});

		console.log(
			'[Planner.buildDiscoveryContextFromPlan] hydrated nodes:',
			nodesFound.map((n) => ({
				name: n.nodeName,
				version: n.version,
				hasResources: !!n.availableResources,
				connectionParams: n.connectionChangingParameters.map((p) => p.name),
			})),
		);

		return { nodesFound };
	}
}
