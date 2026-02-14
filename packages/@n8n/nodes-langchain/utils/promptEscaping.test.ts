import { escapeLangChainTemplateVars } from './promptEscaping';

describe('escapeLangChainTemplateVars', () => {
	it('should return text unchanged when no curly braces present', () => {
		expect(escapeLangChainTemplateVars('Hello world')).toBe('Hello world');
	});

	it('should escape single curly braces', () => {
		expect(escapeLangChainTemplateVars('a { b } c')).toBe('a {{ b }} c');
	});

	it('should escape JSON-like structures in prompts', () => {
		const input = 'Return data as {"name": "John", "age": 30}';
		const expected = 'Return data as {{"name": "John", "age": 30}}';
		expect(escapeLangChainTemplateVars(input)).toBe(expected);
	});

	it('should escape nested JSON structures', () => {
		const input = '{"user": {"name": "John", "address": {"city": "NYC"}}}';
		const expected = '{{"user": {{"name": "John", "address": {{"city": "NYC"}}}}}}';
		expect(escapeLangChainTemplateVars(input)).toBe(expected);
	});

	it('should escape JSON arrays with objects', () => {
		const input = 'Format: [{"key": "value"}, {"key2": "value2"}]';
		const expected = 'Format: [{{"key": "value"}}, {{"key2": "value2"}}]';
		expect(escapeLangChainTemplateVars(input)).toBe(expected);
	});

	it('should preserve specified template variables', () => {
		const input = 'Categories: {categories}. Return as {"result": true}';
		const expected = 'Categories: {categories}. Return as {{"result": true}}';
		expect(escapeLangChainTemplateVars(input, ['categories'])).toBe(expected);
	});

	it('should preserve multiple template variables', () => {
		const input = '{categories} and {format_instructions} but not {"json": true}';
		const expected = '{categories} and {format_instructions} but not {{"json": true}}';
		expect(escapeLangChainTemplateVars(input, ['categories', 'format_instructions'])).toBe(
			expected,
		);
	});

	it('should not affect already-escaped braces', () => {
		// If text already has {{ }}, they get doubled again: {{{{ }}}}
		// This is consistent behavior - the function always escapes all braces
		const input = '{{already_escaped}}';
		const expected = '{{{{already_escaped}}}}';
		expect(escapeLangChainTemplateVars(input)).toBe(expected);
	});

	it('should handle empty string', () => {
		expect(escapeLangChainTemplateVars('')).toBe('');
	});

	it('should handle prompt with JSON schema example', () => {
		const input = `Extract data following this schema:
{
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "age": {"type": "number"}
  }
}`;
		const result = escapeLangChainTemplateVars(input);
		// All braces should be doubled
		expect(result).not.toContain('{"type"');
		expect(result).toContain('{{"type"');
		expect(result).toContain('{{"type": "string"}}');
	});

	it('should handle a realistic Information Extractor prompt with JSON', () => {
		const input = `You are an expert extraction algorithm.
Extract the following fields from the text.
Return JSON matching this example: {"name": "string", "age": "number", "address": {"street": "string", "city": "string"}}
If you do not know a value, omit it.`;
		const result = escapeLangChainTemplateVars(input);
		// The JSON example should be fully escaped
		expect(result).toContain('{{"name": "string", "age": "number", "address": {{"street": "string", "city": "string"}}}}');
		// No unescaped single braces should remain
		expect(result.replace(/\{\{/g, '').replace(/\}\}/g, '')).not.toMatch(/[{}]/);
	});

	it('should preserve template variable even when adjacent to JSON', () => {
		const input = '{categories}: {"example": "value"}';
		const expected = '{categories}: {{"example": "value"}}';
		expect(escapeLangChainTemplateVars(input, ['categories'])).toBe(expected);
	});
});
