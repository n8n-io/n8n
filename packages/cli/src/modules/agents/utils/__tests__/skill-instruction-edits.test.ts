import { applySkillInstructionEdits } from '../skill-instruction-edits';

describe('applySkillInstructionEdits', () => {
	const body = '## Steps\n1. Ask for the title.\n2. Set priority P3.\n\n## Rules\n- Be brief.\n';

	it('applies edits in order against the text left by earlier edits', () => {
		const result = applySkillInstructionEdits(body, [
			{ oldText: 'Set priority P3.', newText: 'Set priority P2.' },
			{ oldText: 'priority P2.', newText: 'priority P2 for business customers.' },
			{ oldText: '- Be brief.\n', newText: '' },
		]);

		expect(result).toEqual({
			ok: true,
			instructions:
				'## Steps\n1. Ask for the title.\n2. Set priority P2 for business customers.\n\n## Rules\n',
		});
	});

	it('keeps dollar sequences in newText literal', () => {
		const result = applySkillInstructionEdits(body, [
			{ oldText: 'Be brief.', newText: 'Quote $& and $1 as written.' },
		]);

		expect(result).toMatchObject({ ok: true });
		if (result.ok) expect(result.instructions).toContain('Quote $& and $1 as written.');
	});

	describe('whitespace-insensitive matching', () => {
		it('matches when only whitespace differs and keeps the surrounding whitespace', () => {
			const result = applySkillInstructionEdits(body, [
				{ oldText: '  1.  Ask for the title.\n 2. Set   priority P3.  ', newText: '1. Ask first.' },
			]);

			expect(result).toEqual({
				ok: true,
				instructions: '## Steps\n1. Ask first.\n\n## Rules\n- Be brief.\n',
			});
		});

		it('matches when oldText omits whitespace that the instructions contain', () => {
			const result = applySkillInstructionEdits(body, [
				{ oldText: '##Rules\n-Be brief.', newText: '## Rules\n- Be short.' },
			]);

			expect(result).toMatchObject({ ok: true });
			if (result.ok) expect(result.instructions).toContain('## Rules\n- Be short.\n');
		});

		it('prefers a unique exact match to whitespace-insensitive matches', () => {
			const text = 'Use P3.\nUse  P3.\n';
			const result = applySkillInstructionEdits(text, [
				{ oldText: 'Use  P3.', newText: 'Use P2.' },
			]);

			expect(result).toEqual({ ok: true, instructions: 'Use P3.\nUse P2.\n' });
		});

		it('fails when the whitespace-insensitive match is ambiguous', () => {
			const text = 'Use P3.\nUse  P3.\n';
			const result = applySkillInstructionEdits(text, [{ oldText: 'Use P3 .', newText: 'x' }]);

			expect(result).toEqual({
				ok: false,
				message: expect.stringContaining('instructionEdits[0]: oldText matches 2 places'),
			});
		});
	});

	describe('when nothing matches', () => {
		it('shows the closest text, quoted exactly', () => {
			const result = applySkillInstructionEdits(body, [
				{ oldText: '2. Set **priority** P3.', newText: '2. Set priority P2.' },
			]);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.message).toContain('instructionEdits[0]: oldText was not found');
				expect(result.message).toContain('No edits were saved.');
				expect(result.message).toContain('The closest text is "2. Set priority P3."');
			}
		});

		it('finds the closest text inside a long line', () => {
			const text =
				'Always greet the customer by name, then confirm the order number before you check the refund status and reply.';
			const result = applySkillInstructionEdits(text, [
				{ oldText: 'confirm the order id before you check', newText: 'x' },
			]);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.message).toContain('"confirm the order number before you check"');
			}
		});

		it('says so when no similar text exists', () => {
			const result = applySkillInstructionEdits(body, [
				{ oldText: 'Escalate refunds over 500 EUR to finance.', newText: 'x' },
			]);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.message).toContain('No similar text was found');
				expect(result.message).not.toContain('The closest text is');
			}
		});

		it('searches the text left by earlier edits', () => {
			const result = applySkillInstructionEdits(body, [
				{ oldText: 'Set priority P3.', newText: 'Set priority P2.' },
				{ oldText: 'Set priority P3 now.', newText: 'x' },
			]);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.message).toContain('instructionEdits[1]');
				expect(result.message).toContain('after the earlier edits');
				expect(result.message).toContain('"Set priority P2."');
			}
		});
	});
});
