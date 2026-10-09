import { applySkillInstructionEdits } from '../skill-instruction-edits';

describe('applySkillInstructionEdits', () => {
	const body = '## Steps\n1. Ask for the title.\n2. Set priority P3.\n\n## Rules\n- Be brief.\n';

	it('applies edits in order against the text left by earlier edits', () => {
		const result = applySkillInstructionEdits(body, [
			{ oldText: 'Set priority P3.', newText: 'Set priority P2.' },
			{ oldText: 'priority P2.', newText: 'priority P2 for business customers.' },
			{ oldText: '- Be brief.\n', newText: '' },
		]);

		expect(result).toBe(
			'## Steps\n1. Ask for the title.\n2. Set priority P2 for business customers.\n\n## Rules\n',
		);
	});

	it('keeps dollar sequences in newText literal', () => {
		const result = applySkillInstructionEdits(body, [
			{ oldText: 'Be brief.', newText: 'Quote $& and $1 as written.' },
		]);

		expect(result).toContain('Quote $& and $1 as written.');
	});

	it('fails when oldText is not found', () => {
		expect(() =>
			applySkillInstructionEdits(body, [{ oldText: 'Set priority P1.', newText: 'x' }]),
		).toThrow('instructionEdits[0]: oldText matches 0 places');
	});

	it('fails when oldText matches more than one place', () => {
		expect(() =>
			applySkillInstructionEdits('Use P3.\nUse P3.\n', [{ oldText: 'Use P3.', newText: 'x' }]),
		).toThrow('instructionEdits[0]: oldText matches 2 places');
	});

	it('reports the index of the failing edit', () => {
		expect(() =>
			applySkillInstructionEdits(body, [
				{ oldText: 'Set priority P3.', newText: 'Set priority P2.' },
				{ oldText: 'Set priority P3.', newText: 'x' },
			]),
		).toThrow('instructionEdits[1]');
	});
});
