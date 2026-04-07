/**
 * Planner Agent
 *
 * Generates a structured workflow plan for user approval (Plan Mode).
 * Owns the full lifecycle: context building, LLM invocation, interrupt, and decision handling.
 */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { StructuredTool } from '@langchain/core/tools';
import { interrupt } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { z } from 'zod';

import { buildPlannerPrompt, buildPlannerContext } from '@/prompts';
import type { DiscoveryContext } from '@/types/discovery-types';
import type { PlanDecision, PlanOutput } from '@/types/planning';
import type { SimpleWorkflow } from '@/types/workflow';
import { createContextMessage } from '@/utils/context-builders';
import { formatPlanAsText } from '@/utils/plan-helpers';

// ============================================================================
// SCHEMA
// ============================================================================

export const plannerOutputSchema = z.object({
	summary: z.string().describe('1-2 sentence description of the workflow outcome'),
	trigger: z.string().describe('What starts the workflow (manual, schedule, webhook, etc.)'),
	steps: z
		.array(
			z.object({
				description: z.string().describe('What this step does'),
				subSteps: z.array(z.string()).optional(),
				suggestedNodes: z
					.array(z.string())
					.optional()
					.describe(
						'Copy exact node type names from discovery_context_suggested_nodes. Do not modify, prefix, or invent names.',
					),
			}),
		)
		.min(1)
		.describe('Ordered list of workflow steps'),
	additionalSpecs: z
		.array(z.string())
		.optional()
		.describe('Optional assumptions, edge cases, or notes'),
});

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

// ============================================================================
// AGENT CREATION
// ============================================================================

export interface PlannerAgentConfig {
	llm: BaseChatModel;
	tools?: StructuredTool[];
}

export function createPlannerAgent(config: PlannerAgentConfig) {
	const tools = config.tools ?? [];
	const hasDocumentationTool = tools.some((t) => t.name === 'get_documentation');
	const plannerPromptText = buildPlannerPrompt({ hasDocumentationTool });

	const systemPrompt = new SystemMessage({
		content: [
			{
				type: 'text',
				text: plannerPromptText,
				cache_control: { type: 'ephemeral' },
			},
		],
	});

	return createAgent({
		model: config.llm,
		tools,
		systemPrompt,
		responseFormat: plannerOutputSchema,
	});
}

export type PlannerAgentType = ReturnType<typeof createPlannerAgent>;

// ============================================================================
// INVOCATION
// ============================================================================

export interface PlannerNodeInput {
	userRequest: string;
	discoveryContext: DiscoveryContext;
	workflowJSON: SimpleWorkflow;
	planPrevious?: PlanOutput | null;
	planFeedback?: string | null;
	selectedNodesContext?: string;
}

export interface PlannerNodeResult {
	planDecision?: PlanDecision;
	planOutput?: PlanOutput | null;
	planFeedback?: string | null;
	planPrevious?: PlanOutput | null;
	mode?: 'build';
	messages?: BaseMessage[];
}

export function parsePlanDecision(value: unknown): { action: PlanDecision; feedback?: string } {
	if (typeof value !== 'object' || value === null) {
		return {
			action: 'reject',
			feedback: `Invalid response: expected an object, got ${typeof value}.`,
		};
	}

	const obj = value as Record<string, unknown>;
	const action = obj.action;
	if (action !== 'approve' && action !== 'reject' && action !== 'modify') {
		return {
			action: 'reject',
			feedback: `Invalid response: expected action to be approve/reject/modify, got '${String(action)}'.`,
		};
	}

	const feedback = typeof obj.feedback === 'string' ? obj.feedback : undefined;
	return { action, ...(feedback ? { feedback } : {}) };
}

/**
 * Invoke the planner agent: build context, call LLM, interrupt for user decision,
 * and return the appropriate state update.
 */
const MAX_PLANNER_RETRIES = 1;

export async function invokePlannerNode(
	agent: PlannerAgentType,
	input: PlannerNodeInput,
	config?: RunnableConfig,
): Promise<PlannerNodeResult> {
	const contextContent = buildPlannerContext({
		userRequest: input.userRequest,
		discoveryContext: input.discoveryContext,
		workflowJSON: input.workflowJSON,
		planPrevious: input.planPrevious,
		planFeedback: input.planFeedback,
		selectedNodesContext: input.selectedNodesContext,
	});
	const contextMessage = createContextMessage([contextContent]);

	let lastError: string | undefined;
	let plan: PlannerOutput | undefined;

	for (let attempt = 0; attempt <= MAX_PLANNER_RETRIES; attempt++) {
		const messages =
			attempt === 0
				? [contextMessage]
				: [
						contextMessage,
						new HumanMessage(
							`Your previous output was invalid: ${lastError}. Please output a valid JSON plan with summary, trigger, and steps fields.`,
						),
					];

		const output = await agent.invoke({ messages }, config);
		const parsedPlan = plannerOutputSchema.safeParse(output.structuredResponse);
		if (parsedPlan.success) {
			plan = parsedPlan.data;
			break;
		}
		lastError = parsedPlan.error.message;
	}

	if (!plan) {
		throw new Error(
			`Planner produced invalid output after ${MAX_PLANNER_RETRIES + 1} attempts: ${lastError}`,
		);
	}
	const decisionValue: unknown = interrupt({ type: 'plan', plan });
	const decision = parsePlanDecision(decisionValue);

	if (decision.action === 'approve') {
		return {
			planDecision: 'approve',
			planOutput: plan,
			mode: 'build',
			planFeedback: null,
			planPrevious: null,
		};
	}

	if (decision.action === 'reject') {
		return {
			planDecision: 'reject',
			planOutput: null,
			planFeedback: null,
			planPrevious: null,
		};
	}

	// Modify: provide feedback context for re-discovery
	const feedback = decision.feedback ?? 'User requested changes without additional details.';
	const feedbackMessage = createContextMessage([
		`<plan_feedback>\n${feedback}\n</plan_feedback>`,
		`<previous_plan>\n${formatPlanAsText(plan)}\n</previous_plan>`,
	]);

	return {
		planDecision: 'modify',
		planOutput: null,
		planFeedback: feedback,
		planPrevious: plan,
		messages: [feedbackMessage],
	};
}
