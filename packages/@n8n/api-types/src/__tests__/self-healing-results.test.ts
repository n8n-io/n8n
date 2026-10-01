import { selfHealingResultContentSchema } from '../self-healing-results';

const content = {
	outcome: 'could_not_fix',
	summary: 'The service did not respond.',
	report: 'Check whether the service is available.',
};

describe('selfHealingResultContentSchema', () => {
	it('keeps missing measurements unknown', () => {
		expect(selfHealingResultContentSchema.parse(content)).toEqual({
			...content,
			usage: null,
			trace: null,
		});
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

	it.each([
		{ kind: 'tool', label: 'Read workflow', text: 'Read the saved graph.' },
		{ kind: 'event', label: 'Finished', text: '', messages: [] },
		{ kind: 'tool', label: 'Read workflow', text: '', toolName: 'read_workflow', input: {} },
	])('rejects unsupported trace content', (entry) => {
		expect(() => selfHealingResultContentSchema.parse({ ...content, trace: [entry] })).toThrow();
	});

	it('bounds trace count and entry text', () => {
		const entry = { kind: 'event', label: 'Finished', text: '' };
		expect(() =>
			selfHealingResultContentSchema.parse({ ...content, trace: Array(101).fill(entry) }),
		).toThrow();
		expect(() =>
			selfHealingResultContentSchema.parse({
				...content,
				trace: [{ ...entry, text: 'x'.repeat(4001) }],
			}),
		).toThrow();
	});
});
