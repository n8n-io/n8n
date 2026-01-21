import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, isAIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { type StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import {
	formatExampleCategorizations,
	formatTechniqueList,
} from '@/prompts/agents/discovery.prompt';
import { buildPlannerContextMessage, buildPlannerPrompt } from '@/prompts/agents/planner.prompt';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createGetDocumentationTool } from '../tools/get-documentation.tool';
import { createGetWorkflowExamplesTool } from '../tools/get-workflow-examples.tool';
import { createNodeDetailsTool } from '../tools/node-details.tool';
import { createNodeSearchTool } from '../tools/node-search.tool';
import {
	createSubmitPlanTool,
	createSubmitQuestionsTool,
	SUBMIT_PLAN_TOOL,
	SUBMIT_QUESTIONS_TOOL,
	submitPlanSchema,
	submitQuestionsSchema,
} from '../tools/planner-tools';
import type { CoordinationLogEntry } from '../types/coordination';
import { createPlannerMetadata } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import type {
	PlannerInputMode,
	PlannerPhase,
	PlannerQuestion,
	PlanOutput,
	QuestionResponse,
} from '../types/planner-types';
import type { WorkflowMetadata } from '../types/tools';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import { buildWorkflowSummary } from '../utils/context-builders';
import { hydrateNodesFromPlan } from '../utils/node-hydration';
import { executeSubgraphTools } from '../utils/subgraph-helpers';

export interface PlannerSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	logger?: Logger;
	featureFlags?: BuilderFeatureFlags;
}

/**
 * Planner Subgraph State
 * Mirrors the structure defined in planner-types.ts but as a LangGraph Annotation
 */
export const PlannerGraphAnnotation = Annotation.Root({
	// Input
	mode: Annotation<PlannerInputMode>({
		reducer: (x, y) => y ?? x,
		default: () => 'fresh',
	}),
	/** All user requests in order (original + refinements) */
	userRequests: Annotation<string[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),
	existingWorkflowSummary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),
	existingPlan: Annotation<PlanOutput | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// Internal
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),
	answers: Annotation<QuestionResponse[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),
	previousQuestions: Annotation<PlannerQuestion[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output
	questions: Annotation<PlannerQuestion[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),
	introMessage: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),
	plan: Annotation<PlanOutput | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),
	/** Hydrated nodes from plan - used to populate discoveryContext */
	nodesFound: Annotation<DiscoveryContext['nodesFound']>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Captured from tool calls (reused from Discovery pattern)
	bestPractices: Annotation<string | undefined>({
		reducer: (x, y) => y ?? x,
		default: () => undefined,
	}),
	templateIds: Annotation<number[]>({
		reducer: (x, y) => [...(x ?? []), ...(y ?? [])],
		default: () => [],
	}),
	cachedTemplates: Annotation<WorkflowMetadata[]>({
		reducer: (x, y) => {
			// Dedupe by templateId, keep latest
			const map = new Map<number, WorkflowMetadata>();
			for (const t of [...(x ?? []), ...(y ?? [])]) {
				map.set(t.templateId, t);
			}
			return Array.from(map.values());
		},
		default: () => [],
	}),
});

export class PlannerSubgraph extends BaseSubgraph<
	PlannerSubgraphConfig,
	typeof PlannerGraphAnnotation.State,
	typeof ParentGraphState.State
