import { filterLlmMessages } from './message';
import { AgentRuntime } from '../runtime/agent-runtime';
import type { BuiltEval, CheckFn, EvalInput, EvalScore, JudgeFn, JudgeHandlerFn } from '../types';
import type { AgentMessage } from '../types/sdk/message';

/** Extract text content from LLM messages (custom messages are skipped). */
function extractText(messages: AgentMessage[]): string {
	return filterLlmMessages(messages)
		.flatMap((m) => m.content)
		.filter((c) => c.type === 'text')
		.map((c) => (c as { text: string }).text)
		.join('');
}

/**
 * Builder for creating evaluations with a fluent API.
 *
 * Two modes:
 * - **Deterministic**: `.check(fn)` — pure function scoring
 * - **LLM-as-judge**: `.model()` + `.credential()` + `.judge(fn)` — LLM-powered scoring
 *
 * Usage:
 * ```typescript
 * // Deterministic
 * const jsonCheck = new Eval('json-check')
 *   .description('Verify output is valid JSON')
 *   .check(({ output }) => {
 *     try { JSON.parse(output); return { score: 1, reasoning: 'Valid JSON' }; }
 *     catch { return { score: 0, reasoning: 'Invalid JSON' }; }
 *   });
 *
 * // LLM-as-judge
 * const correctness = new Eval('correctness')
 *   .description('Judge factual correctness')
 *   .model('anthropic/claude-haiku-4-5')
 *   .credential('anthropic')
 *   .judge(async ({ input, output, expected, llm }) => {
 *     const result = await llm(`Is "${output}" correct for "${input}"? Expected: ${expected}`);
 *     const score = parseFloat(result.text.match(/[\d.]+/)?.[0] ?? '0');
 *     return { score: Math.min(1, Math.max(0, score)), reasoning: result.text };
 *   });
 * ```
 */
export class Eval {
	private evalName: string;

	private desc?: string;

	private checkFn?: CheckFn;

	private judgeFn?: JudgeHandlerFn;

	private modelId?: string;

	private credentialName?: string;

	private _resolvedApiKey?: string;

	constructor(name: string) {
		this.evalName = name;
	}

	/** Human-readable description of what this eval measures. */
	description(desc: string): this {
		this.desc = desc;
		return this;
	}

	/** Set the judge model (LLM-as-judge mode). */
	model(modelId: string): this {
		this.modelId = modelId;
		return this;
	}

	/** Declare a credential for the judge model. */
	credential(name: string): this {
		this.credentialName = name;
		return this;
	}

	/** @internal Read the declared credential name (used by the execution engine). */
	protected get declaredCredential(): string | undefined {
		return this.credentialName;
	}

	/** @internal Set the resolved API key for the judge model. */
	protected set resolvedApiKey(key: string) {
		this._resolvedApiKey = key;
	}

	/**
	 * Set a deterministic check function.
	 * Mutually exclusive with `.judge()`.
	 */
	check(fn: CheckFn): this {
		if (this.judgeFn) {
			throw new Error(`Eval "${this.evalName}": cannot use both .check() and .judge()`);
		}
		this.checkFn = fn;
		return this;
	}

	/**
	 * Set an LLM-as-judge handler. Requires `.model()` and `.credential()`.
	 * The handler receives `{ input, output, expected, llm }` where `llm`
	 * is a callable function bound to the judge model.
	 * Mutually exclusive with `.check()`.
	 */
	judge(fn: JudgeHandlerFn): this {
		if (this.checkFn) {
			throw new Error(`Eval "${this.evalName}": cannot use both .check() and .judge()`);
		}
		this.judgeFn = fn;
		return this;
	}

	/** The eval name. */
	get name(): string {
		return this.evalName;
	}

	/** @internal Build the eval into a runnable form. */
	protected build(): BuiltEval {
		if (!this.checkFn && !this.judgeFn) {
			throw new Error(`Eval "${this.evalName}" requires either .check() or .judge()`);
		}

		if (this.judgeFn && !this.modelId) {
			throw new Error(`Eval "${this.evalName}" uses .judge() but no .model() was set`);
		}

		const name = this.evalName;
		const desc = this.desc;

		if (this.checkFn) {
			const checkFn = this.checkFn;
			return {
				name,
				description: desc,
				_run: async (input: EvalInput) => await checkFn(input),
			};
		}

		// LLM-as-judge mode
		const judgeFn = this.judgeFn!;
		const modelConfig: string | { id: `${string}/${string}`; apiKey: string } = this._resolvedApiKey
			? { id: this.modelId! as `${string}/${string}`, apiKey: this._resolvedApiKey }
			: this.modelId!;

		const runtime = new AgentRuntime({
			name: `${name}-judge`,
			model: modelConfig,
			instructions: 'You are an evaluation judge. Respond precisely as instructed.',
		});

		const llm: JudgeFn = async (prompt: string) => {
			const result = await runtime.generate([
				{ role: 'user', content: [{ type: 'text', text: prompt }] },
			]);
			return { text: extractText(result.messages) };
		};

		return {
			name,
			description: desc,
			_run: async (input: EvalInput) => await judgeFn({ ...input, llm }),
		};
	}

	/** @internal Ensure the eval is built (lazy). */
	private _built?: BuiltEval;

	/** @internal */
	ensureBuilt(): BuiltEval {
		this._built ??= this.build();
		return this._built;
	}

	/** Run this eval against a single input. Lazy-builds on first call. */
	async run(input: EvalInput): Promise<EvalScore> {
		return await this.ensureBuilt()._run(input);
	}
}
