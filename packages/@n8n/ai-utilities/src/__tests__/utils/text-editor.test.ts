import {
	MultipleMatchesError,
	NoMatchFoundError,
	TextEditorDocument,
	findDivergenceContext,
	parseStrReplacements,
} from '../../utils/text-editor';

describe('TextEditorDocument', () => {
	it('views text with line numbers', () => {
		const editor = new TextEditorDocument({ initialText: 'line1\nline2\nline3' });

		const result = editor.execute({ command: 'view', path: '/file.ts' });

		expect(result).toBe('1: line1\n2: line2\n3: line3');
	});

	it('replaces a unique exact match', () => {
		const editor = new TextEditorDocument({ initialText: 'const x = 1;\nconst y = 2;' });

		const result = editor.execute({
			command: 'str_replace',
			path: '/file.ts',
			old_str: 'const y = 2;',
			new_str: 'const y = 3;',
		});

		expect(result).toBe('Edit applied successfully.');
		expect(editor.getText()).toBe('const x = 1;\nconst y = 3;');
	});

	it('preserves dollar characters literally in replacement text', () => {
		const editor = new TextEditorDocument({ initialText: 'const value = "";' });

		editor.execute({
			command: 'str_replace',
			path: '/file.ts',
			old_str: 'const value = "";',
			new_str: 'const value = "$& $1 $$";',
		});

		expect(editor.getText()).toBe('const value = "$& $1 $$";');
	});

	it('rejects missing and non-unique matches', () => {
		const editor = new TextEditorDocument({ initialText: 'const x = 1;\nconst x = 1;' });

		expect(() =>
			editor.execute({
				command: 'str_replace',
				path: '/file.ts',
				old_str: 'const y = 2;',
				new_str: 'const y = 3;',
			}),
		).toThrow(NoMatchFoundError);

		expect(() =>
			editor.execute({
				command: 'str_replace',
				path: '/file.ts',
				old_str: 'const x = 1;',
				new_str: 'const x = 2;',
			}),
		).toThrow(MultipleMatchesError);
	});

	it('inserts text after the requested line', () => {
		const editor = new TextEditorDocument({ initialText: 'line1\nline3' });

		const result = editor.execute({
			command: 'insert',
			path: '/file.ts',
			insert_line: 1,
			insert_text: 'line2',
		});

		expect(result).toBe('Text inserted successfully.');
		expect(editor.getText()).toBe('line1\nline2\nline3');
	});

	it('applies batch replacements atomically', () => {
		const original = 'const a = 1;\nconst b = 2;\nconst c = 3;';
		const editor = new TextEditorDocument({ initialText: original });

		const result = editor.executeBatch([
			{ old_str: 'const a = 1;', new_str: 'const a = 10;' },
			{ old_str: 'const missing = 0;', new_str: 'const missing = 1;' },
			{ old_str: 'const c = 3;', new_str: 'const c = 30;' },
		]);

		expect(result).toEqual([
			{ index: 0, old_str: 'const a = 1;', status: 'success' },
			{
				index: 1,
				old_str: 'const missing = 0;',
				status: 'failed',
				error: expect.stringContaining('No exact match found'),
			},
			{ index: 2, old_str: 'const c = 3;', status: 'not_attempted' },
		]);
		expect(editor.getText()).toBe(original);
	});

	it('supports a configurable single-file path guard', () => {
		const editor = new TextEditorDocument({ supportedPath: '/workflow.js' });

		expect(() => editor.execute({ command: 'view', path: '/other.js' })).toThrow(
			'Only /workflow.js is supported',
		);
	});
});

describe('text editor helpers', () => {
	it('finds useful divergence context', () => {
		const result = findDivergenceContext('line1\nline2\nline3', 'line1\nline2\nwrong');

		expect(result).toContain('line 3');
		expect(result).toContain('line3');
	});

	it('parses replacements from arrays and JSON strings', () => {
		const arrayResult = parseStrReplacements([{ old_str: 'old', new_str: 'new' }]);
		const stringResult = parseStrReplacements('[{"old_str":"old","new_str":"new"}]');

		expect(arrayResult).toEqual([{ old_str: 'old', new_str: 'new' }]);
		expect(stringResult).toEqual([{ old_str: 'old', new_str: 'new' }]);
	});
});
