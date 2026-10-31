import { selfHealingOutputSchema } from '../self-healing';

const report = {
	summary: 'Correct the field mapping',
	report:
		'**What happened**\n\nThe field name changed.\n\n' +
		'**What changed**\n\nPrepared a correction to the field mapping. Nothing has been applied.',
};

describe('self-healing output', () => {
	it.each([
		{ outcome: 'fix_ready', candidateFilePaths: ['self-healing/candidate.workflow.ts'] },
		{
			outcome: 'fix_ready',
			candidateFilePaths: ['self-healing/a.workflow.ts', 'self-healing/b.workflow.ts'],
		},
		{ outcome: 'needs_you', candidateFilePaths: ['self-healing/candidate.workflow.ts'] },
		{ outcome: 'needs_you', candidateFilePaths: [] },
		{ outcome: 'could_not_fix', candidateFilePaths: [] },
	])('accepts $outcome with its candidate rules', (output) => {
		expect(selfHealingOutputSchema.safeParse({ ...report, ...output }).success).toBe(true);
	});

	it.each([
		{ outcome: 'fix_ready' },
		{ outcome: 'needs_you', candidateFilePaths: undefined },
		{ outcome: 'needs_you', candidateFilePaths: null },
		{ outcome: 'could_not_fix', candidateFilePaths: ['candidate.ts'] },
		{ outcome: 'needs_you', candidateFilePaths: [''] },
		{ outcome: 'needs_you', summary: ' ' },
		{ outcome: 'needs_you', report: ' ' },
		{ outcome: 'needs_you', report: 'x'.repeat(50_001) },
		{ outcome: 'failed' },
		{ outcome: 'needs_you', workflowId: 'other-workflow' },
	])('rejects invalid output %#', (output) => {
		expect(
			selfHealingOutputSchema.safeParse({ ...report, candidateFilePaths: [], ...output }).success,
		).toBe(false);
	});

	it.each([
		['x'.repeat(80), 'x'.repeat(80)],
		['x'.repeat(81), 'x'.repeat(80)],
		[`${'x'.repeat(79)}😀 trailing text`, `${'x'.repeat(79)}😀`],
	])('caps title %# at 80 code points and preserves report formatting', (summary, expected) => {
		const output = {
			...report,
			outcome: 'needs_you',
			summary,
			candidateFilePaths: [],
		};
		expect(selfHealingOutputSchema.parse(output)).toEqual({ ...output, summary: expected });
	});

	it('rejects missing and malformed output', () => {
		expect(selfHealingOutputSchema.safeParse(undefined).success).toBe(false);
		expect(selfHealingOutputSchema.safeParse('could_not_fix').success).toBe(false);
	});
});
