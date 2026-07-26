import { describe, expect, it } from 'vitest';
import {
	diffLines,
	extractStrReplaceDiff,
	extractWriteFileView,
	languageFromPath,
	writeFileToDiffView,
} from '../toolArgsDiff.utils';

describe('extractStrReplaceDiff', () => {
	it('extracts a single workspace_str_replace_file hunk', () => {
		expect(
			extractStrReplaceDiff('workspace_str_replace_file', {
				path: 'src/workflows/faq.workflow.ts',
				old_str: 'toJSON()',
				new_str: 'JSON.stringify($json)',
			}),
		).toEqual({
			path: 'src/workflows/faq.workflow.ts',
			hunks: [{ oldString: 'toJSON()', newString: 'JSON.stringify($json)' }],
		});
	});

	it('extracts computer-use edit_file args (oldString/newString/filePath)', () => {
		expect(
			extractStrReplaceDiff('edit_file', {
				filePath: 'notes.txt',
				oldString: 'hello',
				newString: 'world',
			}),
		).toEqual({
			path: 'notes.txt',
			hunks: [{ oldString: 'hello', newString: 'world' }],
		});
	});

	it('extracts batch replacements', () => {
		expect(
			extractStrReplaceDiff('workspace_batch_str_replace_file', {
				path: 'a.ts',
				replacements: [
					{ old_str: 'a', new_str: 'b' },
					{ old_str: 'c', new_str: 'd' },
				],
			}),
		).toEqual({
			path: 'a.ts',
			hunks: [
				{ oldString: 'a', newString: 'b' },
				{ oldString: 'c', newString: 'd' },
			],
		});
	});

	it('returns undefined for incomplete streaming args', () => {
		expect(
			extractStrReplaceDiff('workspace_str_replace_file', {
				path: 'a.ts',
				old_str: 'partial',
			}),
		).toBeUndefined();
	});

	it('returns undefined for unrelated tools', () => {
		expect(
			extractStrReplaceDiff('workspace_read_file', {
				path: 'a.ts',
				old_str: 'a',
				new_str: 'b',
			}),
		).toBeUndefined();
	});
});

describe('extractWriteFileView', () => {
	it('extracts workspace_write_file path and content', () => {
		expect(
			extractWriteFileView('workspace_write_file', {
				path: 'src/workflows/faq.workflow.ts',
				content: "import { workflow } from '@n8n/workflow-sdk';\n",
			}),
		).toEqual({
			path: 'src/workflows/faq.workflow.ts',
			content: "import { workflow } from '@n8n/workflow-sdk';\n",
		});
	});

	it('returns undefined when content is still streaming', () => {
		expect(
			extractWriteFileView('workspace_write_file', {
				path: 'a.ts',
			}),
		).toBeUndefined();
	});
});

describe('languageFromPath', () => {
	it('maps TypeScript workflow files', () => {
		expect(languageFromPath('src/workflows/faq.workflow.ts')).toBe('typescript');
	});
});

describe('writeFileToDiffView', () => {
	it('converts a write into a new-file addition hunk', () => {
		expect(
			writeFileToDiffView({
				path: 'a.ts',
				content: 'const x = 1;\n',
			}),
		).toEqual({
			path: 'a.ts',
			hunks: [{ oldString: '', newString: 'const x = 1;\n' }],
		});
	});
});

describe('diffLines', () => {
	it('marks unchanged, deleted, and added lines', () => {
		expect(
			diffLines('keep\nold\ntrail', 'keep\nnew\ntrail').map((line) => [line.type, line.text]),
		).toEqual([
			['equal', 'keep'],
			['del', 'old'],
			['add', 'new'],
			['equal', 'trail'],
		]);
	});

	it('handles pure replacements', () => {
		expect(diffLines('a', 'b').map((line) => [line.type, line.text])).toEqual([
			['del', 'a'],
			['add', 'b'],
		]);
	});

	it('treats empty oldString as a full-file addition', () => {
		expect(diffLines('', 'one\ntwo').map((line) => [line.type, line.text])).toEqual([
			['add', 'one'],
			['add', 'two'],
		]);
	});
});
