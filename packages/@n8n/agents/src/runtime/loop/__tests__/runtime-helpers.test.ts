import type { TokenUsage } from '../../../types/sdk/agent';
import { accumulateUsage, mergeUsage } from '../runtime-helpers';

describe('mergeUsage — input token details', () => {
	it('sums noCache across both sides', () => {
		const a: TokenUsage = {
			promptTokens: 10,
			completionTokens: 5,
			totalTokens: 15,
			inputTokenDetails: { noCache: 10 },
		};
		const b: TokenUsage = {
			promptTokens: 20,
			completionTokens: 3,
			totalTokens: 23,
			inputTokenDetails: { noCache: 20 },
		};

		const merged = mergeUsage(a, b);

		expect(merged?.inputTokenDetails).toEqual({ noCache: 30 });
	});

	it('preserves noCache when only one side carries it', () => {
		const a: TokenUsage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
		const b: TokenUsage = {
			promptTokens: 20,
			completionTokens: 3,
			totalTokens: 23,
			inputTokenDetails: { noCache: 20 },
		};

		const merged = mergeUsage(a, b);

		expect(merged?.inputTokenDetails).toMatchObject({ noCache: 20 });
	});

	it('sums noCache alongside cacheRead and cacheWrite', () => {
		const a: TokenUsage = {
			promptTokens: 30,
			completionTokens: 5,
			totalTokens: 35,
			inputTokenDetails: { noCache: 10, cacheRead: 5, cacheWrite: 15 },
		};
		const b: TokenUsage = {
			promptTokens: 30,
			completionTokens: 5,
			totalTokens: 35,
			inputTokenDetails: { noCache: 20, cacheRead: 5, cacheWrite: 5 },
		};

		const merged = mergeUsage(a, b);

		expect(merged?.inputTokenDetails).toEqual({ noCache: 30, cacheRead: 10, cacheWrite: 20 });
	});
});

describe('accumulateUsage — input token details', () => {
	it('carries noCacheTokens from the raw AI SDK usage into the running total', () => {
		const current: TokenUsage = {
			promptTokens: 10,
			completionTokens: 5,
			totalTokens: 15,
			inputTokenDetails: { noCache: 10 },
		};

		const accumulated = accumulateUsage(current, {
			inputTokens: 20,
			outputTokens: 3,
			totalTokens: 23,
			inputTokenDetails: { noCacheTokens: 20 },
		});

		expect(accumulated?.inputTokenDetails).toMatchObject({ noCache: 30 });
	});
});
