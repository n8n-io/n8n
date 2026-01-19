/**
 * Planner types for Plan Mode in the AI Workflow Builder.
 *
 * Plan Mode guides users through clarifying questions before generating
 * a detailed implementation plan.
 */

import type { DiscoveryContext } from './discovery-types';

// ============================================================================
// Question Types
// ============================================================================

/**
 * Question type determines the UI component rendered
 */
export type QuestionType = 'single' | 'multi' | 'text';

/**
 * A clarifying question to gather requirements from users.
 */
export interface PlannerQuestion {
	/** Unique identifier for the question */
	id: string;

	/** The question text displayed to the user */
	question: string;

	/** Question type determines the UI component */
	type: QuestionType;

	/** Predefined options for single/multi types */
	options?: string[];

	/** Whether to show "Other" text input (default: true for single/multi) */
	allowCustom?: boolean;
}

/**
 * User's response to a question.
 */
export interface QuestionResponse {
	/** ID of the question being answered */
	questionId: string;

	/** Selected option(s) for single/multi types */
	selectedOptions?: string[];

	/** Custom value for "Other" option or text type */
	customValue?: string;

	/** Whether the question was skipped */
	skipped: boolean;
}

// ============================================================================
// Plan Types
// ============================================================================

/**
 * A step in the workflow plan.
 */
export interface PlanStep {
	/** Description of what this step does */
	description: string;

	/** Optional sub-steps for complex operations */
	subSteps?: string[];

	/** Suggested n8n node names for this step (from discovery) */
	suggestedNodes?: string[];
}

/**
 * The generated implementation plan.
 */
export interface PlanOutput {
	/** Bold headline summarizing the workflow */
	summary: string;

	/** Description of what initiates the workflow */
	trigger: string;

	/** Numbered list of workflow steps */
	steps: PlanStep[];

	/** Additional constraints or requirements */
	additionalSpecs?: string[];

	/** Discovery context for implementation (reused to skip redundant discovery) */
	discoveryContext?: DiscoveryContext;
}

// ============================================================================
// Planner Phase Types
// ============================================================================

/**
 * Planner state machine phases for HITL (Human-in-the-Loop) flow.
 */
export type PlannerPhase =
	| 'idle' // No planning in progress
	| 'analyzing' // Analyzing initial request
	| 'waiting_for_answers' // Q&A UI shown, waiting for user
	| 'generating_plan' // Creating initial plan
	| 'plan_displayed' // Plan shown, waiting for user action
	| 'refining_plan'; // User sent refinement message

/**
 * Input mode for the planner subgraph.
 */
export type PlannerInputMode = 'fresh' | 'with_answers' | 'refine';

// ============================================================================
// Subgraph State Types
// ============================================================================

/**
 * Planner subgraph internal state.
 * Used within the planner graph for Q&A and plan generation.
 */
export interface PlannerSubgraphState {
	/** Input mode determining the flow */
	mode: PlannerInputMode;

	/** The user's original workflow request */
	userRequest: string;

	/** Q&A phase tracking */
	questions: PlannerQuestion[];

	/** User's answers to questions */
	answers: QuestionResponse[];

	/** Current phase in the question flow */
	questionPhase: 'analyzing' | 'asking' | 'summarizing' | 'planning' | 'complete';

	/** Discovery context from node identification */
	discoveryContext: DiscoveryContext | null;

	/** The generated plan */
	plan: PlanOutput | null;

	/** Existing plan for refinement mode */
	existingPlan: PlanOutput | null;
}

// ============================================================================
// Message Types (for frontend communication)
// ============================================================================

/**
 * Message containing questions for the user.
 * Sent by AI to initiate Q&A flow.
 */
export interface QuestionsMessage {
	type: 'questions';
	questions: PlannerQuestion[];
}

/**
 * Message containing user's answers.
 * Sent by user after completing Q&A.
 */
export interface QuestionAnswersMessage {
	type: 'question_answers';
	answers: QuestionResponse[];
}

/**
 * Message summarizing user's answers.
 * Displayed before plan generation.
 */
export interface AnswerSummaryMessage {
	type: 'answer_summary';
	/** Only answered (non-skipped) question-answer pairs */
	answeredQuestions: Array<{
		question: string;
		answer: string;
	}>;
}

/**
 * Message containing the generated plan.
 */
export interface PlanMessage {
	type: 'plan';
	plan: PlanOutput;
	/** Whether to show "Implement the plan" button */
	showImplementButton: boolean;
}

/**
 * Message indicating user clicked "Implement the plan".
 */
export interface ImplementPlanMessage {
	type: 'implement_plan';
	/** The plan to implement */
	planContext: PlanOutput;
}