> {
	name = 'planner_subgraph';
	description = 'Clarifies requirements and generates implementation plans';

	private plannerAgent!: Runnable;
	private toolMap!: Map<string, StructuredTool>;
	private logger?: Logger;
	private parsedNodeTypes!: INodeTypeDescription[];

	create(config: PlannerSubgraphConfig) {
		this.logger = config.logger;
		this.parsedNodeTypes = config.parsedNodeTypes;

		const includeExamples = config.featureFlags?.templateExamples === true;

		// Research tools (wrappers)
		const baseResearchTools = [
			createGetDocumentationTool(),
			createNodeSearchTool(config.parsedNodeTypes),
			createNodeDetailsTool(config.parsedNodeTypes, config.logger),
		];

		const researchToolWrappers = includeExamples
			? [...baseResearchTools, createGetWorkflowExamplesTool(config.logger)]
			: baseResearchTools;

		// Extract actual tools
		const researchTools = researchToolWrappers.map((t) => t.tool);

		// Output tools
		const outputTools = [createSubmitQuestionsTool(), createSubmitPlanTool()];

		// All tools for binding and execution map
		const allTools = [...researchTools, ...outputTools];
		this.toolMap = new Map(allTools.map((t) => [t.name, t]));

		// Build Prompt
		const plannerPrompt = buildPlannerPrompt({ includeExamples });

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

		this.plannerAgent = systemPrompt.pipe(config.llm.bindTools(allTools));

		// Build Graph
		const subgraph = new StateGraph(PlannerGraphAnnotation)
			.addNode('agent', this.callAgent.bind(this))
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			.addNode('format_questions', this.formatQuestions.bind(this))
			.addNode('format_plan', this.formatPlan.bind(this))
			.addEdge(START, 'agent')
			.addConditionalEdges('agent', this.shouldContinue.bind(this), {
				tools: 'tools',
				format_questions: 'format_questions',
				format_plan: 'format_plan',
				end: END,
			})
			.addEdge('tools', 'agent')
			.addEdge('format_questions', END)
			.addEdge('format_plan', END);

		return subgraph.compile();
	}

	private async callAgent(state: typeof PlannerGraphAnnotation.State) {
		if (state.messages.length > 0) {
			applySubgraphCacheMarkers(state.messages);
		}

		// Format answers for context if available
		const userAnswers = this.formatAnswersForContext(state.previousQuestions, state.answers);

		const context = buildPlannerContextMessage({
			userRequests: state.userRequests,
			existingWorkflowSummary: state.existingWorkflowSummary || undefined,
			previousPlan: state.existingPlan ? this.formatPlanForContext(state.existingPlan) : undefined,
			userAnswers,
		});

		const response = (await this.plannerAgent.invoke({
			messages: state.messages,
			prompt: context,
			techniques: formatTechniqueList(),
			exampleCategorizations: formatExampleCategorizations(),
		})) as AIMessage;

		return { messages: [response] };
	}

	private shouldContinue(state: typeof PlannerGraphAnnotation.State) {
		const lastMessage = state.messages[state.messages.length - 1];

		if (
			lastMessage &&
			isAIMessage(lastMessage) &&
			lastMessage.tool_calls &&
			lastMessage.tool_calls.length > 0
		) {
			const questionsCall = lastMessage.tool_calls.find(
				(tc) => tc.name === SUBMIT_QUESTIONS_TOOL.toolName,
			);
			if (questionsCall) return 'format_questions';

			const planCall = lastMessage.tool_calls.find((tc) => tc.name === SUBMIT_PLAN_TOOL.toolName);
			if (planCall) return 'format_plan';

			return 'tools';
		}

		return 'end';
	}

	private formatQuestions(state: typeof PlannerGraphAnnotation.State) {
		const lastMessage = state.messages.at(-1);
		if (!lastMessage || !isAIMessage(lastMessage)) return { questions: [] };

		const toolCall = lastMessage.tool_calls?.find(
			(tc) => tc.name === SUBMIT_QUESTIONS_TOOL.toolName,
		);
		if (!toolCall) return { questions: [] };

		const parseResult = submitQuestionsSchema.safeParse(toolCall.args);
		if (!parseResult.success) {
			this.logger?.error('[Planner] Invalid questions schema', {
				errors: parseResult.error.errors,
			});
			return { questions: [] };
		}

		const { questions, introMessage } = parseResult.data;
		return {
			questions: questions.map((q) => ({
				id: q.id,
				question: q.question,
				type: q.type,
				options: q.options,
				allowCustom: q.allowCustom ?? true,
			})),
			introMessage: introMessage ?? '',
		};
	}

	private formatPlan(state: typeof PlannerGraphAnnotation.State) {
		const lastMessage = state.messages.at(-1);
		if (!lastMessage || !isAIMessage(lastMessage)) return { plan: null };

		const toolCall = lastMessage.tool_calls?.find((tc) => tc.name === SUBMIT_PLAN_TOOL.toolName);
		if (!toolCall) return { plan: null };

		const parseResult = submitPlanSchema.safeParse(toolCall.args);
		if (!parseResult.success) {
			this.logger?.error('[Planner] Invalid plan schema', {
				errors: parseResult.error.errors,
			});
			return { plan: null };
		}

		const planData = parseResult.data;
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

		// Hydrate with nodes found (using STRICT matching)
		// This uses the shared utility to ensure consistency with Discovery
		const hydrationResult = hydrateNodesFromPlan(plan, this.parsedNodeTypes, this.logger);

		return {
			plan: hydrationResult.plan,
			nodesFound: hydrationResult.nodesFound,
		};
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		// Determine mode based on input
		let plannerInputMode: PlannerInputMode = 'fresh';
		let answers: QuestionResponse[] = [];
		const lastMessage = parentState.messages.at(-1);

		// Check if we are answering questions
		// We rely on ParentGraphState.plannerPhase to know if we were waiting for answers
		if (
			parentState.plannerPhase === 'waiting_for_answers' &&
			lastMessage instanceof HumanMessage &&
			this.isAnswersMessage(lastMessage)
		) {
			plannerInputMode = 'with_answers';
			answers = this.parseAnswersFromMessage(lastMessage);
		} else if (parentState.planOutput && parentState.plannerPhase === 'plan_displayed') {
			plannerInputMode = 'refine';
		}

		// Collect ALL user requests (original + any refinements)
		const userRequests = parentState.messages
			.filter((m): m is HumanMessage => m instanceof HumanMessage && !this.isAnswersMessage(m))
			.map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)));

		// Current workflow summary
		const existingWorkflowSummary =
			parentState.workflowJSON.nodes.length > 0
				? buildWorkflowSummary(parentState.workflowJSON)
				: '';

		return {
			mode: plannerInputMode,
			userRequests,
			existingWorkflowSummary,
			existingPlan: parentState.planOutput ?? null,
			previousQuestions: parentState.pendingQuestions ?? [],
			answers,
			messages: [], // Start fresh, context is in prompt
		};
	}

	transformOutput(
		subgraphOutput: typeof PlannerGraphAnnotation.State,
		_parentState: typeof ParentGraphState.State,
	) {
		const {
			questions,
			plan,
			introMessage,
			nodesFound,
			bestPractices,
			templateIds,
			cachedTemplates,
		} = subgraphOutput;

		let plannerPhase: PlannerPhase = 'idle';
		if (questions.length > 0 && !plan) {
			plannerPhase = 'waiting_for_answers';
		} else if (plan) {
			plannerPhase = 'plan_displayed';
		}

		// Create discovery context with nodes and best practices from tool calls
		const plannerDiscoveryContext =
			nodesFound.length > 0 || bestPractices
				? {
						nodesFound,
						bestPractices,
					}
				: undefined;

		// Add discoveryContext to plan
		const planWithContext = plan ? { ...plan, discoveryContext: plannerDiscoveryContext } : null;

		// Logs
		const logEntry: CoordinationLogEntry = {
			phase: 'planner',
			status: 'completed',
			timestamp: Date.now(),
			summary: plan
				? `Generated plan with ${plan.steps.length} steps`
				: `Generated ${questions.length} questions`,
			metadata: createPlannerMetadata({
				questionsAsked: questions.length,
				questionsAnswered: subgraphOutput.answers.length, // approximation
				questionsSkipped: 0,
				planGenerated: !!plan,
			}),
		};

		// Generate messages for UI (persistence)
		const outputMessages: AIMessage[] = [];
		if (plannerPhase === 'waiting_for_answers' && questions.length > 0) {
			outputMessages.push(
				new AIMessage({
					content: JSON.stringify({
						type: 'questions',
						introMessage,
						questions,
					}),
					additional_kwargs: { messageType: 'questions' },
				}),
			);
		} else if (plannerPhase === 'plan_displayed' && planWithContext) {
			outputMessages.push(
				new AIMessage({
					content: JSON.stringify({
						type: 'plan',
						plan: planWithContext,
					}),
					additional_kwargs: { messageType: 'plan' },
				}),
			);
		}

		return {
			plannerPhase,
			planOutput: planWithContext,
			pendingQuestions: questions,
			introMessage,
			coordinationLog: [logEntry],
			messages: outputMessages,
			// Set discoveryContext at parent level so builder can access it
			discoveryContext: plannerDiscoveryContext ?? null,
			// Pass through template data for telemetry and caching
			templateIds,
			cachedTemplates,
		};
	}

	// Helpers
	private isAnswersMessage(message: BaseMessage): boolean {
		if (typeof message.content !== 'string') return false;
		try {
			const parsed = JSON.parse(message.content) as { type?: string };
			return parsed.type === 'question_answers';
		} catch {
			return false;
		}
	}

	private parseAnswersFromMessage(message: BaseMessage): QuestionResponse[] {
		if (typeof message.content !== 'string') return [];
		try {
			const parsed = JSON.parse(message.content) as { answers?: QuestionResponse[] };
			return Array.isArray(parsed.answers) ? parsed.answers : [];
		} catch {
			return [];
		}
	}

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
			let answerText = answer.selectedOptions?.join(', ') ?? '';
			if (answer.customValue) {
				answerText = answerText ? `${answerText}, ${answer.customValue}` : answer.customValue;
			}
			result.push({ question: question.question, answer: answerText });
		}
		return result.length > 0 ? result : undefined;
	}

	private formatPlanForContext(plan: PlanOutput): string {
		const parts: string[] = [];
		parts.push(`Summary: ${plan.summary}`);
		parts.push(`Trigger: ${plan.trigger}`);
		parts.push('Steps:');
		plan.steps.forEach((step, i) => {
			parts.push(`${i + 1}. ${step.description}`);
			if (step.subSteps?.length) step.subSteps.forEach((s) => parts.push(`   - ${s}`));
		});
		return parts.join('\n');
	}
}
