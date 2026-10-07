import type { ExpressionEvaluationOutcome, ExpressionShadowContext } from 'n8n-workflow';

import { MAX_MISMATCH_SHAPES, QuickJsExpressionShadow } from './shadowRunner';

const context = (source: string): ExpressionShadowContext => ({
	expression: source,
	source,
	data: {} as ExpressionShadowContext['data'],
	timezone: 'UTC',
});

const ok = (value: unknown): ExpressionEvaluationOutcome => ({ ok: true, value });
const failed = (errorClass: string): ExpressionEvaluationOutcome => ({
	ok: false,
	error: new Error(errorClass),
	errorClass,
});

function createShadow(quickjs: ExpressionEvaluationOutcome, options: { random?: number } = {}) {
	const evaluate = vi.fn(() => quickjs);
	const shadow = new QuickJsExpressionShadow({
		evaluator: { evaluate },
		sampleRate: 10,
		random: () => options.random ?? 0,
		now: () => 0,
	});
	return { shadow, evaluate };
}

function run(shadow: QuickJsExpressionShadow, source: string, legacy: ExpressionEvaluationOutcome) {
	const finish = shadow.beforeLegacy(context(source));
	finish?.(legacy);
}

describe('QuickJsExpressionShadow', () => {
	it('evaluates only one in N expressions', () => {
		const { shadow, evaluate } = createShadow(ok(1), { random: 0.1 });

		expect(shadow.beforeLegacy(context('{{ 1 }}'))).toBeUndefined();
		expect(evaluate).not.toHaveBeenCalled();
	});

	it('runs QuickJS before the legacy engine', () => {
		const { shadow, evaluate } = createShadow(ok(1));

		const finish = shadow.beforeLegacy(context('{{ 1 }}'));

		expect(evaluate).toHaveBeenCalledWith('{{ 1 }}', {}, 'UTC');
		expect(finish).toBeTypeOf('function');
	});

	it.each([
		['same', ok({ a: 1, b: 2 }), ok({ b: 2, a: 1 }), '{{ $json }}'],
		['different', ok('1'), ok(1), '{{ $json.a }}'],
		['unchecked', ok('a'), ok('b'), '{{ $now.toISO() }}'],
		['legacy_ok_quickjs_error', ok(1), failed('timeout'), '{{ $json.a }}'],
		['legacy_error_quickjs_ok', failed('TypeError'), ok(1), '{{ $json.a }}'],
		['both_error', failed('TypeError'), failed('TypeError'), '{{ $json.a }}'],
	] as const)('counts a %s outcome', (outcome, legacy, quickjs, source) => {
		const { shadow } = createShadow(quickjs);

		run(shadow, source, legacy);

		expect(shadow.takeReport()).toMatchObject({ evaluations: 1, [outcome]: 1 });
	});

	it('reports the shape of a mismatch, never the expression or the values', () => {
		const { shadow } = createShadow(failed('timeout'));

		run(shadow, '{{ $json.secret.toUpperCase() }}', ok('TOP SECRET'));
		run(shadow, '{{ $json.other.toUpperCase() }}', ok('ALSO SECRET'));

		const report = shadow.takeReport();
		expect(report?.mismatches).toEqual([
			{
				outcome: 'legacy_ok_quickjs_error',
				skeleton: '{{ $json.<id>.toUpperCase() }}',
				legacy_type: 'string',
				quickjs_type: 'error',
				error_class: 'timeout',
				count: 2,
			},
		]);
		expect(JSON.stringify(report)).not.toMatch(/secret/i);
	});

	it('caps the number of distinct mismatch shapes', () => {
		const { shadow } = createShadow(ok('quickjs'));

		for (let index = 0; index < MAX_MISMATCH_SHAPES + 5; index++) {
			run(shadow, `{{ $json.a${'.toString()'.repeat(index)} }}`, ok('legacy'));
		}

		const report = shadow.takeReport();
		expect(report?.different).toBe(MAX_MISMATCH_SHAPES + 5);
		expect(report?.mismatches).toHaveLength(MAX_MISMATCH_SHAPES);
	});

	it('puts each engine latency in its bucket', () => {
		let clock = 0;
		const shadow = new QuickJsExpressionShadow({
			evaluator: {
				evaluate: () => {
					clock += 3;
					return ok(1);
				},
			},
			sampleRate: 1,
			random: () => 0,
			now: () => clock,
		});

		const finish = shadow.beforeLegacy(context('{{ 1 }}'));
		clock += 0.2;
		finish?.(ok(1));

		const report = shadow.takeReport();
		// Bounds: 0.1, 0.5, 1, 2, 5, ... so 0.2 ms is bucket 1 and 3 ms is bucket 4.
		expect(report?.legacy_latency_buckets[1]).toBe(1);
		expect(report?.quickjs_latency_buckets[4]).toBe(1);
	});

	it('does not sample nested evaluations of a sampled expression', () => {
		const { shadow, evaluate } = createShadow(ok(1));

		const finish = shadow.beforeLegacy(context('{{ $parameter.a }}'));
		// The legacy engine resolves another parameter while it runs.
		expect(shadow.beforeLegacy(context('{{ 2 }}'))).toBeUndefined();
		finish?.(ok(1));

		expect(evaluate).toHaveBeenCalledTimes(1);
		expect(shadow.beforeLegacy(context('{{ 3 }}'))).toBeTypeOf('function');
	});

	it('keeps sampling after the QuickJS evaluator throws', () => {
		const evaluate = vi
			.fn<() => ExpressionEvaluationOutcome>()
			.mockImplementationOnce(() => {
				throw new Error('bridge failure');
			})
			.mockReturnValue(ok(1));
		const shadow = new QuickJsExpressionShadow({
			evaluator: { evaluate },
			sampleRate: 1,
			random: () => 0,
			now: () => 0,
		});

		expect(() => shadow.beforeLegacy(context('{{ 1 }}'))).toThrow('bridge failure');
		expect(shadow.beforeLegacy(context('{{ 2 }}'))).toBeTypeOf('function');
	});

	it('resets the counts after a report', () => {
		const { shadow } = createShadow(ok(1));
		run(shadow, '{{ 1 }}', ok(1));

		expect(shadow.takeReport()).toBeDefined();
		expect(shadow.takeReport()).toBeUndefined();
	});
});
