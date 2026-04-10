import type { Dirent, Stats } from 'node:fs';
import * as fs from 'node:fs/promises';

import { textOf } from '../test-utils';
import { searchFilesTool } from './search-files';

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

describe('searchFilesTool', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
			if (p === '/base') return await Promise.resolve('/base');
			throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(searchFilesTool.name).toBe('search_files');
		});

		it('has a non-empty description', () => {
			expect(searchFilesTool.description).toBe(
				'Search for text patterns across files using a literal text query',
			);
		});
	});

	describe('inputSchema validation', () => {
		it('accepts a valid input with only required fields', () => {
			expect(() => searchFilesTool.inputSchema.parse({ dirPath: '.', query: 'foo' })).not.toThrow();
		});

		it('accepts all optional fields with valid values', () => {
			expect(() =>
				searchFilesTool.inputSchema.parse({
					dirPath: 'src',
					query: 'TODO',
					filePattern: '**/*.ts',
					ignoreCase: true,
					maxResults: 25,
				}),
			).not.toThrow();
		});

		it('throws when dirPath is missing', () => {
			expect(() => searchFilesTool.inputSchema.parse({ query: 'foo' })).toThrow();
		});

		it('throws when query is missing', () => {
			expect(() => searchFilesTool.inputSchema.parse({ dirPath: '.' })).toThrow();
		});

		it('throws when dirPath is not a string', () => {
			expect(() => searchFilesTool.inputSchema.parse({ dirPath: 0, query: 'foo' })).toThrow();
		});

		it('throws when query is not a string', () => {
			expect(() => searchFilesTool.inputSchema.parse({ dirPath: '.', query: true })).toThrow();
		});

		it('throws when filePattern is not a string', () => {
			expect(() =>
				searchFilesTool.inputSchema.parse({ dirPath: '.', query: 'x', filePattern: 42 }),
			).toThrow();
		});

		it('throws when ignoreCase is not a boolean', () => {
			expect(() =>
				searchFilesTool.inputSchema.parse({ dirPath: '.', query: 'x', ignoreCase: 'yes' }),
			).toThrow();
		});

		it('throws when maxResults is not an integer', () => {
			expect(() =>
				searchFilesTool.inputSchema.parse({ dirPath: '.', query: 'x', maxResults: 5.5 }),
			).toThrow();
		});

		it('leaves optional fields undefined when not provided', () => {
			const parsed = searchFilesTool.inputSchema.parse({ dirPath: '.', query: 'x' });
			expect(parsed.filePattern).toBeUndefined();
			expect(parsed.ignoreCase).toBeUndefined();
			expect(parsed.maxResults).toBeUndefined();
		});
	});

	describe('execute', () => {
		it('finds matches across multiple files', async () => {
			// DFS: readdir('/base') → [src/], readdir('/base/src') → [index.ts, utils.ts]
			(fs.readdir as jest.Mock)
				.mockResolvedValueOnce([dirent('src', true)])
				.mockResolvedValueOnce([dirent('index.ts', false), dirent('utils.ts', false)]);
			mockStat();
			(fs.readFile as jest.Mock).mockResolvedValue('const foo = 1;\nconst bar = 2;');

			const result = await searchFilesTool.execute({ dirPath: '.', query: 'foo' }, CONTEXT);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as {
				query: string;
				matches: Array<{ path: string; lineNumber: number; line: string }>;
				truncated: boolean;
				totalMatches: number;
			};

			expect(data.query).toBe('foo');
			expect(data.matches.length).toBeGreaterThanOrEqual(2);
			expect(data.matches.some((m) => m.path.includes('index.ts'))).toBe(true);
		});

		it('supports case-insensitive search', async () => {
			(fs.readdir as jest.Mock).mockResolvedValue([dirent('test.ts', false)]);
			mockStat();
			(fs.readFile as jest.Mock).mockResolvedValue('Hello World\nhello world');

			const result = await searchFilesTool.execute(
				{ dirPath: '.', query: 'hello', ignoreCase: true },
				CONTEXT,
			);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as { matches: unknown[] };

			expect(data.matches).toHaveLength(2);
		});

		it('respects maxResults and sets truncated=true', async () => {
			(fs.readdir as jest.Mock).mockResolvedValue([dirent('many.txt', false)]);
			mockStat();
			const fileContent = Array.from({ length: 100 }, (_, i) => `match_${i}`).join('\n');
			(fs.readFile as jest.Mock).mockResolvedValue(fileContent);

			const result = await searchFilesTool.execute(
				{ dirPath: '.', query: 'match_', maxResults: 5 },
				CONTEXT,
			);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as {
				matches: unknown[];
				truncated: boolean;
			};

			expect(data.matches).toHaveLength(5);
			expect(data.truncated).toBe(true);
		});

		it('filters by filePattern — only .ts files are searched', async () => {
			// DFS: readdir('/base') → [src/], readdir('/base/src') → [index.ts, style.css]
			(fs.readdir as jest.Mock)
				.mockResolvedValueOnce([dirent('src', true)])
				.mockResolvedValueOnce([dirent('index.ts', false), dirent('style.css', false)]);
			mockStat();
			(fs.readFile as jest.Mock).mockResolvedValue('const needle = 1;');

			const result = await searchFilesTool.execute(
				{ dirPath: '.', query: 'needle', filePattern: '**/*.ts' },
				CONTEXT,
			);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as {
				matches: Array<{ path: string }>;
			};

			expect(data.matches.every((m) => m.path.endsWith('.ts'))).toBe(true);
			// style.css was excluded, readFile only called once (for index.ts)
			expect(fs.readFile as jest.Mock).toHaveBeenCalledTimes(1);
		});

		it('returns zero matches when query is not found', async () => {
			(fs.readdir as jest.Mock).mockResolvedValue([dirent('index.ts', false)]);
			mockStat();
			(fs.readFile as jest.Mock).mockResolvedValue('const x = 1;');

			const result = await searchFilesTool.execute(
				{ dirPath: '.', query: 'zzz_not_found' },
				CONTEXT,
			);
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const data = JSON.parse(textOf(result)) as {
				matches: unknown[];
				totalMatches: number;
			};

			expect(data.matches).toHaveLength(0);
			expect(data.totalMatches).toBe(0);
		});

		it('rejects path traversal', async () => {
			await expect(
				searchFilesTool.execute({ dirPath: '../../../etc', query: 'foo' }, CONTEXT),
			).rejects.toThrow('escapes');
		});

		it.each([
			{ query: 'foo', ignoreCase: undefined, label: 'case-sensitive' },
			{ query: 'foo', ignoreCase: true, label: 'case-insensitive' },
			{ query: 'foo', ignoreCase: false, label: 'explicitly case-sensitive' },
		])('returns content array of length 1 for $label search', async ({ query, ignoreCase }) => {
			(fs.readdir as jest.Mock).mockResolvedValue([dirent('a.ts', false)]);
			mockStat();
			(fs.readFile as jest.Mock).mockResolvedValue('const foo = 1;');

			const result = await searchFilesTool.execute({ dirPath: '.', query, ignoreCase }, CONTEXT);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});
	});
});
