import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import type { LlmUsage } from '../llm-usage.entity';
import { LlmUsageRepository } from '../llm-usage.repository';

let repository: LlmUsageRepository;

const day = (offset: number) => new Date(Date.UTC(2026, 9, 10 + offset, 12));

let sequence = 0;
const row = (overrides: Partial<LlmUsage> = {}): Partial<LlmUsage> => ({
	callId: `call-${++sequence}`,
	finishedAt: day(0),
	callerType: 'node',
	provider: 'openai',
	model: 'gpt-4o-mini',
	inputTokens: 10,
	outputTokens: 5,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
	estimatedCostUsd: 0.5,
	priced: true,
	...overrides,
});

beforeAll(async () => {
	await testModules.loadModules(['llm-usage'], {
		'llm-usage': async () => await import('../llm-usage.module.js'),
	});
	await testDb.init();
	repository = Container.get(LlmUsageRepository);
});

beforeEach(async () => {
	await repository.delete({});
});

afterAll(async () => {
	await testDb.terminate();
});

describe('LlmUsageRepository', () => {
	it('stores a call once when the same call ID is inserted twice', async () => {
		const call = row({ callId: 'same-call' });

		await repository.insertIgnoringDuplicates([call]);
		await repository.insertIgnoringDuplicates([call, row()]);

		expect(await repository.count()).toBe(2);
	});

	it('finds unpriced calls since a date and stores their prices', async () => {
		const unpriced = { estimatedCostUsd: null, priced: false };
		await repository.insertIgnoringDuplicates([
			row({ callId: 'old', finishedAt: day(-3), ...unpriced }),
			row({ callId: 'new', ...unpriced }),
			row({ callId: 'priced' }),
		]);

		const calls = await repository.findUnpriced(day(-1), 10);
		expect(calls).toEqual([
			expect.objectContaining({ provider: 'openai', model: 'gpt-4o-mini', inputTokens: 10 }),
		]);

		await repository.setPrices([{ callId: calls[0].callId, estimatedCostUsd: 0.25 }]);

		expect(await repository.findUnpriced(day(-1), 10)).toEqual([]);
		expect(await repository.findOneByOrFail({ callId: 'new' })).toMatchObject({
			estimatedCostUsd: 0.25,
			priced: true,
		});
	});

	it('reads unpriced calls page by page and never changes a priced call', async () => {
		const unpriced = { estimatedCostUsd: null, priced: false };
		await repository.insertIgnoringDuplicates([
			row({ callId: 'a', ...unpriced }),
			row({ callId: 'b', ...unpriced }),
			row({ callId: 'c', estimatedCostUsd: 1 }),
		]);

		const first = await repository.findUnpriced(day(-1), 1);
		const second = await repository.findUnpriced(day(-1), 1, first[0].callId);
		expect([...first, ...second].map((call) => call.callId)).toEqual(['a', 'b']);

		await repository.setPrices([{ callId: 'c', estimatedCostUsd: 9 }]);
		expect(await repository.findOneByOrFail({ callId: 'c' })).toMatchObject({
			estimatedCostUsd: 1,
		});
	});

	it('cuts a value longer than its column instead of failing the batch', async () => {
		await repository.insertIgnoringDuplicates([
			row({ callId: 'long', threadId: 't'.repeat(200) }),
			row({ callId: 'short' }),
		]);

		expect(await repository.count()).toBe(2);
		const long = await repository.findOneByOrFail({ callId: 'long' });
		expect(long.threadId).toHaveLength(128);
	});

	it('stores many prices at once, in chunks', async () => {
		const callIds = Array.from({ length: 250 }, (_, index) => `call-${index}`);
		await repository.insertIgnoringDuplicates(
			callIds.map((callId) => row({ callId, estimatedCostUsd: null, priced: false })),
		);

		await repository.setPrices(callIds.map((callId) => ({ callId, estimatedCostUsd: 0.5 })));

		expect(await repository.findUnpriced(day(-1), 10)).toEqual([]);
		expect(await repository.findOneByOrFail({ callId: 'call-249' })).toMatchObject({
			estimatedCostUsd: 0.5,
			priced: true,
		});
	});
});
