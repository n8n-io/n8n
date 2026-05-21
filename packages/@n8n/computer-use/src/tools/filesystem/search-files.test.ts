import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { textOf } from '../test-utils';
import { searchFilesTool } from './search-files';

type FileMatch = { path: string };
type ContentMatch = { path: string; lineNumber: number; line: string };

type NameOnlyResult = {
	name: string;
	matches: FileMatch[];
	truncated: boolean;
	totalMatches: number;
};

type ContentResult = {
	name: string;
	query: string;
	matches: ContentMatch[];
	truncated: boolean;
	totalMatches: number;
};

async function writeFile(root: string, relPath: string, content = ''): Promise<void> {
	const fullPath = path.join(root, relPath);
	await fs.mkdir(path.dirname(fullPath), { recursive: true });
	await fs.writeFile(fullPath, content);
}

function parseResult<T>(result: Awaited<ReturnType<typeof searchFilesTool.execute>>): T {
	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
	return JSON.parse(textOf(result)) as T;
}

describe('searchFilesTool', () => {
	let baseDir: string;
	let context: { dir: string };

	beforeEach(async () => {
		baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-files-'));
		context = { dir: baseDir };
	});

	afterEach(async () => {
		await fs.rm(baseDir, { recursive: true, force: true });
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(searchFilesTool.name).toBe('search_files');
		});

		it('description steers AI towards the right usage pattern', () => {
			const description = searchFilesTool.description;
			expect(description).toContain('Find files by name');
			expect(description).toContain('glob pattern');
			expect(description).toContain('query');
		});
	});

	describe('inputSchema validation', () => {
		it('accepts only required `name`', () => {
			expect(() => searchFilesTool.inputSchema.parse({ name: '**/*.ts' })).not.toThrow();
		});

		it('accepts all optional fields', () => {
			expect(() =>
				searchFilesTool.inputSchema.parse({
					name: '**/*.ts',
					query: 'TODO',
					ignoreCase: true,
					maxResults: 25,
				}),
			).not.toThrow();
		});

		it('throws when `name` is missing', () => {
			expect(() => searchFilesTool.inputSchema.parse({ query: 'foo' })).toThrow();
		});

		it('throws when `name` is not a string', () => {
			expect(() => searchFilesTool.inputSchema.parse({ name: 42 })).toThrow();
		});

		it('throws when `query` is not a string', () => {
			expect(() => searchFilesTool.inputSchema.parse({ name: '**/*', query: true })).toThrow();
		});

		it('throws when `ignoreCase` is not a boolean', () => {
			expect(() =>
				searchFilesTool.inputSchema.parse({ name: '**/*', ignoreCase: 'yes' }),
			).toThrow();
		});

		it('throws when `maxResults` is not an integer', () => {
			expect(() => searchFilesTool.inputSchema.parse({ name: '**/*', maxResults: 5.5 })).toThrow();
		});

		it('does not accept removed fields `dirPath` and `filePattern` (now stripped)', () => {
			const parsed = searchFilesTool.inputSchema.parse({
				name: '**/*',
				dirPath: '.',
				filePattern: '*.ts',
			}) as Record<string, unknown>;
			expect(parsed.dirPath).toBeUndefined();
			expect(parsed.filePattern).toBeUndefined();
		});
	});

	describe('execute — find by name', () => {
		it('finds a file by exact name at any depth', async () => {
			await writeFile(baseDir, 'joke.txt', 'why did the chicken');
			await writeFile(baseDir, 'src/jokes/another-joke.txt');
			await writeFile(baseDir, 'src/unrelated.ts');

			const result = await searchFilesTool.execute({ name: '**/joke.txt' }, context);
			const data = parseResult<NameOnlyResult>(result);

			expect(data.matches.map((m) => m.path)).toEqual(['joke.txt']);
			expect(data.totalMatches).toBe(1);
			expect(data.truncated).toBe(false);
		});

		it('matches multiple files with a wildcard pattern', async () => {
			await writeFile(baseDir, 'src/a.ts');
			await writeFile(baseDir, 'src/nested/b.ts');
			await writeFile(baseDir, 'src/c.js');

			const result = await searchFilesTool.execute({ name: 'src/**/*.ts' }, context);
			const data = parseResult<NameOnlyResult>(result);

			expect(data.matches.map((m) => m.path).sort()).toEqual(['src/a.ts', 'src/nested/b.ts']);
		});

		it('returns each match as `{ path }` when `query` is not given', async () => {
			await writeFile(baseDir, 'a.txt');
			await writeFile(baseDir, 'b.txt');

			const result = await searchFilesTool.execute({ name: '*.txt' }, context);
			const data = parseResult<NameOnlyResult>(result);

			expect(data.matches).toEqual(expect.arrayContaining([{ path: 'a.txt' }, { path: 'b.txt' }]));
			expect(data.matches).toHaveLength(2);
		});

		it('returns empty matches when nothing matches', async () => {
			await writeFile(baseDir, 'a.txt');

			const result = await searchFilesTool.execute({ name: '**/nothing-here.xyz' }, context);
			const data = parseResult<NameOnlyResult>(result);

			expect(data.matches).toEqual([]);
			expect(data.totalMatches).toBe(0);
			expect(data.truncated).toBe(false);
		});

		it('respects `maxResults` and sets `truncated`', async () => {
			for (let i = 0; i < 10; i++) {
				await writeFile(baseDir, `file-${i}.txt`);
			}

			const result = await searchFilesTool.execute({ name: '*.txt', maxResults: 3 }, context);
			const data = parseResult<NameOnlyResult>(result);

			expect(data.matches).toHaveLength(3);
			expect(data.totalMatches).toBe(10);
			expect(data.truncated).toBe(true);
		});

		it('excludes node_modules, .git, dist and similar directories', async () => {
			await writeFile(baseDir, 'src/index.ts', '');
			await writeFile(baseDir, 'node_modules/foo/index.ts');
			await writeFile(baseDir, '.git/HEAD');
			await writeFile(baseDir, 'dist/index.ts');

			const result = await searchFilesTool.execute({ name: '**/*' }, context);
			const data = parseResult<NameOnlyResult>(result);

			const paths = data.matches.map((m) => m.path);
			expect(paths).toContain('src/index.ts');
			expect(paths.some((p) => p.startsWith('node_modules/'))).toBe(false);
			expect(paths.some((p) => p.startsWith('.git/'))).toBe(false);
			expect(paths.some((p) => p.startsWith('dist/'))).toBe(false);
		});
	});

	describe('execute — find by name + grep contents', () => {
		it('returns line-level matches inside files matching `name`', async () => {
			await writeFile(baseDir, 'src/a.ts', 'const foo = 1;\nconst bar = 2;');
			await writeFile(baseDir, 'src/b.ts', 'no match here');
			await writeFile(baseDir, 'src/c.js', 'const foo = 999;');

			const result = await searchFilesTool.execute({ name: 'src/**/*.ts', query: 'foo' }, context);
			const data = parseResult<ContentResult>(result);

			expect(data.matches).toEqual([{ path: 'src/a.ts', lineNumber: 1, line: 'const foo = 1;' }]);
			// c.js wasn't part of the name pattern → ignored even though it contains "foo"
			expect(data.matches.every((m) => m.path.endsWith('.ts'))).toBe(true);
		});

		it('supports case-insensitive content search', async () => {
			await writeFile(baseDir, 'a.txt', 'Hello World\nhello world');

			const result = await searchFilesTool.execute(
				{ name: '**/*.txt', query: 'hello', ignoreCase: true },
				context,
			);
			const data = parseResult<ContentResult>(result);

			expect(data.matches).toHaveLength(2);
		});

		it('respects `maxResults` and sets `truncated` for content matches', async () => {
			const content = Array.from({ length: 100 }, (_, i) => `match_${i}`).join('\n');
			await writeFile(baseDir, 'many.txt', content);

			const result = await searchFilesTool.execute(
				{ name: '**/many.txt', query: 'match_', maxResults: 5 },
				context,
			);
			const data = parseResult<ContentResult>(result);

			expect(data.matches).toHaveLength(5);
			expect(data.truncated).toBe(true);
		});

		it('skips likely binary files', async () => {
			await writeFile(baseDir, 'binary.dat');
			await fs.writeFile(path.join(baseDir, 'binary.dat'), Buffer.from([0xff, 0xfe, 0xfd, 0xfc]));

			const result = await searchFilesTool.execute({ name: '**/*.dat', query: 'foo' }, context);
			const data = parseResult<ContentResult>(result);

			expect(data.matches).toHaveLength(0);
			expect(data.totalMatches).toBe(0);
		});

		it('returns zero matches when `query` is not found in matched files', async () => {
			await writeFile(baseDir, 'a.ts', 'const x = 1;');

			const result = await searchFilesTool.execute(
				{ name: '**/*.ts', query: 'zzz_not_found' },
				context,
			);
			const data = parseResult<ContentResult>(result);

			expect(data.matches).toHaveLength(0);
			expect(data.totalMatches).toBe(0);
		});
	});

	describe('execute — security', () => {
		it.each(['/etc/passwd', '../../etc/passwd', '../../../etc/**'])(
			'rejects pattern that escapes the base directory: %s',
			async (pattern) => {
				await expect(searchFilesTool.execute({ name: pattern }, context)).rejects.toThrow(
					'escapes the base directory',
				);
			},
		);
	});

	describe('CallToolResult shape', () => {
		it('returns a content array of length 1', async () => {
			await writeFile(baseDir, 'a.txt');

			const result = await searchFilesTool.execute({ name: '*.txt' }, context);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
		});
	});
});
