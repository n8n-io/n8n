import type {
	GuardrailDecision,
	GuardrailModelCallContext,
	GuardrailToolCallContext,
	ModelGuardrail,
	TokenUsage,
} from '../../../types';
import { GuardrailRunner } from '../guardrail-runner';

const allow: GuardrailDecision = { action: 'allow' };
const stop = (code: string): GuardrailDecision => ({ action: 'stop', code });

function makeHook(overrides: Partial<ModelGuardrail> = {}) {
	return {
		before: vi.fn<NonNullable<ModelGuardrail['before']>>().mockResolvedValue(allow),
		after: vi.fn<NonNullable<ModelGuardrail['after']>>().mockResolvedValue(undefined),
		beforeTool: vi.fn<NonNullable<ModelGuardrail['beforeTool']>>().mockResolvedValue(allow),
		afterTool: vi.fn<NonNullable<ModelGuardrail['afterTool']>>().mockResolvedValue(undefined),
		...overrides,
	};
}

function runnerFor(hooks: ModelGuardrail[]): GuardrailRunner {
	const runner = GuardrailRunner.from({ hooks, agentId: 'agent-1', threadId: 'thread-1' });
	if (!runner) throw new Error('expected a runner');
	return runner;
}

const modelCtx: GuardrailModelCallContext = {
	callId: 'call-1',
	model: 'openai/gpt-4o-mini',
	source: 'turn',
};

const toolCtx: GuardrailToolCallContext = {
	toolCallId: 'tc-1',
	toolName: 'echo',
	input: { v: 'x' },
	runId: 'run-1',
};

describe('GuardrailRunner', () => {
	describe('from()', () => {
		it('returns undefined without options', () => {
			expect(GuardrailRunner.from(undefined)).toBeUndefined();
		});

		it('returns undefined for an empty hook list', () => {
			expect(GuardrailRunner.from({ hooks: [] })).toBeUndefined();
		});

		it('returns a runner when at least one hook is present', () => {
			expect(GuardrailRunner.from({ hooks: [makeHook()] })).toBeInstanceOf(GuardrailRunner);
		});
	});

	describe('modelCallContext()', () => {
		it('mints a distinct callId for every call', () => {
			const runner = runnerFor([makeHook()]);

			const first = runner.modelCallContext('turn', 'openai/gpt-4o-mini');
			const second = runner.modelCallContext('turn', 'openai/gpt-4o-mini');

			expect(first.callId).toEqual(expect.any(String));
			expect(first.callId).not.toBe(second.callId);
		});

		it('copies ids, model and source', () => {
			const runner = runnerFor([makeHook()]);

			const ctx = runner.modelCallContext('turn', 'openai/gpt-4o-mini');

			expect(ctx).toMatchObject({
				agentId: 'agent-1',
				threadId: 'thread-1',
				model: 'openai/gpt-4o-mini',
				source: 'turn',
			});
		});
	});

	describe('toolCallContext()', () => {
		it('copies the call fields and the ids', () => {
			const runner = runnerFor([makeHook()]);

			const ctx = runner.toolCallContext(toolCtx);

			expect(ctx).toEqual({ ...toolCtx, agentId: 'agent-1', threadId: 'thread-1' });
		});
	});

	describe('before()', () => {
		it('returns the first stop and does not call later hooks', async () => {
			const first = makeHook();
			const second = makeHook({ before: vi.fn().mockResolvedValue(stop('a')) });
			const third = makeHook({ before: vi.fn().mockResolvedValue(stop('b')) });

			const result = await runnerFor([first, second, third]).before(modelCtx);

			expect(result).toEqual({ code: 'a' });
			expect(first.before).toHaveBeenCalledWith(modelCtx);
			expect(second.before).toHaveBeenCalledWith(modelCtx);
			expect(third.before).not.toHaveBeenCalled();
		});

		it('skips hooks without before and returns undefined when all allow', async () => {
			const noBefore: ModelGuardrail = { after: vi.fn() };
			const allowing = makeHook();
			const silent = makeHook({ before: vi.fn().mockResolvedValue(undefined) });

			const result = await runnerFor([noBefore, allowing, silent]).before(modelCtx);

			expect(result).toBeUndefined();
			expect(allowing.before).toHaveBeenCalledTimes(1);
			expect(silent.before).toHaveBeenCalledTimes(1);
		});
	});

	describe('after()', () => {
		it('calls every hook with the same ctx and usage', async () => {
			const usage: TokenUsage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
			const first = makeHook();
			const noAfter: ModelGuardrail = { before: vi.fn() };
			const second = makeHook();

			await runnerFor([first, noAfter, second]).after(modelCtx, usage);

			expect(first.after).toHaveBeenCalledWith(modelCtx, usage);
			expect(second.after).toHaveBeenCalledWith(modelCtx, usage);
		});
	});

	describe('beforeTool()', () => {
		it('returns the first stop and does not call later hooks', async () => {
			const first = makeHook();
			const second = makeHook({ beforeTool: vi.fn().mockResolvedValue(stop('tool.a')) });
			const third = makeHook({ beforeTool: vi.fn().mockResolvedValue(stop('tool.b')) });

			const result = await runnerFor([first, second, third]).beforeTool(toolCtx);

			expect(result).toEqual({ code: 'tool.a' });
			expect(first.beforeTool).toHaveBeenCalledWith(toolCtx);
			expect(third.beforeTool).not.toHaveBeenCalled();
		});

		it('skips hooks without beforeTool and returns undefined when all allow', async () => {
			const noBeforeTool: ModelGuardrail = { afterTool: vi.fn() };
			const allowing = makeHook();

			const result = await runnerFor([noBeforeTool, allowing]).beforeTool(toolCtx);

			expect(result).toBeUndefined();
			expect(allowing.beforeTool).toHaveBeenCalledTimes(1);
		});
	});

	describe('afterTool()', () => {
		it('calls every hook with the same ctx and result', async () => {
			const first = makeHook();
			const noAfterTool: ModelGuardrail = { beforeTool: vi.fn() };
			const second = makeHook();
			const result = { echoed: 'x' };

			await runnerFor([first, noAfterTool, second]).afterTool(toolCtx, result);

			expect(first.afterTool).toHaveBeenCalledWith(toolCtx, result);
			expect(second.afterTool).toHaveBeenCalledWith(toolCtx, result);
		});
	});
});
