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

	it('keeps explicitly unknown measurements', () => {
		const usage = { credits: null, turns: null, durationSeconds: null };
		expect(selfHealingResultContentSchema.parse({ ...content, usage }).usage).toEqual(usage);
	});

	it('keeps measured zero separate from unknown measurements', () => {
		const usage = { credits: 0, turns: null, durationSeconds: null };
		expect(selfHealingResultContentSchema.parse({ ...content, usage }).usage).toEqual(usage);
	});

	it('rejects unrecorded usage fields', () => {
		expect(() =>
			selfHealingResultContentSchema.parse({ ...content, usage: { credits: 0 } }),
		).toThrow();
	});
});
