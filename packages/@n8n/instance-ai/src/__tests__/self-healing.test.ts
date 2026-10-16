import { selfHealingOutputSchema } from '../self-healing';

const report = {
	summary: 'Correct the field mapping',
	report:
		'**What happened**\n\nThe field name changed.\n\n' +
		'**What changed**\n\nPrepared a correction to the field mapping. Nothing has been applied.',
};

describe('self-healing output', () => {
	it.each([
		{ outcome: 'fix_ready', candidateFilePath: 'self-healing/candidate.workflow.ts' },
		{ outcome: 'needs_you', candidateFilePath: 'self-healing/candidate.workflow.ts' },
		{ outcome: 'needs_you' },
		{ outcome: 'could_not_fix' },
	])('accepts $outcome with its candidate rules', (output) => {
		expect(selfHealingOutputSchema.safeParse({ ...report, ...output }).success).toBe(true);
	});

	it.each([
		{ outcome: 'fix_ready' },
		{ outcome: 'could_not_fix', candidateFilePath: 'candidate.ts' },
		{ outcome: 'needs_you', candidateFilePath: '' },
		{ outcome: 'needs_you', summary: ' ' },
		{ outcome: 'needs_you', summary: 'x'.repeat(81) },
		{ outcome: 'needs_you', report: ' ' },
		{ outcome: 'needs_you', report: 'x'.repeat(50_001) },
		{ outcome: 'failed' },
		{ outcome: 'needs_you', workflowId: 'other-workflow' },
	])('rejects invalid output %#', (output) => {
		expect(selfHealingOutputSchema.safeParse({ ...report, ...output }).success).toBe(false);
	});

	it('accepts a title at the character limit and preserves report formatting', () => {
		const output = { ...report, outcome: 'needs_you', summary: 'x'.repeat(80) };
		expect(selfHealingOutputSchema.parse(output)).toEqual(output);
	});

	it('rejects missing and malformed output', () => {
		expect(selfHealingOutputSchema.safeParse(undefined).success).toBe(false);
		expect(selfHealingOutputSchema.safeParse('could_not_fix').success).toBe(false);
	});
});
