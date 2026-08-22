import { parseJudgeResponse } from '../parse-judge-response';

describe('parseJudgeResponse', () => {
	describe('JSON with markdown code fences', () => {
		it('parses a JSON block within ```json fences', () => {
			const result = parseJudgeResponse('```json\n{"pass": true, "reasoning": "Correct"}\n```');
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('Correct');
		});

		it('parses a JSON block within plain ``` fences', () => {
			const result = parseJudgeResponse('```\n{"pass": false, "reasoning": "Wrong"}\n```');
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('Wrong');
		});

		it('handles fences without leading newline', () => {
			const result = parseJudgeResponse('```json{"pass": true}```');
			expect(result.pass).toBe(true);
		});
	});

	describe('plain JSON', () => {
		it('parses a simple pass JSON object', () => {
			const result = parseJudgeResponse('{"pass": true, "reasoning": "All good"}');
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('All good');
		});

		it('parses a simple fail JSON object', () => {
			const result = parseJudgeResponse('{"pass": false, "reasoning": "Not good"}');
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('Not good');
		});
	});

	describe('legacy score format', () => {
		it('passes when score is >= 0.7', () => {
			const result = parseJudgeResponse('{"score": 0.85, "reasoning": "Mostly correct"}');
			expect(result.pass).toBe(true);
		});

		it('fails when score is < 0.7', () => {
			const result = parseJudgeResponse('{"score": 0.3, "reasoning": "Mostly wrong"}');
			expect(result.pass).toBe(false);
		});

		it('handles score exactly at boundary of 0.7', () => {
			const result = parseJudgeResponse('{"score": 0.7, "reasoning": "Borderline"}');
			expect(result.pass).toBe(true);
		});
	});

	describe('pass/fail overrides score', () => {
		it('uses pass field when both pass and score are present', () => {
			const result = parseJudgeResponse('{"pass": false, "score": 0.9, "reasoning": "Override"}');
			expect(result.pass).toBe(false);
		});
	});

	describe('raw text fallback', () => {
		it('passes when text contains "pass" keyword without "fail"', () => {
			const result = parseJudgeResponse('This response should pass the test');
			expect(result.pass).toBe(true);
		});

		it('fails when text contains "fail" keyword', () => {
			const result = parseJudgeResponse('This response should fail the test');
			expect(result.pass).toBe(false);
		});

		it('fails when text contains both "pass" and "fail"', () => {
			const result = parseJudgeResponse('Attempt to pass but ultimately fail');
			expect(result.pass).toBe(false);
		});

		it('falls back to reasoning as the raw text when JSON has no reasoning', () => {
			const result = parseJudgeResponse('{"pass": true}');
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('{"pass": true}');
		});

		it('fails on empty text', () => {
			const result = parseJudgeResponse('');
			expect(result.pass).toBe(false);
		});
	});

	describe('JSON pass/false detection in raw text', () => {
		it('detects "pass": true in malformed JSON', () => {
			const result = parseJudgeResponse('Some text {"pass": true} more text');
			expect(result.pass).toBe(true);
		});

		it('detects "pass":false in malformed JSON', () => {
			const result = parseJudgeResponse('Some text {"pass":false} more text');
			expect(result.pass).toBe(false);
		});

		it('prefers JSON detection over keyword pass/fail', () => {
			const result = parseJudgeResponse('This should {"pass": false} but mentions pass');
			expect(result.pass).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('handles text with only whitespace', () => {
			const result = parseJudgeResponse('   ');
			expect(result.pass).toBe(false);
		});

		it('handles text with surrounding whitespace in markdown fences', () => {
			const result = parseJudgeResponse('  ```json\n{"pass": true}\n```  ');
			expect(result.pass).toBe(true);
		});
	});
});
