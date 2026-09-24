import type {
	GuardrailDecision,
	GuardrailModelCallContext,
	GuardrailModelCallSource,
	GuardrailStop,
	GuardrailToolCallContext,
	GuardrailsOptions,
	ModelGuardrail,
	TokenUsage,
} from '../../types';

type GuardrailIds = Pick<GuardrailsOptions, 'agentId' | 'threadId'>;

/**
 * Calls the host-supplied guardrail hooks around model and tool calls. Hooks
 * run in list order, one at a time. The first `stop` wins. The runner holds
 * no per-run state; each call site asks it fresh.
 */
export class GuardrailRunner {
	private constructor(
		private readonly hooks: ModelGuardrail[],
		private readonly ids: GuardrailIds,
	) {}

	/** `undefined` when there is nothing to run, so call sites can skip all work. */
	static from(options: GuardrailsOptions | undefined): GuardrailRunner | undefined {
		if (!options || options.hooks.length === 0) return undefined;
		return new GuardrailRunner(options.hooks, {
			agentId: options.agentId,
			threadId: options.threadId,
		});
	}

	modelCallContext(source: GuardrailModelCallSource, model: string): GuardrailModelCallContext {
		return { callId: crypto.randomUUID(), ...this.ids, model, source };
	}

	toolCallContext(call: {
		toolCallId: string;
		toolName: string;
		input: unknown;
		runId: string;
	}): GuardrailToolCallContext {
		return { ...call, ...this.ids };
	}

	async before(ctx: GuardrailModelCallContext): Promise<GuardrailStop | undefined> {
		return await this.firstStop((hook) => hook.before, ctx);
	}

	async after(ctx: GuardrailModelCallContext, usage: TokenUsage | undefined): Promise<void> {
		for (const hook of this.hooks) {
			await hook.after?.(ctx, usage);
		}
	}

	async beforeTool(ctx: GuardrailToolCallContext): Promise<GuardrailStop | undefined> {
		return await this.firstStop((hook) => hook.beforeTool, ctx);
	}

	async afterTool(ctx: GuardrailToolCallContext, result: unknown): Promise<void> {
		for (const hook of this.hooks) {
			await hook.afterTool?.(ctx, result);
		}
	}

	private async firstStop<C>(
		pick: (
			hook: ModelGuardrail,
		) => ((ctx: C) => Promise<GuardrailDecision | undefined>) | undefined,
		ctx: C,
	): Promise<GuardrailStop | undefined> {
		for (const hook of this.hooks) {
			const fn = pick(hook);
			if (!fn) continue;
			const decision = await fn.call(hook, ctx);
			if (decision?.action === 'stop') return { code: decision.code };
		}
		return undefined;
	}
}
