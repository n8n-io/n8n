import { describe, expect, it, vi } from 'vitest';

import { ExpressionExtensionError } from '../../extensions/expression-extension-error';
import {
	canVerifyNatively,
	evaluateNatively,
	isNativelyEvaluable,
	nativeSkeleton,
	NativeVerifier,
} from '../index';

describe('native-evaluation', () => {
	describe('evaluateNatively', () => {
		it('evaluates expressions in the closed subset against WorkflowData', () => {
			const data = {
				$json: { name: 'ada', scores: [1, 2, 3] },
				$: (name: string) => ({
					first: () => ({ json: { source: name } }),
				}),
				$node: {
					Source: { json: { tag: 'v1' } },
				},
			};

			expect(evaluateNatively('{{ $json.name.toUpperCase() }}', data)).toEqual({
				handled: true,
				value: 'ADA',
			});
			expect(evaluateNatively('{{ $json.scores.map(n => n * 2) }}', data)).toEqual({
				handled: true,
				value: [2, 4, 6],
			});
			expect(evaluateNatively("{{ $('Source').first().json.source }}", data)).toEqual({
				handled: true,
				value: 'Source',
			});
			expect(evaluateNatively("{{ $node['Source'].json.tag }}", data)).toEqual({
				handled: true,
				value: 'v1',
			});
		});

		it('handles missing $ or $node by returning undefined like tournament', () => {
			expect(evaluateNatively("{{ $('Source').first().json.a }}", {})).toEqual({
				handled: true,
				value: undefined,
			});
			expect(evaluateNatively("{{ $node['Source'].json.a }}", {})).toEqual({
				handled: true,
				value: undefined,
			});
		});

		it('declines unsafe property names at parse time', () => {
			expect(isNativelyEvaluable("{{ $json['__proto__'] }}")).toBe(false);
			expect(isNativelyEvaluable('{{ $json.constructor }}')).toBe(false);
			expect(isNativelyEvaluable("{{ $('__proto__').item.json }}")).toBe(false);
		});

		it('rethrows runtime ExpressionExtensionError from extend()', () => {
			expect(() =>
				evaluateNatively('{{ $json.name.first() }}', { $json: { name: 'abc' } }),
			).toThrow(ExpressionExtensionError);
		});

		it('rethrows host ExpressionError by name by default and swallows plain errors', () => {
			const hostError = new Error('No execution data');
			hostError.name = 'ExpressionError';

			const throwingData = {
				get $json(): unknown {
					throw hostError;
				},
			};
			expect(() => evaluateNatively('{{ $json.a }}', throwingData)).toThrow(hostError);

			const plainErrorData = {
				get $json(): unknown {
					throw new Error('plain failure');
				},
			};
			expect(evaluateNatively('{{ $json.a }}', plainErrorData)).toEqual({
				handled: true,
				value: undefined,
			});
		});

		it('uses injected shouldRethrowError even when error class name is renamed', () => {
			class MinifiedHostError extends Error {
				constructor(message: string) {
					super(message);
					this.name = 'Xe';
				}
			}

			const hostError = new MinifiedHostError('No execution data');
			const throwingData = {
				get $json(): unknown {
					throw hostError;
				},
			};

			expect(evaluateNatively('{{ $json.a }}', throwingData)).toEqual({
				handled: true,
				value: undefined,
			});
			expect(() =>
				evaluateNatively('{{ $json.a }}', throwingData, {
					shouldRethrowError: (error) => error instanceof MinifiedHostError,
				}),
			).toThrow(hostError);
		});
	});

	describe('verify', () => {
		it('builds masked skeletons and skips clock or parameter expressions', () => {
			expect(nativeSkeleton('{{ $json.secret.toUpperCase() }}')).toBe(
				'{{ $json.<id>.toUpperCase() }}',
			);
			expect(canVerifyNatively('{{ $json.a }}')).toBe(true);
			expect(canVerifyNatively('{{ $now.toMillis() }}')).toBe(false);
			expect(canVerifyNatively('{{ $parameter.a }}')).toBe(false);
		});

		it('reports mismatches with workflowId and warns through injected logger at the limit', () => {
			const report = vi.fn();
			const warn = vi.fn();
			const verifier = new NativeVerifier(1, report, () => true, { warn });

			verifier.compare(
				'{{ $json.name }}',
				'vm',
				{ ok: true, value: 'a' },
				{ ok: true, value: 'b' },
				{ $workflow: { id: 'wf-42' } },
			);

			expect(report).toHaveBeenCalledExactlyOnceWith({
				skeleton: '{{ $json.<id> }}',
				engine: 'vm',
				nativeResultType: 'string',
				engineResultType: 'string',
				workflowId: 'wf-42',
			});

			const reportedShapes = (verifier as unknown as { reportedShapes: Set<string> })
				.reportedShapes;
			while (reportedShapes.size < 999) {
				reportedShapes.add(`shape-${reportedShapes.size}`);
			}

			verifier.compare(
				'{{ $json.name.trim() }}',
				'vm',
				{ ok: true, value: 'a' },
				{ ok: true, value: 'b' },
				{},
			);

			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toContain('report limit');
		});
	});
});
