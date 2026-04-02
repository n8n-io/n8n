import type { Dirent, Stats } from 'node:fs';
import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { getFileTreeTool } from './get-file-tree';

jest.mock('node:fs/promises');

const CONTEXT = { dir: '/base' };

function dirent(name: string, isDir: boolean): Dirent {
	return {
		name,
		parentPath: '',
		path: '',
		isDirectory: () => isDir,
		isFile: () => !isDir,
		isSymbolicLink: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false,
		isFIFO: () => false,
		isSocket: () => false,
	} as unknown as Dirent;
}

function mockStat(size = 100): void {
	jest.mocked(fs.stat).mockResolvedValue({ size } as unknown as Stats);
}

function mockReaddir(...batches: Dirent[][]): void {
	const mock = fs.readdir as jest.Mock;
	for (const batch of batches) {
		mock.mockResolvedValueOnce(batch);
	}
}

describe('getFileTreeTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(getFileTreeTool.name).toBe('get_file_tree');
		});

		it('has a non-empty description', () => {
			expect(getFileTreeTool.description).toBe('Get an indented directory tree');
		});
	});

	describe('inputSchema validation', () => {
		it('accepts a valid input with only required fields', () => {
			expect(() => getFileTreeTool.inputSchema.parse({ dirPath: '.' })).not.toThrow();
		});

		it('accepts a valid input with all fields', () => {
			expect(() =>
				getFileTreeTool.inputSchema.parse({ dirPath: 'src', maxDepth: 3 }),
			).not.toThrow();
		});

		it('throws when dirPath is missing', () => {
			expect(() => getFileTreeTool.inputSchema.parse({})).toThrow();
		});

		it('throws when dirPath is not a string', () => {
			expect(() => getFileTreeTool.inputSchema.parse({ dirPath: 42 })).toThrow();
		});

		it('throws when maxDepth is not an integer', () => {
			expect(() => getFileTreeTool.inputSchema.parse({ dirPath: '.', maxDepth: 1.5 })).toThrow();
		});

		it('throws when maxDepth is a string', () => {
			expect(() => getFileTreeTool.inputSchema.parse({ dirPath: '.', maxDepth: 'deep' })).toThrow();
		});

		it('omits maxDepth when not provided', () => {
			const parsed = getFileTreeTool.inputSchema.parse({ dirPath: '.' });
			expect(parsed.maxDepth).toBeUndefined();
		});
	});

	describe('execute', () => {
		it('renders root directory with files and subdirectories', async () => {
			// BFS call 1: root → [src/ (dir), package.json (file)]
			// BFS call 2: /base/src → [index.ts (file)]
			mockReaddir(
				[dirent('src', true), dirent('package.json', false)],
				[dirent('index.ts', false)],
			);
			mockStat();

			const result = await getFileTreeTool.execute({ dirPath: '.' }, CONTEXT);

			expect(result.content).toHaveLength(1);
			const text = textOf(result);
			expect(text).toContain('src/');
			expect(text).toContain('index.ts');
			expect(text).toContain('package.json');
		});

		it('returns tree as plain text (not JSON)', async () => {
			mockReaddir([dirent('a.ts', false)]);
			mockStat();

			const result = await getFileTreeTool.execute({ dirPath: '.' }, CONTEXT);
			const text = textOf(result);

			// Should be indented tree text, not a JSON structure
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			expect((): unknown => JSON.parse(text)).toThrow();
			expect(text).toContain('/');
		});

		it('appends truncation notice when tree is truncated by maxDepth', async () => {
			// BFS call 1: root → [a/ (dir)]
			// BFS call 2: /base/a → [b/ (dir)] — b is at maxDepth=1, not queued → truncated
			mockReaddir([dirent('a', true)], [dirent('b', true)]);

			const result = await getFileTreeTool.execute({ dirPath: '.', maxDepth: 1 }, CONTEXT);
			const text = textOf(result);

			expect(text).toContain('truncated');
		});

		it('does not append truncation notice for shallow trees', async () => {
			mockReaddir([dirent('index.ts', false)]);
			mockStat();

			const result = await getFileTreeTool.execute({ dirPath: '.', maxDepth: 5 }, CONTEXT);
			const text = textOf(result);

			expect(text).not.toContain('truncated');
		});

		it('excludes node_modules and .git', async () => {
			// BFS call 1: root → [node_modules/ (excluded), .git/ (excluded), src/ (dir)]
			// BFS call 2: /base/src → [index.ts (file)]
			mockReaddir(
				[dirent('node_modules', true), dirent('.git', true), dirent('src', true)],
				[dirent('index.ts', false)],
			);
			mockStat();

			const result = await getFileTreeTool.execute({ dirPath: '.' }, CONTEXT);
			const text = textOf(result);

			expect(text).not.toContain('node_modules');
			expect(text).not.toContain('.git');
		});

		it('rejects path traversal', async () => {
			await expect(getFileTreeTool.execute({ dirPath: '../../../etc' }, CONTEXT)).rejects.toThrow(
				'escapes',
			);
		});

		it.each([
			{ maxDepth: undefined, label: 'default depth' },
			{ maxDepth: 1, label: 'depth 1' },
			{ maxDepth: 3, label: 'depth 3' },
		])('returns content array of length 1 for $label', async ({ maxDepth }) => {
			mockReaddir([dirent('file.ts', false)]);
			mockStat();

			const result = await getFileTreeTool.execute({ dirPath: '.', maxDepth }, CONTEXT);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});
	});
});
