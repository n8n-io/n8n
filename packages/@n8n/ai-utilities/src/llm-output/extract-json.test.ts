import { extractFencedJson, extractJsonCandidate } from './extract-json';

describe('extractJsonCandidate', () => {
	it.each([
		['```json\n{"ok":true}\n```', '{"ok":true}'],
		['```\n{"ok":true}\n```', '{"ok":true}'],
		['Result:\n```json\n{"ok":true}\n```\nDone', '{"ok":true}'],
	])('extracts JSON from fenced output', (input, expected) => {
		expect(extractJsonCandidate(input)).toBe(expected);
	});

	it('extracts a bare JSON object from surrounding prose', () => {
		expect(extractJsonCandidate('Result: {"ok":true} Done')).toBe('{"ok":true}');
	});

	it('returns trimmed text when no JSON candidate exists', () => {
		expect(extractJsonCandidate('  not JSON  ')).toBe('not JSON');
	});
});

describe('extractFencedJson', () => {
	it('returns undefined when the output has no fenced block', () => {
		expect(extractFencedJson('{"ok":true}')).toBeUndefined();
	});
});
