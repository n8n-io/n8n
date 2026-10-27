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

		expect(await runBatchStep(config, 0, reader)).toEqual([null, [item(1), item(2)]]);
		expect(await runBatchStep(config, 1, reader)).toEqual([null, [item(3), item(4)]]);
		expect(await runBatchStep(config, 2, reader)).toEqual([null, [item(5)]]);
	});

	it('never reads the arrivals while the loop still runs', async () => {
		const reader = makeReader([item(1), item(2), item(3)]);

		await runBatchStep(config, 0, reader);

		expect(reader.readArrivals).not.toHaveBeenCalled();
	});

	it('fires the done slot with the body output once the items run out', async () => {
		const arrivals = [[item(10)], [item(20)], [item(30)]];
		const reader = makeReader([item(1), item(2), item(3), item(4), item(5)], arrivals);

		expect(await runBatchStep(config, 3, reader)).toEqual([[item(10), item(20), item(30)], null]);
	});

	it('concatenates the arrivals in iteration order', async () => {
		const arrivals = [[item(1), item(2)], [item(3)]];
		const reader = makeReader([], arrivals);

		expect(await runBatchStep(config, 2, reader)).toEqual([[item(1), item(2), item(3)], null]);
	});

	it('ends at once when there are no items, firing neither slot', async () => {
		const reader = makeReader([]);

		expect(await runBatchStep(config, 0, reader)).toEqual([null, null]);
	});

	it('fires neither slot when the body sent nothing back', async () => {
		const reader = makeReader([item(1)], [[]]);

		expect(await runBatchStep(config, 1, reader)).toEqual([null, null]);
	});

	it('treats a dead arrival as empty, so a filtered body ends the loop', async () => {
		const reader = makeReader([item(1), item(2)], [[item(9)], null]);

		expect(await runBatchStep(config, 2, reader)).toEqual([[item(9)], null]);
	});

	it('rejects an input the batch node cannot slice', async () => {
		const reader = makeReader({ json: { notAList: true } });

		await expect(runBatchStep(config, 0, reader)).rejects.toThrow(/slices a list/);
	});
});
