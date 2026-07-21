import { extractJsonFromOutput, JSON_NOT_FOUND } from '../extractJsonFromOutput';

describe('extractJsonFromOutput', () => {
	describe('clean JSON input', () => {
		it('should parse a clean JSON object', () => {
			expect(extractJsonFromOutput('{"key": "value"}')).toEqual({ key: 'value' });
		});

		it('should parse a clean JSON array', () => {
			expect(extractJsonFromOutput('[1, 2, 3]')).toEqual([1, 2, 3]);
		});

		it('should parse JSON with leading/trailing whitespace', () => {
			expect(extractJsonFromOutput('  {"key": "value"}  ')).toEqual({ key: 'value' });
		});

		it('should parse a bare boolean true', () => {
			expect(extractJsonFromOutput('true')).toBe(true);
		});

		it('should parse a bare number', () => {
			expect(extractJsonFromOutput('42')).toBe(42);
		});

		it('should parse a bare JSON string', () => {
			expect(extractJsonFromOutput('"ok"')).toBe('ok');
		});
	});

	describe('scalar JSON values mixed with prose', () => {
		it('should extract boolean from surrounding text', () => {
			expect(extractJsonFromOutput('Result: true')).toBe(true);
		});

		it('should extract number from surrounding text', () => {
			expect(extractJsonFromOutput('Answer: 42')).toBe(42);
		});

		it('should extract JSON string from surrounding text', () => {
			expect(extractJsonFromOutput('Here is the value: "ok"')).toBe('ok');
		});

		it('should extract false from surrounding text', () => {
			expect(extractJsonFromOutput('The answer is false')).toBe(false);
		});

		it('should prefer object over scalar when object is longer', () => {
			expect(extractJsonFromOutput('Result: true\n{"key": "value"}')).toEqual({ key: 'value' });
		});
	});

	describe('markdown code fence', () => {
		it('should extract JSON from ```json code fence', () => {
			const input = '```json\n{"key": "value"}\n```';
			expect(extractJsonFromOutput(input)).toEqual({ key: 'value' });
		});

		it('should extract JSON from plain ``` code fence', () => {
			const input = '```\n{"key": "value"}\n```';
			expect(extractJsonFromOutput(input)).toEqual({ key: 'value' });
		});

		it('should extract JSON array from code fence', () => {
			const input = '```json\n[{"id": 1}, {"id": 2}]\n```';
			expect(extractJsonFromOutput(input)).toEqual([{ id: 1 }, { id: 2 }]);
		});

		it('should extract multi-line JSON from code fence', () => {
			const input = '```json\n{\n  "key": "value",\n  "items": [1, 2, 3]\n}\n```';
			expect(extractJsonFromOutput(input)).toEqual({ key: 'value', items: [1, 2, 3] });
		});
	});

	describe('JSON mixed with preamble/postamble text', () => {
		it('should extract JSON object preceded by preamble text', () => {
			const input = 'Here\'s the analysis:\n\n{"key": "value"}';
			expect(extractJsonFromOutput(input)).toEqual({ key: 'value' });
		});

		it('should extract JSON object followed by trailing text', () => {
			const input = '{"key": "value"}\n\nLet me know if you need anything else.';
			expect(extractJsonFromOutput(input)).toEqual({ key: 'value' });
		});

		it('should extract JSON from response with both preamble and postamble', () => {
			const input =
				'Here is the result:\n{"items": [1, 2, 3]}\nLet me know if you need anything else.';
			expect(extractJsonFromOutput(input)).toEqual({ items: [1, 2, 3] });
		});

		it('should extract JSON array preceded by preamble text', () => {
			const input = 'Here are the items:\n[{"id": 1}, {"id": 2}]';
			expect(extractJsonFromOutput(input)).toEqual([{ id: 1 }, { id: 2 }]);
		});

		it('should extract single-element array rather than its inner object', () => {
			const input = 'Here are the items:\n[{"id": 1}]';
			expect(extractJsonFromOutput(input)).toEqual([{ id: 1 }]);
		});

		it('should extract object when object appears before array in surrounding text', () => {
			const input = 'Result: {"items": [1, 2, 3]} end';
			expect(extractJsonFromOutput(input)).toEqual({ items: [1, 2, 3] });
		});

		it('should skip prose brackets and extract the real JSON object', () => {
			const input = 'Note [draft]\n{"id": 1}';
			expect(extractJsonFromOutput(input)).toEqual({ id: 1 });
		});

		it('should skip placeholder braces and extract the real JSON object', () => {
			const input = 'placeholder {x}\n{"id": 1}';
			expect(extractJsonFromOutput(input)).toEqual({ id: 1 });
		});

		it('should extract array and ignore trailing bracketed prose', () => {
			const input = 'Here is the result: [{"id": 1}] [verified]';
			expect(extractJsonFromOutput(input)).toEqual([{ id: 1 }]);
		});

		it('should extract first JSON object even when trailing text contains braces', () => {
			const input = '{"a": 1}\nUse {name} placeholder';
			expect(extractJsonFromOutput(input)).toEqual({ a: 1 });
		});

		it('should extract object whose string value contains a closing brace', () => {
			const input = 'Here is the result: {"message": "a } b"}';
			expect(extractJsonFromOutput(input)).toEqual({ message: 'a } b' });
		});

		it('should skip numbered reference and extract the larger JSON object', () => {
			const input = 'See [1] below\n{"answer": "ok"}';
			expect(extractJsonFromOutput(input)).toEqual({ answer: 'ok' });
		});
	});

	describe('full LLM response pattern (markdown + preamble)', () => {
		it('should extract JSON from full markdown-wrapped response with preamble', () => {
			const input =
				'Here\'s the analysis:\n\n```json\n{"key": "value", "items": [1, 2]}\n```\n\nLet me know if you need anything else.';
			expect(extractJsonFromOutput(input)).toEqual({ key: 'value', items: [1, 2] });
		});
	});

	describe('non-JSON input', () => {
		it('should return JSON_NOT_FOUND for plain text with no JSON', () => {
			expect(extractJsonFromOutput('This is just plain text.')).toBe(JSON_NOT_FOUND);
		});

		it('should return JSON_NOT_FOUND for empty string', () => {
			expect(extractJsonFromOutput('')).toBe(JSON_NOT_FOUND);
		});

		it('should return JSON_NOT_FOUND for whitespace-only string', () => {
			expect(extractJsonFromOutput('   ')).toBe(JSON_NOT_FOUND);
		});

		it('should return JSON_NOT_FOUND for invalid JSON in code fence', () => {
			const input = '```json\nnot valid json\n```';
			expect(extractJsonFromOutput(input)).toBe(JSON_NOT_FOUND);
		});

		it('should return JSON_NOT_FOUND for malformed JSON object', () => {
			expect(extractJsonFromOutput('{key: value}')).toBe(JSON_NOT_FOUND);
		});
	});

	describe('JSON null value', () => {
		it('should return null (not JSON_NOT_FOUND) for bare null', () => {
			expect(extractJsonFromOutput('null')).toBeNull();
		});

		it('should return null for null inside a code fence', () => {
			expect(extractJsonFromOutput('```json\nnull\n```')).toBeNull();
		});
	});

	describe('edge cases', () => {
		it('should handle nested JSON objects', () => {
			const input = '{"outer": {"inner": {"deep": true}}}';
			expect(extractJsonFromOutput(input)).toEqual({ outer: { inner: { deep: true } } });
		});

		it('should handle JSON with special characters in strings', () => {
			const input = '{"message": "Hello, \\"world\\"!"}';
			expect(extractJsonFromOutput(input)).toEqual({ message: 'Hello, "world"!' });
		});

		it('should prefer code fence content over raw text extraction', () => {
			// When there's a code fence with valid JSON, it should be preferred
			const input = '{"outer": "text"}\n```json\n{"fenced": "json"}\n```';
			expect(extractJsonFromOutput(input)).toEqual({ fenced: 'json' });
		});
	});
});
