import { describe, expect, it, vi } from 'vitest';

import type { JsonValue } from '../../common';
import { isBatchStepConfig } from '../../graph';
import { runBatchStep, type LoopReader } from '../batch-step';

const item = (n: number) => ({ json: { n } });

function makeReader(originalItems: JsonValue, arrivals: JsonValue[] = []): LoopReader {
	return {
		readOriginalItems: vi.fn().mockResolvedValue(originalItems),
		readArrivals: vi.fn(
			async (iteration: number) => await Promise.resolve(arrivals.slice(0, iteration)),
		),
	};
}

describe('isBatchStepConfig', () => {
	it('accepts a whole batch size of at least one', () => {
		expect(isBatchStepConfig({ batchSize: 1 })).toBe(true);
		expect(isBatchStepConfig({ batchSize: 50 })).toBe(true);
	});

	it('rejects a size that would let a pass make no progress', () => {
		expect(isBatchStepConfig({ batchSize: 0 })).toBe(false);
		expect(isBatchStepConfig({ batchSize: -1 })).toBe(false);
		expect(isBatchStepConfig({ batchSize: 1.5 })).toBe(false);
	});

	it('rejects anything that is not a config', () => {
		expect(isBatchStepConfig(null)).toBe(false);
		expect(isBatchStepConfig({})).toBe(false);
		expect(isBatchStepConfig({ batchSize: '2' })).toBe(false);
		expect(isBatchStepConfig({ nodeType: 'n8n-nodes-base.set' })).toBe(false);
	});
});

describe('runBatchStep', () => {
	const config = { batchSize: 2 };

	it('fires the loop slot with its own slice, and leaves the done slot dead', async () => {
		const reader = makeReader([item(1), item(2), item(3), item(4), item(5)]);

		expect(await runBatchStep(config, 0, reader)).toEqual({ outputs: [null, [item(1), item(2)]] });
		expect(await runBatchStep(config, 1, reader)).toEqual({ outputs: [null, [item(3), item(4)]] });
		expect(await runBatchStep(config, 2, reader)).toEqual({ outputs: [null, [item(5)]] });
	});

	it('never reads the arrivals while the loop still runs', async () => {
		const reader = makeReader([item(1), item(2), item(3)]);

		await runBatchStep(config, 0, reader);

		expect(reader.readArrivals).not.toHaveBeenCalled();
	});

	it('fires the done slot with the body output once the items run out', async () => {
		const arrivals = [[item(10)], [item(20)], [item(30)]];
		const reader = makeReader([item(1), item(2), item(3), item(4), item(5)], arrivals);

		expect(await runBatchStep(config, 3, reader)).toEqual({
			outputs: [[item(10), item(20), item(30)], null],
		});
	});

	it('concatenates the arrivals in iteration order', async () => {
		const arrivals = [[item(1), item(2)], [item(3)]];
		const reader = makeReader([], arrivals);

		expect(await runBatchStep(config, 2, reader)).toEqual({
			outputs: [[item(1), item(2), item(3)], null],
		});
	});

	it('ends at once when there are no items, firing neither slot', async () => {
		const reader = makeReader([]);

		expect(await runBatchStep(config, 0, reader)).toEqual({ outputs: [null, null] });
	});

	it('fires neither slot when the body sent nothing back', async () => {
		const reader = makeReader([item(1)], [[]]);

		expect(await runBatchStep(config, 1, reader)).toEqual({ outputs: [null, null] });
	});

	it('treats a dead arrival as empty, so a filtered body ends the loop', async () => {
		const reader = makeReader([item(1), item(2)], [[item(9)], null]);

		expect(await runBatchStep(config, 2, reader)).toEqual({ outputs: [[item(9)], null] });
	});

	it('records no pass count for a sequential loop', async () => {
		const result = await runBatchStep(config, 0, makeReader([item(1)]));

		expect(result).not.toHaveProperty('loopPassCount');
	});

	it('rejects an input the batch node cannot slice', async () => {
		const reader = makeReader({ json: { notAList: true } });

		await expect(runBatchStep(config, 0, reader)).rejects.toThrow(/slices a list/);
	});
});

describe('runBatchStep in a parallel loop', () => {
	const config = { batchSize: 2, parallel: { maxConcurrency: 3 } };

	it('records the pass count on every pass', async () => {
		const reader = makeReader([item(1), item(2), item(3), item(4), item(5)]);

		expect(await runBatchStep(config, 0, reader)).toEqual({
			outputs: [null, [item(1), item(2)]],
			loopPassCount: 3,
		});
		expect(await runBatchStep(config, 2, reader)).toEqual({
			outputs: [null, [item(5)]],
			loopPassCount: 3,
		});
	});

	it('records zero passes for an empty input, so pass 0 ends the loop', async () => {
		expect(await runBatchStep(config, 0, makeReader([]))).toEqual({
			outputs: [null, null],
			loopPassCount: 0,
		});
	});

	it('collects the arrivals in pass order on the terminal pass', async () => {
		const reader = makeReader([item(1), item(2), item(3)], [[item(10)], null]);

		expect(await runBatchStep(config, 2, reader)).toEqual({
			outputs: [[item(10)], null],
			loopPassCount: 2,
		});
	});
});

describe('isBatchStepConfig with parallel', () => {
	it('accepts a whole max concurrency of at least one', () => {
		expect(isBatchStepConfig({ batchSize: 1, parallel: { maxConcurrency: 1 } })).toBe(true);
	});

	it('rejects a max concurrency that is missing or not a whole number of at least one', () => {
		expect(isBatchStepConfig({ batchSize: 1, parallel: {} })).toBe(false);
		expect(isBatchStepConfig({ batchSize: 1, parallel: { maxConcurrency: 0 } })).toBe(false);
		expect(isBatchStepConfig({ batchSize: 1, parallel: { maxConcurrency: 2.5 } })).toBe(false);
		expect(isBatchStepConfig({ batchSize: 1, parallel: true })).toBe(false);
	});
});
