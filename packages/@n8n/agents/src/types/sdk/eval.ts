/** Input provided to every eval function. */
export interface EvalInput {
	/** The prompt sent to the agent. */
	input: string;
	/** The agent's response text. */
	output: string;
	/** Expected answer from the dataset (if provided). */
	expected?: string;
	/** Tool calls the agent made during execution. */
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
}

/** Result returned by an eval — pass/fail with reasoning. */
export interface EvalScore {
	/** Whether the eval passed. */
	pass: boolean;
	/** Explanation of why the eval passed or failed. */
	reasoning: string;
}

/** Callable function bound to the judge model for LLM-as-judge evals. */
export type JudgeFn = (prompt: string) => Promise<{ text: string }>;

/** Context passed to an LLM-as-judge handler. */
export interface JudgeInput extends EvalInput {
	/** Call the judge model with a prompt. */
	llm: JudgeFn;
}

/** A deterministic check function. */
export type CheckFn = (input: EvalInput) => EvalScore | Promise<EvalScore>;

/** An LLM-as-judge handler function. */
export type JudgeHandlerFn = (input: JudgeInput) => EvalScore | Promise<EvalScore>;

/** Opaque handle for a built eval (internal). */
export interface BuiltEval {
	readonly name: string;
	readonly description?: string;
	/** @internal */ readonly _run: (input: EvalInput) => Promise<EvalScore>;
}

/** Result of evaluate() for a single dataset row. */
export interface EvalRunResult {
	input: string;
	output: string;
	expected?: string;
	scores: Record<string, EvalScore>;
}

/** Full results from evaluate(). */
export interface EvalResults {
	runs: EvalRunResult[];
	summary: Record<string, { passed: number; failed: number; total: number }>;
}
