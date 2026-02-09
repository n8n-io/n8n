/**
 * Tests for evaluation helper utilities.
 */

import pLimit from 'p-limit';

import { withTimeout, extractSubgraphMetrics } from '../harness/evaluation-helpers';

describe('evaluation-helpers', () => {
	describe('withTimeout()', () => {
		it('should allow p-limit slot to be released when timeout triggers (best-effort)', async () => {
			jest.useFakeTimers();
			const limit = pLimit(1);
			const started: string[] = [];

			const never = new Promise<void>(() => {
				// never resolves
			});

			const p1 = limit(async () => {
				started.push('p1');
				await withTimeout({ promise: never, timeoutMs: 10, label: 'p1' });
			}).catch(() => {
				// expected timeout
			});

			// Give p1 a chance to start.
			await Promise.resolve();

			const p2 = limit(async () => {
				started.push('p2');
			});

			jest.advanceTimersByTime(11);
			await Promise.resolve();
			await Promise.resolve();

			await expect(p2).resolves.toBeUndefined();
			expect(started).toEqual(['p1', 'p2']);

			await p1;
			jest.useRealTimers();
		});
	});

	describe('extractSubgraphMetrics()', () => {
		it('should return empty object when both inputs are undefined', () => {
			const result = extractSubgraphMetrics(undefined, undefined);
			expect(result).toEqual({});
		});

		it.each([
			{ nodeCount: 5, expected: { nodeCount: 5 } },
			{ nodeCount: 0, expected: { nodeCount: 0 } },
		])('should include nodeCount of $nodeCount when provided', ({ nodeCount, expected }) => {
			const result = extractSubgraphMetrics(undefined, nodeCount);
			expect(result).toEqual(expected);
		});

		it.each([
			{
				phase: 'discovery' as const,
				metricKey: 'discoveryDurationMs',
				startTs: 1000,
				endTs: 1500,
				expectedDuration: 500,
			},
			{
				phase: 'builder' as const,
				metricKey: 'builderDurationMs',
				startTs: 2000,
				endTs: 3500,
				expectedDuration: 1500,
			},
			{
				phase: 'responder' as const,
				metricKey: 'responderDurationMs',
				startTs: 5000,
				endTs: 5800,
				expectedDuration: 800,
			},
		])(
			'should calculate $phase duration from in_progress to completed',
			({ phase, metricKey, startTs, endTs, expectedDuration }) => {
				const coordinationLog = [
					{ phase, status: 'in_progress' as const, timestamp: startTs },
					{ phase, status: 'completed' as const, timestamp: endTs },
				];
				const result = extractSubgraphMetrics(coordinationLog, undefined);
				expect(result).toEqual({ [metricKey]: expectedDuration });
			},
		);

		it('should calculate duration from first to last entry when no in_progress status', () => {
			const coordinationLog = [
				{ phase: 'discovery' as const, status: 'completed' as const, timestamp: 1000 },
				{ phase: 'discovery' as const, status: 'completed' as const, timestamp: 1800 },
			];
			const result = extractSubgraphMetrics(coordinationLog, undefined);
			expect(result).toEqual({ discoveryDurationMs: 800 });
		});

		it('should ignore state_management phase', () => {
			const coordinationLog = [
				{ phase: 'state_management' as const, status: 'in_progress' as const, timestamp: 500 },
				{ phase: 'state_management' as const, status: 'completed' as const, timestamp: 600 },
			];
			const result = extractSubgraphMetrics(coordinationLog, undefined);
			expect(result).toEqual({});
		});

		it('should return undefined for phase with only one entry', () => {
			const coordinationLog = [
				{ phase: 'discovery' as const, status: 'completed' as const, timestamp: 1000 },
			];
			const result = extractSubgraphMetrics(coordinationLog, undefined);
			expect(result).toEqual({});
		});

		it('should return empty object for empty coordination log', () => {
			const result = extractSubgraphMetrics([], undefined);
			expect(result).toEqual({});
		});

		it('should calculate all phase durations together with nodeCount', () => {
			const coordinationLog = [
				{ phase: 'discovery' as const, status: 'in_progress' as const, timestamp: 1000 },
				{ phase: 'discovery' as const, status: 'completed' as const, timestamp: 1500 },
				{ phase: 'builder' as const, status: 'in_progress' as const, timestamp: 2000 },
				{ phase: 'builder' as const, status: 'completed' as const, timestamp: 4000 },
				{ phase: 'responder' as const, status: 'in_progress' as const, timestamp: 4500 },
				{ phase: 'responder' as const, status: 'completed' as const, timestamp: 5000 },
			];
			const result = extractSubgraphMetrics(coordinationLog, 8);
			expect(result).toEqual({
				nodeCount: 8,
				discoveryDurationMs: 500,
				builderDurationMs: 2000,
				responderDurationMs: 500,
			});
		});
	});
});
