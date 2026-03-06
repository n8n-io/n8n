export type PlannerQuestionType = 'single' | 'multi' | 'text';

export interface PlannerQuestion {
	id: string;
	question: string;
	type: PlannerQuestionType;
	options?: string[];
}

export interface QuestionResponse {
	questionId: string;
	question: string;
	selectedOptions: string[];
	customText?: string;
	skipped?: boolean;
}

export interface PlanStep {
	description: string;
	subSteps?: string[];
	/**
	 * Suggested internal node type names (e.g. "n8n-nodes-base.gmail").
	 */
	suggestedNodes?: string[];
}

export interface PlanOutput {
	summary: string;
	trigger: string;
	steps: PlanStep[];
	additionalSpecs?: string[];
}

export interface QuestionsInterruptValue {
	type: 'questions';
	introMessage?: string;
	questions: PlannerQuestion[];
}

export interface PlanInterruptValue {
	type: 'plan';
	plan: PlanOutput;
}

export type HITLInterruptValue = QuestionsInterruptValue | PlanInterruptValue;

export type PlanDecision = 'approve' | 'reject' | 'modify';

/**
 * A single HITL interaction stored for session replay.
 * Command.update messages don't survive in the parent checkpoint when
 * a subgraph node interrupts multiple times, so we store them here.
 */
export type HITLHistoryEntry =
	| {
			type: 'questions_answered';
			afterMessageId?: string;
			interrupt: QuestionsInterruptValue;
			answers: unknown;
	  }
	| {
			type: 'plan_decided';
			afterMessageId?: string;
			plan: PlanOutput;
			decision: PlanDecision;
			feedback?: string;
	  };
