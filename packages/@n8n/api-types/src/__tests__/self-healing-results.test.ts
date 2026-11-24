import { selfHealingResultContentSchema } from '../self-healing-results';

const content = {
	outcome: 'could_not_fix',
	summary: 'The service did not respond.',
	report: 'Check whether the service is available.',
};

describe('selfHealingResultContentSchema', () => {
	it.each([undefined, null])('rejects an absent usage object (%s)', (usage) => {
		expect(() => selfHealingResultContentSchema.parse({ ...content, usage })).toThrow();
	});

	it.each([
		{ credits: null },
		{ credits: 0 },
		{ credits: 0.25 },
		{ promptTokens: null, completionTokens: null, totalTokens: null },
		{ promptTokens: 0, completionTokens: 0, totalTokens: 0 },
		{ promptTokens: 10, completionTokens: 5, totalTokens: 15 },
	])('preserves known and unknown usage: %j', (measurement) => {
		const usage = { ...measurement, turns: null, durationSeconds: null };
		expect(selfHealingResultContentSchema.parse({ ...content, usage }).usage).toEqual(usage);
	});

	it.each([
		{},
		{ credits: undefined },
		{ promptTokens: 0, completionTokens: 0 },
		{ totalTokens: 15 },
		{ credits: null, totalTokens: null },
		{ promptTokens: 10, completionTokens: 5, totalTokens: 15, credits: 1 },
		{ credits: -1 },
		{ credits: Infinity },
		{ promptTokens: -1, completionTokens: 5, totalTokens: 4 },
		{ promptTokens: 10, completionTokens: 0.5, totalTokens: 10.5 },
	])('rejects incomplete or invalid usage: %j', (measurement) => {
		expect(() =>
			selfHealingResultContentSchema.parse({
				...content,
				usage: { ...measurement, turns: null, durationSeconds: null },
			}),
		).toThrow();
	});

	it('requires all usage fields', () => {
		expect(() =>
			selfHealingResultContentSchema.parse({
				...content,
				usage: { credits: 0, turns: 1 },
			}),
		).toThrow();
	});
});
