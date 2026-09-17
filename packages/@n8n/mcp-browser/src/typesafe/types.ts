/**
 * The TypeSafe System One wire shapes this package depends on, and the task
 * brief the fast loop reasons over.
 *
 * The call is injected through `ToolContext.systemOne` rather than constructed
 * by the tool, so the host decides whether the feature is on at all and where
 * the API key comes from. `typesafe/client.ts` builds one from a key.
 */

export interface NoulQuestion {
	type: 'noul';
	instructions: string;
}

export interface ChoiceQuestion {
	type: 'choice';
	instructions: string;
	/** Option label → description. `null` leaves an option undescribed. */
	criteria: Record<string, string | null>;
}

export type Question = NoulQuestion | ChoiceQuestion;

export interface NoulAnswer {
	type: 'noul';
	noul: number;
}

export interface ChoiceAnswer {
	type: 'choice';
	choice: string;
	confidence: number;
	probabilities: Record<string, number>;
}

export type Answer = NoulAnswer | ChoiceAnswer;

export interface SystemOneResult {
	model: string;
	answers: Record<string, Answer>;
	usage: { input_tokens: number; output_tokens: number };
}

/** Injected by the host. Absent when no API key is configured. */
export type SystemOneFn = (request: {
	state: unknown;
	questions: Record<string, Question>;
}) => Promise<SystemOneResult>;

export function isChoiceAnswer(answer: Answer | undefined): answer is ChoiceAnswer {
	return answer?.type === 'choice';
}

export function isNoulAnswer(answer: Answer | undefined): answer is NoulAnswer {
	return answer?.type === 'noul';
}

/**
 * What the loop knows about the work. The goal and step come from the calling
 * agent; the page fields and snapshot are refreshed after every action.
 */
export interface TaskBrief {
	goal: string;
	step: string;
	/** Values the user already supplied, so a typing step can be recognised. */
	knownValues?: Record<string, string>;
	recentActions?: string[];
	url: string;
	title: string;
	snapshot: string;
}
