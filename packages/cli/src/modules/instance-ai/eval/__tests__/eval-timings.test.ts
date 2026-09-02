import { EvalTimings } from '../eval-timings';

function makeLogger() {
	return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

describe('EvalTimings', () => {
	const original = process.env.N8N_INSTANCE_AI_EVAL_TIMING;

	afterEach(() => {
		if (original === undefined) delete process.env.N8N_INSTANCE_AI_EVAL_TIMING;
		else process.env.N8N_INSTANCE_AI_EVAL_TIMING = original;
	});

	describe('when disabled', () => {
		beforeEach(() => {
			delete process.env.N8N_INSTANCE_AI_EVAL_TIMING;
		});

		it('runs the fn, returns its value, and records nothing', async () => {
			const timings = new EvalTimings();
			const logger = makeLogger();

			await expect(timings.time('hints', undefined, async () => 42)).resolves.toBe(42);

			timings.summary(logger as never);
			expect(logger.info).not.toHaveBeenCalled();
		});
	});

	describe('when enabled', () => {
		beforeEach(() => {
			process.env.N8N_INSTANCE_AI_EVAL_TIMING = 'true';
		});

		it('returns the wrapped fn value', async () => {
			const timings = new EvalTimings();
			await expect(timings.time('hints', undefined, async () => 'result')).resolves.toBe('result');
		});

		it('records a sample even when the wrapped fn throws', async () => {
			const timings = new EvalTimings();
			const logger = makeLogger();

			await expect(
				timings.time('http-mock', 'Node A', async () => {
					throw new Error('boom');
				}),
			).rejects.toThrow('boom');

			timings.summary(logger as never);
			const lines = logger.info.mock.calls.map((c) => String(c[0]));
			expect(lines.some((l) => l.includes('phase=http-mock') && l.includes('calls=1'))).toBe(true);
		});

		it('aggregates per-phase counts and a grand total', async () => {
			const timings = new EvalTimings();
			const logger = makeLogger();

			await timings.time('hints', undefined, async () => undefined);
			await timings.time('http-mock', 'a', async () => undefined);
			await timings.time('http-mock', 'b', async () => undefined);

			timings.summary(logger as never);
			const lines = logger.info.mock.calls.map((c) => String(c[0]));
			expect(lines.some((l) => l.includes('phase=hints') && l.includes('calls=1'))).toBe(true);
			expect(lines.some((l) => l.includes('phase=http-mock') && l.includes('calls=2'))).toBe(true);
			expect(lines.some((l) => l.includes('SUMMARY') && l.includes('llmCalls=3'))).toBe(true);
		});

		it('logs only the summary line when nothing was timed', () => {
			const timings = new EvalTimings();
			const logger = makeLogger();

			timings.summary(logger as never);
			expect(logger.info).toHaveBeenCalledTimes(1);
			expect(String(logger.info.mock.calls[0][0])).toContain('SUMMARY');
		});
	});
});
