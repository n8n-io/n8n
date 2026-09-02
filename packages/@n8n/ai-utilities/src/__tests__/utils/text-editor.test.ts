import { describe, expect, it } from 'vitest';

import {
	FileNotFoundError,
	InvalidLineNumberError,
	InvalidPathError,
	InvalidViewRangeError,
	MultipleMatchesError,
	NoMatchFoundError,
	TextEditorDocument,
	findDivergenceContext,
	parseStrReplacements,
} from 'src/utils/text-editor';

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

	it('keeps master behavior for empty old_str', () => {
		const editor = new TextEditorDocument({ initialText: 'hello\nworld' });

		const result = editor.execute({
			command: 'str_replace',
			path: '/file.ts',
			old_str: '',
			new_str: 'REPLACED',
		});

		expect(result).toBe('Edit applied successfully.');
		expect(editor.getText()).toBe('helloREPLACEDworld');
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

		expect(result).not.toBe('All 3 replacements applied successfully.');
		if (typeof result === 'string') {
			throw new Error(`Expected batch result details, got: ${result}`);
		}
		expect(result).toEqual([
			{ index: 0, old_str: 'const a = 1;', status: 'success' },
			{
				index: 1,
				old_str: 'const missing = 0;',
				status: 'failed',
				error: result[1]?.error,
			},
			{ index: 2, old_str: 'const c = 3;', status: 'not_attempted' },
		]);
		expect(result[1]?.error).toContain('No exact match found');
		expect(editor.getText()).toBe(original);
	});

	it('supports a configurable single-file path guard', () => {
		const editor = new TextEditorDocument({ supportedPath: '/workflow.js' });

		expect(() => editor.execute({ command: 'view', path: '/other.js' })).toThrow(
			'Only /workflow.js is supported',
		);
	});
});

describe('text editor errors', () => {
	it('formats matching and line errors', () => {
		expect(new NoMatchFoundError('search string').message).toContain('No exact match found');
		expect(new MultipleMatchesError(3).message).toContain('Found 3 matches');
		expect(new InvalidLineNumberError(10, 5).message).toContain('Invalid line number 10');
		expect(new InvalidViewRangeError(4, 2, 10).message).toContain('end (2)');
	});

	it('formats path and missing-file errors without workflow-specific defaults', () => {
		const pathError = new InvalidPathError('/bad/path.ts', '/file.ts');
		expect(pathError.message).toContain('/bad/path.ts');
		expect(pathError.message).toContain('/file.ts');
		expect(new FileNotFoundError().message).toContain('No file content exists');
	});
});

describe('text editor helpers', () => {
	it('finds useful divergence context', () => {
		const result = findDivergenceContext('line1\nline2\nline3', 'line1\nline2\nwrong');

		expect(result).toContain('line 3');
		expect(result).toContain('line3');
	});

	it('returns undefined when divergence prefix is too short', () => {
		const result = findDivergenceContext('abcdefghij\nklmnop', 'xyz_completely_different');

		expect(result).toBeUndefined();
	});

	it('escapes whitespace and includes match percentage', () => {
		const result = findDivergenceContext('hello world\nfoo bar\n', 'hello world\nfoo baz\t');

		expect(result).toContain('\\t');
		expect(result).toMatch(/\d+%/);
	});

	it('shows nearby file lines around the divergence point', () => {
		const code = '  function foo() {\n    return 1;\n  }\n  function bar() {\n    return 2;\n  }';
		const searchStr =
			'  function foo() {\n    return 1;\n  }\n  function bar() {\n    return WRONG;\n  }';

		const result = findDivergenceContext(code, searchStr);

		expect(result).toContain('return 2;');
	});

	it('parses replacements from arrays and JSON strings', () => {
		const arrayResult = parseStrReplacements([{ old_str: 'old', new_str: 'new' }]);
		const stringResult = parseStrReplacements('[{"old_str":"old","new_str":"new"}]');

		expect(arrayResult).toEqual([{ old_str: 'old', new_str: 'new' }]);
		expect(stringResult).toEqual([{ old_str: 'old', new_str: 'new' }]);
	});

	it('parses empty old_str to preserve master behavior', () => {
		expect(parseStrReplacements([{ old_str: '', new_str: 'new' }])).toEqual([
			{ old_str: '', new_str: 'new' },
		]);
	});
});
