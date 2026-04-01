import type { Dirent, Stats } from 'node:fs';
import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { listFilesTool } from './list-files';

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

function mockReaddir(entries: Dirent[]): void {
	(fs.readdir as jest.Mock).mockResolvedValue(entries);
}

function mockStat(size = 100): void {
	jest.mocked(fs.stat).mockResolvedValue({ size } as unknown as Stats);
}

describe('listFilesTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(listFilesTool.name).toBe('list_files');
		});

		it('has a non-empty description', () => {
			expect(listFilesTool.description).toBe('List immediate children of a directory');
		});
	});

	describe('inputSchema validation', () => {
		it('accepts a valid input with only required fields', () => {
			expect(() => listFilesTool.inputSchema.parse({ dirPath: '.' })).not.toThrow();
		});

		it('accepts all optional fields with valid values', () => {
			expect(() =>
				listFilesTool.inputSchema.parse({ dirPath: 'src', type: 'file', maxResults: 50 }),
			).not.toThrow();
		});

		it('accepts type=directory', () => {
			expect(() =>
				listFilesTool.inputSchema.parse({ dirPath: '.', type: 'directory' }),
			).not.toThrow();
		});

		it('accepts type=all', () => {
			expect(() => listFilesTool.inputSchema.parse({ dirPath: '.', type: 'all' })).not.toThrow();
		});

		it('throws when dirPath is missing', () => {
			expect(() => listFilesTool.inputSchema.parse({})).toThrow();
		});

		it('throws when dirPath is not a string', () => {
			expect(() => listFilesTool.inputSchema.parse({ dirPath: 123 })).toThrow();
		});

		it('throws when type is an invalid enum value', () => {
			expect(() => listFilesTool.inputSchema.parse({ dirPath: '.', type: 'symlink' })).toThrow();
		});

		it('throws when maxResults is not an integer', () => {
			expect(() => listFilesTool.inputSchema.parse({ dirPath: '.', maxResults: 10.5 })).toThrow();
		});

		it('throws when maxResults is a string', () => {
			expect(() => listFilesTool.inputSchema.parse({ dirPath: '.', maxResults: 'all' })).toThrow();
		});

		it('leaves optional fields undefined when not provided', () => {
			const parsed = listFilesTool.inputSchema.parse({ dirPath: 'src' });
			expect(parsed.type).toBeUndefined();
			expect(parsed.maxResults).toBeUndefined();
		});
	});

	describe('execute', () => {
		// scanDirectory is called with maxDepth=0: only root is listed, no recursion
		it('returns immediate children of the root directory', async () => {
			mockReaddir([dirent('src', true), dirent('index.ts', false), dirent('utils.ts', false)]);
			mockStat();

			const result = await listFilesTool.execute({ dirPath: '.' }, CONTEXT);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const entries = JSON.parse(textOf(result)) as Array<{
				path: string;
				type: string;
			}>;

			const names = entries.map((e) => e.path);
			expect(names).toContain('src');
			expect(names).toContain('index.ts');
			expect(names).toContain('utils.ts');
		});

		it('does not recurse into subdirectories', async () => {
			// maxDepth=0: src is listed but its children are never scanned
			mockReaddir([dirent('src', true)]);

			const result = await listFilesTool.execute({ dirPath: '.' }, CONTEXT);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const entries = JSON.parse(textOf(result)) as Array<{ path: string }>;

			const names = entries.map((e) => e.path);
			expect(names).not.toContain('src/nested');
			expect(names).not.toContain('src/nested/deep.ts');
		});

		it('filters by type=file', async () => {
			mockReaddir([dirent('src', true), dirent('index.ts', false)]);
			mockStat();

			const result = await listFilesTool.execute({ dirPath: '.', type: 'file' }, CONTEXT);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const entries = JSON.parse(textOf(result)) as Array<{
				path: string;
				type: string;
			}>;

			expect(entries.every((e) => e.type === 'file')).toBe(true);
		});

		it('filters by type=directory', async () => {
			mockReaddir([dirent('src', true), dirent('index.ts', false)]);
			mockStat();

			const result = await listFilesTool.execute({ dirPath: '.', type: 'directory' }, CONTEXT);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const entries = JSON.parse(textOf(result)) as Array<{
				path: string;
				type: string;
			}>;

			expect(entries.every((e) => e.type === 'directory')).toBe(true);
		});

		it('respects maxResults', async () => {
			const files = Array.from({ length: 10 }, (_, i) => dirent(`file${i}.ts`, false));
			mockReaddir(files);
			mockStat();

			const result = await listFilesTool.execute({ dirPath: '.', maxResults: 3 }, CONTEXT);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const entries = JSON.parse(textOf(result)) as unknown[];

			expect(entries).toHaveLength(3);
		});

		it('includes sizeBytes for files', async () => {
			mockReaddir([dirent('hello.txt', false)]);
			jest.mocked(fs.stat).mockResolvedValue({ size: 5 } as unknown as Stats);

			const result = await listFilesTool.execute({ dirPath: '.' }, CONTEXT);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const entries = JSON.parse(textOf(result)) as Array<{
				path: string;
				sizeBytes?: number;
			}>;

			expect(entries[0]?.sizeBytes).toBe(5);
		});

		it('rejects path traversal', async () => {
			await expect(listFilesTool.execute({ dirPath: '../../../etc' }, CONTEXT)).rejects.toThrow(
				'escapes',
			);
		});

		it.each([
			{ type: undefined, label: 'no type filter' },
			{ type: 'file' as const, label: 'file filter' },
			{ type: 'directory' as const, label: 'directory filter' },
			{ type: 'all' as const, label: 'all filter' },
		])('returns content array of length 1 for $label', async ({ type }) => {
			mockReaddir([dirent('a.ts', false)]);
			mockStat();

			const result = await listFilesTool.execute({ dirPath: '.', type }, CONTEXT);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});
	});
});
