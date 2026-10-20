import { i18n } from '@n8n/i18n';
import { describe, expect, it } from 'vitest';

import { buildEvalCorrectionPrompt, buildEvalFixPrompt } from '../agent-eval-fix-prompt';

const check = (id: string) => ({
	rule: `rule ${id}`,
	sampleMessage: `message ${id}`,
	reply: `reply ${id}`,
	judgeReason: `reason ${id}`,
});

describe('buildEvalFixPrompt', () => {
	it('asks for one change that fixes every check, and fences the checks as data', () => {
		const prompt = buildEvalFixPrompt([check('a'), check('b')], i18n);

		expect(prompt).toContain('Fix the 2 checks that need work.');
		expect(prompt).toContain('<untrusted_data source="agent-eval-checks">');
		expect(prompt).toContain('"sampleMessage": "message b"');
		expect(prompt).toContain('"judgeReason": "reason a"');
		expect(prompt.trim().endsWith('</untrusted_data>')).toBe(true);
	});

	it('names a single check in the singular', () => {
		expect(buildEvalFixPrompt([check('a')], i18n)).toContain('Fix the check that needs work.');
	});

	it('keeps a dollar sign in a reply literal', () => {
		const prompt = buildEvalFixPrompt([{ ...check('a'), reply: 'It costs $& now' }], i18n);

		expect(prompt).toContain('It costs $& now');
	});

	it('keeps a long batch inside the draft limit', () => {
		const long = 'x'.repeat(5_000);
		const checks = Array.from({ length: 10 }, (_, i) => ({
			...check(String(i)),
			reply: long,
			judgeReason: long,
		}));

		expect(buildEvalFixPrompt(checks, i18n).length).toBeLessThan(16_000);
	});
});

describe('buildEvalCorrectionPrompt', () => {
	it('carries the correction and asks the Assistant to decide what was wrong', () => {
		const prompt = buildEvalCorrectionPrompt(check('a'), 'Decline and say why.', i18n);

		expect(prompt).toContain('Decline and say why.');
		expect(prompt).toContain('rule or my agent’s instructions are wrong');
		expect(prompt).toContain('"rule": "rule a"');
	});
});
