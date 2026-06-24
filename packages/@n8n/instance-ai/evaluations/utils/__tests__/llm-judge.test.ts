import { parseJudgeVerdict } from '../llm-judge';

describe('parseJudgeVerdict', () => {
	describe('fenced JSON', () => {
		it('parses a fenced JSON block', () => {
			const text = 'My reasoning goes here.\n\n```json\n{"reasoning":"because","pass":true}\n```';
			expect(parseJudgeVerdict(text)).toEqual({ reasoning: 'because', pass: true });
		});

		it('parses an unlabeled fenced block', () => {
			const text = '```\n{"reasoning":"r","pass":false}\n```';
			expect(parseJudgeVerdict(text)).toEqual({ reasoning: 'r', pass: false });
		});
	});

	describe('bare JSON', () => {
		it('parses a JSON object embedded in prose', () => {
			const text = 'Here you go: {"reasoning":"r","pass":true} done.';
			expect(parseJudgeVerdict(text)).toEqual({ reasoning: 'r', pass: true });
		});
	});

	describe('markdown fallback', () => {
		it('parses **Verdict:** PASS at the end', () => {
			const text = '**Reasoning:**\n\nThe assistant did the thing correctly.\n\n**Verdict:** PASS';
			const v = parseJudgeVerdict(text);
			expect(v?.pass).toBe(true);
			expect(v?.reasoning).toContain('The assistant did the thing correctly');
		});

		it('parses **Verdict:** FAIL', () => {
			const text = 'Reasoning text here.\n\n**Verdict:** FAIL';
			const v = parseJudgeVerdict(text);
			expect(v?.pass).toBe(false);
			expect(v?.reasoning).toBe('Reasoning text here.');
		});

		it('parses **Pass:** true', () => {
			const text = '**Reasoning:**\nGood work.\n\n**Pass:** true';
			const v = parseJudgeVerdict(text);
			expect(v?.pass).toBe(true);
			expect(v?.reasoning).toBe('Good work.');
		});

		it('parses **Pass:** false', () => {
			const text = 'Some prose.\n\n**Pass:** false';
			expect(parseJudgeVerdict(text)?.pass).toBe(false);
		});

		it('parses **Decision:** pass', () => {
			const text = 'Brief reasoning.\n\n**Decision:** pass';
			expect(parseJudgeVerdict(text)?.pass).toBe(true);
		});

		it('parses bare verdict line without bold markers', () => {
			const text = 'Reasoning paragraph.\n\nverdict: fail';
			expect(parseJudgeVerdict(text)?.pass).toBe(false);
		});

		it('strips leading **Reasoning:** header from extracted reasoning', () => {
			const text = '**Reasoning:**\n\nIt did the work.\n\n**Verdict:** PASS';
			expect(parseJudgeVerdict(text)?.reasoning).toBe('It did the work.');
		});

		it('falls back to (no reasoning) when verdict is the only content', () => {
			const text = '**Verdict:** PASS';
			expect(parseJudgeVerdict(text)?.reasoning).toBe('(no reasoning)');
		});

		it('is case-insensitive', () => {
			const text = 'r\n\nVERDICT: PASS';
			expect(parseJudgeVerdict(text)?.pass).toBe(true);
		});

		it('finds the verdict in the tail when noise precedes it', () => {
			const noise = 'Long preamble. '.repeat(200);
			const text = `${noise}\n\n**Verdict:** PASS`;
			expect(parseJudgeVerdict(text)?.pass).toBe(true);
		});

		it('prefers JSON over markdown when both are present', () => {
			const text = '**Verdict:** FAIL\n\n```json\n{"reasoning":"r","pass":true}\n```';
			expect(parseJudgeVerdict(text)?.pass).toBe(true);
		});

		it('uses the verdict near the end, not an earlier mention of the same words', () => {
			const text =
				'Reasoning: I expected **Verdict:** PASS but got something odd.\n\n**Verdict:** FAIL';
			const v = parseJudgeVerdict(text);
			expect(v?.pass).toBe(false);
			expect(v?.reasoning).toContain('expected **Verdict:** PASS but got something odd');
		});
	});

	describe('unparseable input', () => {
		it('returns undefined for plain prose without a verdict', () => {
			expect(parseJudgeVerdict('Just some thoughts about the run.')).toBeUndefined();
		});

		it('returns undefined for malformed JSON without a markdown verdict', () => {
			expect(parseJudgeVerdict('{"pass": "not-a-boolean"}')).toBeUndefined();
		});

		it('returns undefined for empty input', () => {
			expect(parseJudgeVerdict('')).toBeUndefined();
		});
	});
});
