import { selfHealingOutputSchema, selfHealingThreadMetadataSchema } from '../self-healing';

const report = { summary: 'Correct the field mapping.', report: 'The field name changed.' };

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
		{ outcome: 'needs_you', summary: 'x'.repeat(501) },
		{ outcome: 'needs_you', report: ' ' },
		{ outcome: 'needs_you', report: 'x'.repeat(50_001) },
		{ outcome: 'failed' },
		{ outcome: 'needs_you', workflowId: 'other-workflow' },
	])('rejects invalid output %#', (output) => {
		expect(selfHealingOutputSchema.safeParse({ ...report, ...output }).success).toBe(false);
	});

	it('rejects missing and malformed output', () => {
		expect(selfHealingOutputSchema.safeParse(undefined).success).toBe(false);
		expect(selfHealingOutputSchema.safeParse('could_not_fix').success).toBe(false);
	});
});

describe('self-healing thread metadata', () => {
	const metadata = {
		profileVersion: 'self-healing-v1',
		selfHealing: {
			version: 1,
			purpose: 'self-healing',
			backgroundUserId: 'actor',
			projectId: 'project',
			workflowId: 'workflow',
			executionId: 'execution',
		},
	};

	it('reads identity alongside unrelated thread metadata', () => {
		expect(selfHealingThreadMetadataSchema.parse({ ...metadata, title: 'Internal' })).toEqual(
			metadata,
		);
	});

	it('rejects unsupported identity and profile versions', () => {
		expect(
			selfHealingThreadMetadataSchema.safeParse({ ...metadata, profileVersion: 'v2' }).success,
		).toBe(false);
		expect(
			selfHealingThreadMetadataSchema.safeParse({
				...metadata,
				selfHealing: { ...metadata.selfHealing, version: 2 },
			}).success,
		).toBe(false);
	});
});
