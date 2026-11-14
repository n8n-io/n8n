import { diffText, diffWords } from '../diff-text';

it('keeps common lines and marks changed words', () => {
	const result = diffText('Start\nUse plain text\nEnd', 'Start\nUse Markdown text\nEnd');
	expect(result).toMatchObject({ added: 1, removed: 1 });
	expect(result.lines).toEqual([
		{ type: 'equal', text: 'Start' },
		{
			type: 'removed',
			text: 'Use plain text',
			segments: expect.arrayContaining([{ text: 'plain', changed: true }]),
		},
		{
			type: 'added',
			text: 'Use Markdown text',
			segments: expect.arrayContaining([{ text: 'Markdown', changed: true }]),
		},
		{ type: 'equal', text: 'End' },
	]);
});

it('finds the common lines between edits', () => {
	const { lines } = diffText('keep\ndrop\nkeep too', 'new\nkeep\nkeep too\nend');
	expect(lines.map((line) => `${line.type}:${line.text}`)).toEqual([
		'added:new',
		'equal:keep',
		'removed:drop',
		'equal:keep too',
		'added:end',
	]);
});

it.each([
	['', 'one\ntwo', 2, 0],
	['one\ntwo', '', 0, 2],
])('counts a change from %s to %s', (from, to, added, removed) => {
	expect(diffText(from, to)).toMatchObject({ added, removed });
});

it('bounds table allocations for unequal input sizes', () => {
	const allocate = vi.spyOn(globalThis, 'Uint32Array');
	try {
		const from = Array.from({ length: 10_000 }, (_, index) => `line ${index}`).join('\n');
		const result = diffText(from, 'replacement');
		expect(result).toMatchObject({ added: 1, removed: 10_000 });
		expect(allocate.mock.calls.length).toBeLessThanOrEqual(2);
		for (const allocation of allocate.mock.results) {
			expect(allocation.type).toBe('return');
			if (allocation.type === 'return') {
				expect(allocation.value.byteLength).toBeLessThanOrEqual(16_000_000);
			}
		}
	} finally {
		allocate.mockRestore();
	}
});

it('keeps common ends when the changed region exceeds the table limit', () => {
	const from = ['start', ...Array.from({ length: 2000 }, (_, index) => `old-${index}`), 'end'].join(
		'\n',
	);
	const to = ['start', ...Array.from({ length: 2000 }, (_, index) => `new-${index}`), 'end'].join(
		'\n',
	);
	const result = diffText(from, to);
	expect(result).toMatchObject({ added: 2000, removed: 2000 });
	expect(result.lines.filter(({ type }) => type === 'equal')).toEqual([
		{ type: 'equal', text: 'start' },
		{ type: 'equal', text: 'end' },
	]);
});

it('preserves whitespace in word diffs', () => {
	const result = diffWords('  old\ttext ', '  new\ttext ');
	expect(result.from.map(({ text }) => text).join('')).toBe('  old\ttext ');
	expect(result.to.map(({ text }) => text).join('')).toBe('  new\ttext ');
	expect(result.to.filter(({ changed }) => changed)).toEqual([{ text: 'new', changed: true }]);
});
