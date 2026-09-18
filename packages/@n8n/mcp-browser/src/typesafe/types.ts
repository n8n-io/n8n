/**
 * The TypeSafe System One wire shapes this package depends on, and the task
 * brief the fast loop reasons over.
 *
 * The call is injected through `ToolContext.systemOne` rather than constructed
 * by the tool, so the host decides whether the feature is on at all and where
 * the API key comes from. `typesafe/client.ts` builds one from a key.
 */

/**
 * Instructions take structure as well as prose — the API documents JSON for
 * instructions and criteria alike — which keeps a shared rules block separate
 * from the question it accompanies instead of concatenated into one sentence.
 */
export type Instructions = string | Record<string, string>;

export interface NoulQuestion {
	type: 'noul';
	instructions: Instructions;
}

export interface ChoiceQuestion {
	type: 'choice';
	instructions: Instructions;
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

/** What a field needs typed into it, and everything available to infer it from. */
export interface FieldTextRequest {
	goal: string;
	field: { role: string; name: string; value?: string; context?: string };
	page: { url: string; title: string };
	knownValues?: Record<string, string>;
	recentActions?: RecentAction[];
}

/**
 * Writes the value for a text field.
 *
 * A System One model returns typed choices only, so without this the loop
 * cannot fill a form and has to hand every text field back — which on most of
 * the web means handing back immediately and repeatedly. Injected by the host
 * so the model and its credentials stay where configuration lives. Returns
 * `null` when the goal does not determine a value, which hands back instead of
 * typing a guess.
 */
export type FieldTextFn = (request: FieldTextRequest) => Promise<string | null>;

/**
 * One past action, as the model sees it.
 *
 * `target` is the element's label rather than its ref: refs are scoped to the
 * snapshot that produced them, so a ref from two actions ago names nothing.
 * `changedPage` is what tells the model a step already took effect — without
 * it, a satisfied field looks the same as an untouched one and the loop
 * repeats itself.
 */
export interface RecentAction {
	action: string;
	target?: string;
	text?: string;
	changedPage: boolean;
}

export function isChoiceAnswer(answer: Answer | undefined): answer is ChoiceAnswer {
	return answer?.type === 'choice';
}

export function isNoulAnswer(answer: Answer | undefined): answer is NoulAnswer {
	return answer?.type === 'noul';
}

/**
 * What the loop knows about the work.
 *
 * One goal, no per-step input: naming the step would put the caller back in
 * charge of decomposing the task, which is the work this loop exists to do.
 * The page fields and snapshot are refreshed after every action.
 */
export interface TaskBrief {
	goal: string;
	/** Values the user already supplied, so a typing step can be recognised. */
	knownValues?: Record<string, string>;
	recentActions?: RecentAction[];
	url: string;
	title: string;
	snapshot: string;
}
