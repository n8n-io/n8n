import { chunkText } from '../chunk-text';

const options = (overrides: Partial<Parameters<typeof chunkText>[1]> = {}) => ({
	chunkSize: 100,
	chunkOverlap: 0,
	maxChars: 10_000,
	...overrides,
});

describe('chunkText', () => {
	describe('empty input', () => {
		test.each([
			['empty string', ''],
			['spaces', '   '],
			['newlines and tabs', '\n\n\t \r\n'],
		])('returns no chunks for %s', (_name, text) => {
			expect(chunkText(text, options())).toEqual([]);
		});

		test('returns no chunks when maxChars is 0', () => {
			expect(chunkText('some text', options({ maxChars: 0 }))).toEqual([]);
		});
	});

	describe('short input', () => {
		test('returns a single chunk when the text fits', () => {
			expect(chunkText('hello world', options())).toEqual(['hello world']);
		});

		test('trims surrounding whitespace', () => {
			expect(chunkText('  hello world  ', options())).toEqual(['hello world']);
		});

		test('keeps a chunk that is exactly chunkSize', () => {
			const text = 'a'.repeat(20);

			expect(chunkText(text, options({ chunkSize: 20 }))).toEqual([text]);
		});

		test('splits one character past chunkSize', () => {
			const text = 'a'.repeat(21);
			const chunks = chunkText(text, options({ chunkSize: 20 }));

			expect(chunks).toEqual(['a'.repeat(20), 'a']);
		});
	});

	describe('separator priority', () => {
		test('prefers paragraph breaks', () => {
			const paragraphs = ['A'.repeat(30), 'B'.repeat(30), 'C'.repeat(30)];
			const chunks = chunkText(paragraphs.join('\n\n'), options({ chunkSize: 70 }));

			// 30 + 2 + 30 = 62 fits, adding the third would not.
			expect(chunks).toEqual([`${paragraphs[0]}\n\n${paragraphs[1]}`, paragraphs[2]]);
		});

		test('falls back to single newlines inside an oversized paragraph', () => {
			const lines = ['A'.repeat(40), 'B'.repeat(40), 'C'.repeat(40)];
			const chunks = chunkText(lines.join('\n'), options({ chunkSize: 50 }));

			expect(chunks).toEqual(lines);
		});

		test('falls back to sentence boundaries', () => {
			const text = 'First sentence here. Second sentence here. Third sentence here.';
			const chunks = chunkText(text, options({ chunkSize: 45 }));

			expect(chunks).toEqual([
				'First sentence here. Second sentence here.',
				'Third sentence here.',
			]);
		});

		test('falls back to spaces', () => {
			const chunks = chunkText('alpha beta gamma delta', options({ chunkSize: 12 }));

			expect(chunks).toEqual(['alpha beta', 'gamma delta']);
		});
	});

	describe('no separators', () => {
		test('hard-slices a long run of characters', () => {
			const chunks = chunkText('x'.repeat(25), options({ chunkSize: 10 }));

			expect(chunks).toEqual(['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(5)]);
		});

		test('hard-slices only the oversized unit and keeps its siblings intact', () => {
			const chunks = chunkText(`short ${'y'.repeat(25)} tail`, options({ chunkSize: 10 }));

			expect(chunks).toEqual(['short', 'y'.repeat(10), 'y'.repeat(10), 'y'.repeat(5), 'tail']);
		});
	});

	describe('truncation', () => {
		test('drops everything past maxChars before splitting', () => {
			const chunks = chunkText('abcdefghij', options({ chunkSize: 100, maxChars: 4 }));

			expect(chunks).toEqual(['abcd']);
		});

		test('does not truncate when the text is shorter than maxChars', () => {
			expect(chunkText('abc', options({ maxChars: 4 }))).toEqual(['abc']);
		});
	});

	describe('overlap', () => {
		test('prefixes every chunk after the first with the previous chunk tail', () => {
			const chunks = chunkText(
				'alpha beta gamma delta',
				options({ chunkSize: 12, chunkOverlap: 5 }),
			);

			expect(chunks[0]).toBe('alpha beta');
			// 'beta' is what survives the word-boundary trim of the last 5 chars.
			expect(chunks[1]).toBe('beta gamma delta');
		});

		test('repeats the whole previous chunk when it is shorter than the overlap', () => {
			const chunks = chunkText('ab cdefghijklmnopqr', options({ chunkSize: 11, chunkOverlap: 8 }));

			expect(chunks[0]).toBe('ab');
			expect(chunks[1]).toBe('ab cdefghijklm');
		});

		test('drops an overlap window that is a single partial word', () => {
			const chunks = chunkText('ab cdefghijklmnopqr', options({ chunkSize: 11, chunkOverlap: 8 }));

			// The tail of 'cdefghijklm' has no word boundary, so nothing is repeated.
			expect(chunks[2]).toBe('nopqr');
		});

		test('overlaps from the original chunk, so the prefix never compounds', () => {
			const chunks = chunkText(
				'one two three four five six',
				options({ chunkSize: 9, chunkOverlap: 4 }),
			);

			expect(chunks).toEqual(['one two', 'two three', 'four five', 'five six']);
		});

		test('keeps a tail that already starts on a word boundary', () => {
			const chunks = chunkText('alpha beta gamma', options({ chunkSize: 10, chunkOverlap: 5 }));

			expect(chunks).toEqual(['alpha beta', 'beta gamma']);
		});

		test('is a no-op when chunkOverlap is 0', () => {
			const chunks = chunkText('alpha beta gamma', options({ chunkSize: 10, chunkOverlap: 0 }));

			expect(chunks).toEqual(['alpha beta', 'gamma']);
		});

		test('clamps an overlap that is not smaller than the chunk size', () => {
			const chunks = chunkText('alpha beta gamma', options({ chunkSize: 10, chunkOverlap: 50 }));

			expect(chunks).toEqual(['alpha beta', 'beta gamma']);
		});
	});

	describe('unicode', () => {
		test('does not split a surrogate pair when hard-slicing', () => {
			const chunks = chunkText('😀😀😀', options({ chunkSize: 3 }));

			expect(chunks).toEqual(['😀', '😀', '😀']);
			expect(chunks.join('')).toBe('😀😀😀');
		});

		test('does not split a surrogate pair when truncating', () => {
			const chunks = chunkText('a😀b', options({ chunkSize: 100, maxChars: 2 }));

			expect(chunks).toEqual(['a']);
		});

		test('chunks non-latin text on its separators', () => {
			const chunks = chunkText('привет мир\n\nこんにちは', options({ chunkSize: 12 }));

			expect(chunks).toEqual(['привет мир', 'こんにちは']);
		});
	});

	describe('invariants', () => {
		const longText = Array.from(
			{ length: 40 },
			(_, i) => `Paragraph ${i} with a few words in it. And a second sentence.`,
		).join('\n\n');

		test('never returns an empty or whitespace-only chunk', () => {
			const chunks = chunkText(longText, options({ chunkSize: 90, chunkOverlap: 20 }));

			expect(chunks.length).toBeGreaterThan(1);
			for (const chunk of chunks) expect(chunk.trim()).not.toBe('');
		});

		test('is deterministic', () => {
			const opts = options({ chunkSize: 90, chunkOverlap: 20 });

			expect(chunkText(longText, opts)).toEqual(chunkText(longText, opts));
		});

		test('keeps chunks within chunkSize plus the overlap prefix', () => {
			const chunks = chunkText(longText, options({ chunkSize: 90, chunkOverlap: 20 }));

			for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(90 + 20 + 1);
		});

		test('covers every non-whitespace character of the input', () => {
			const chunks = chunkText(longText, options({ chunkSize: 90, chunkOverlap: 0 }));

			expect(chunks.join('').replace(/\s/g, '')).toBe(longText.replace(/\s/g, ''));
		});
	});
});
