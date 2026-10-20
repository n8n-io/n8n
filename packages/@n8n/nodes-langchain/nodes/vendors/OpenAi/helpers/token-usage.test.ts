import type { IExecuteFunctions, ITaskMetadata } from 'n8n-workflow';

import { accumulateImageTokenUsage } from './token-usage';

type TokenUsage = NonNullable<ITaskMetadata['tokenUsage']>;

/**
 * Deliberately exercises the real `accumulateTokenUsage` rather than mocking it, so the
 * assertions are about what actually reaches the execution metadata.
 */
const makeContext = (previous?: TokenUsage) => {
	const setMetadata = vi.fn();
	const context = {
		getExecuteData: vi.fn().mockReturnValue(previous ? { metadata: { tokenUsage: previous } } : {}),
		setMetadata,
	} as unknown as IExecuteFunctions;

	return { context, setMetadata };
};

const storedUsage = (setMetadata: ReturnType<typeof vi.fn>): TokenUsage =>
	(setMetadata.mock.calls[0][0] as ITaskMetadata).tokenUsage as TokenUsage;

describe('accumulateImageTokenUsage', () => {
	it('should report both counts when the API returns them', () => {
		const { context, setMetadata } = makeContext();

		accumulateImageTokenUsage(context, { input_tokens: 350, output_tokens: 4160 });

		expect(setMetadata).toHaveBeenCalledTimes(1);
		expect(storedUsage(setMetadata)).toEqual({ inputTokens: 350, outputTokens: 4160 });
	});

	it('should add to a total already accumulated earlier in the execution', () => {
		const { context, setMetadata } = makeContext({ inputTokens: 100, outputTokens: 200 });

		accumulateImageTokenUsage(context, { input_tokens: 350, output_tokens: 4160 });

		expect(storedUsage(setMetadata)).toEqual({ inputTokens: 450, outputTokens: 4360 });
	});

	it('should report nothing when the response has no usage block', () => {
		const { context, setMetadata } = makeContext();

		accumulateImageTokenUsage(context, undefined);

		expect(setMetadata).not.toHaveBeenCalled();
	});

	it('should report nothing when a proxy returns an empty usage block', () => {
		const { context, setMetadata } = makeContext();

		accumulateImageTokenUsage(context, {});

		expect(setMetadata).not.toHaveBeenCalled();
	});

	it('should report nothing when usage carries only unrelated fields', () => {
		const { context, setMetadata } = makeContext();

		accumulateImageTokenUsage(context, { total_tokens: 1610 } as never);

		expect(setMetadata).not.toHaveBeenCalled();
	});

	it('should still report the one count a partial usage block does provide', () => {
		const { context, setMetadata } = makeContext();

		accumulateImageTokenUsage(context, { input_tokens: 350 });

		expect(storedUsage(setMetadata)).toEqual({ inputTokens: 350, outputTokens: 0 });
	});

	it.each([
		['string counts', { input_tokens: '350', output_tokens: '4160' }],
		['null counts', { input_tokens: null, output_tokens: null }],
		['NaN counts', { input_tokens: NaN, output_tokens: NaN }],
		['infinite counts', { input_tokens: Infinity, output_tokens: -Infinity }],
		['negative counts', { input_tokens: -350, output_tokens: -4160 }],
		['fractional counts', { input_tokens: 350.5, output_tokens: 4160.5 }],
		['counts beyond the safe integer range', { input_tokens: 2 ** 53, output_tokens: 2 ** 53 }],
	])('should ignore %s', (_label, usage) => {
		const { context, setMetadata } = makeContext();

		accumulateImageTokenUsage(context, usage as never);

		expect(setMetadata).not.toHaveBeenCalled();
	});

	it('should never reduce a total already accumulated', () => {
		const { context, setMetadata } = makeContext({ inputTokens: 100, outputTokens: 200 });

		accumulateImageTokenUsage(context, { input_tokens: -350, output_tokens: -4160 } as never);

		expect(setMetadata).not.toHaveBeenCalled();
	});

	it('should never store NaN, which would persist for the rest of the execution', () => {
		const malformed = [
			undefined,
			{},
			{ total_tokens: 1610 },
			{ input_tokens: undefined, output_tokens: undefined },
			{ input_tokens: null, output_tokens: null },
			{ input_tokens: NaN, output_tokens: NaN },
			{ input_tokens: '350', output_tokens: '4160' },
			{ input_tokens: -350, output_tokens: -4160 },
			{ input_tokens: 350.5, output_tokens: 4160.5 },
			{ input_tokens: 350 },
			{ output_tokens: 4160 },
		];

		for (const usage of malformed) {
			const { context, setMetadata } = makeContext({ inputTokens: 100, outputTokens: 200 });

			accumulateImageTokenUsage(context, usage as never);

			if (setMetadata.mock.calls.length === 0) continue;

			const { inputTokens, outputTokens } = storedUsage(setMetadata);
			expect(Number.isFinite(inputTokens)).toBe(true);
			expect(Number.isFinite(outputTokens)).toBe(true);
			expect(inputTokens).toBeGreaterThanOrEqual(100);
			expect(outputTokens).toBeGreaterThanOrEqual(200);
		}
	});
});
