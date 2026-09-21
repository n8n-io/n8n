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

	it.each([
		['[{"a":1},{"a":2}]', '[{"a":1},{"a":2}]'],
		['Rows:\n[{"a":1},{"a":2}]', '[{"a":1},{"a":2}]'],
		['```json\n[1,2]\n```', '[1,2]'],
		['See [the docs] then {"ok":true}', '{"ok":true}'],
		['See [the docs] first: [1, 2, 3]', '[1, 2, 3]'],
		['[link](https://x.test) then [{"a":1}] done', '[{"a":1}]'],
		[
			'Example {"x":1} applies. Answer: {"answer":true,"reasoning":"ok"}',
			'{"answer":true,"reasoning":"ok"}',
		],
		['{"items":[1,2]}', '{"items":[1,2]}'],
		['{"a":"]"} tail', '{"a":"]"}'],
	])(
		'keeps array payloads intact without letting prose brackets shadow or join them',
		(input, expected) => {
			expect(extractJsonCandidate(input)).toBe(expected);
		},
	);

	it.each([
		['Ran ```pnpm test``` then {"ok":true}', '{"ok":true}'],
		['{"note": "run ```pnpm test``` twice"}', '{"note": "run ```pnpm test``` twice"}'],
		[
			'{"pass":true,"reasoning":"see ```json\\n{\\"x\\":1}\\n``` ok"}',
			'{"pass":true,"reasoning":"see ```json\\n{\\"x\\":1}\\n``` ok"}',
		],
		[
			'```json\n{"hint":"run ```pnpm test``` first","ok":true}\n```',
			'{"hint":"run ```pnpm test``` first","ok":true}',
		],
		['```json\n{"broken": \n```\nFixed: {"ok":true}', '{"ok":true}'],
	])('ignores fenced blocks that are not the payload', (input, expected) => {
		expect(extractJsonCandidate(input)).toBe(expected);
	});

	it('returns the fenced value when it is a JSON scalar', () => {
		expect(extractJsonCandidate('```json\n42\n```')).toBe('42');
	});

	it('returns trimmed text when no JSON candidate exists', () => {
		expect(extractJsonCandidate('  not JSON  ')).toBe('not JSON');
	});

	it('gives up on bracket noise in linear time', () => {
		// Every unmatched opener used to rescan the whole suffix; 40k chars took over a second.
		const input = '{ '.repeat(20_000).trim();
		const start = performance.now();
		expect(extractJsonCandidate(input)).toBe(input);
		expect(performance.now() - start).toBeLessThan(100);
	});
});

describe('extractFencedJson', () => {
	it('returns undefined when the output has no fenced block', () => {
		expect(extractFencedJson('{"ok":true}')).toBeUndefined();
	});
});
