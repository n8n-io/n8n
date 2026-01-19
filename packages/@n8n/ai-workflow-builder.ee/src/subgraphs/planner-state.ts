/**
 * Planner Subgraph State
 *
 * Defines the state for the planner subgraph using LangGraph's Annotation.Root.
 * This state is isolated from the parent graph and manages Q&A and plan generation.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

import type { DiscoveryContext } from '../types/discovery-types';
import type {
	PlannerInputMode,
	PlannerQuestion,
	PlanOutput,
	QuestionResponse,
} from '../types/planner-types';

/**
 * Question phase within the planner subgraph.
 * Tracks where we are in the Q&A and planning flow.
 */
export type PlannerQuestionPhase =
	| 'analyzing' // Analyzing the initial request
	| 'asking' // Questions generated, waiting to emit
	| 'summarizing' // Processing answers
	| 'planning' // Generating the plan
	| 'complete'; // Plan generated

/**
 * Planner subgraph state definition.
 *
 * This state is:
 * - Populated by transformInput() from parent state
 * - Used internally by the planner graph nodes
 * - Extracted by transformOutput() to update parent state
 */
export const PlannerSubgraphState = Annotation.Root({
	// ========================================================================
	// Input fields (from parent)
	// ========================================================================

	/** Input mode determining the flow path */
	mode: Annotation<PlannerInputMode>({
		reducer: (x, y) => y ?? x,
		default: () => 'fresh' as PlannerInputMode,
	}),

	/** The user's original workflow request */
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	/** Existing workflow summary for context (if any) */
	existingWorkflowSummary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	/** Existing plan for refinement mode */
	existingPlan: Annotation<PlanOutput | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// ========================================================================
	// Internal state (Q&A tracking)
	// ========================================================================

	/** Internal conversation messages */
	messages: Annotation<BaseMessage[]>({
		reducer: messagesStateReducer,
		default: () => [],
	}),

	/** Current phase in the question flow */
	questionPhase: Annotation<PlannerQuestionPhase>({
		reducer: (x, y) => y ?? x,
		default: () => 'analyzing' as PlannerQuestionPhase,
	}),

	/** Generated questions to ask the user */
	questions: Annotation<PlannerQuestion[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	/** User's answers to questions (from second invocation) */
	answers: Annotation<QuestionResponse[]>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	/** Optional intro message before questions */
	introMessage: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// ========================================================================
	// Output fields (for parent)
	// ========================================================================

	/** Discovery context built during planning (for implementation) */
	discoveryContext: Annotation<DiscoveryContext | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	/** The generated plan */
	plan: Annotation<PlanOutput | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// ========================================================================
	// Routing control
	// ========================================================================

	/** Next node to route to (for conditional edges) */
	next: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),
});

/**
 * Type alias for the planner subgraph state.
 */
export type PlannerState = typeof PlannerSubgraphState.State;

/**
 * Input type for the planner subgraph (what transformInput returns).
 */
export interface PlannerSubgraphInput {
	mode: PlannerInputMode;
	userRequest: string;
	existingWorkflowSummary?: string;
	existingPlan?: PlanOutput | null;
	answers?: QuestionResponse[];
}

/**
 * Output type for the planner subgraph (what transformOutput extracts).
 */
export interface PlannerSubgraphOutput {
	questions: PlannerQuestion[];
	answers: QuestionResponse[];
	questionPhase: PlannerQuestionPhase;
	plan: PlanOutput | null;
	discoveryContext: DiscoveryContext | null;
	introMessage?: string;
}
