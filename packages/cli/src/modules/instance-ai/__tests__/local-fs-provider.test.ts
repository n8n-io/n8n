jest.unmock('node:fs');
jest.unmock('node:fs/promises');

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { LocalFilesystemProvider } from '../filesystem/local-fs-provider';

describe('LocalFilesystemProvider', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-fs-test-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	/** Helper: create a file in the temp directory with optional content. */
	async function createFile(relativePath: string, content = ''): Promise<void> {
		const fullPath = path.join(tmpDir, relativePath);
		await fs.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.writeFile(fullPath, content);
	}

	describe('getFileTree', () => {
		it('should return a structured tree', async () => {
			await createFile('src/index.ts', 'export {};');
			await createFile('src/utils.ts', 'export {};');
			await createFile('package.json', '{}');

			const provider = new LocalFilesystemProvider(tmpDir);
			const tree = await provider.getFileTree('.');

			expect(tree).toContain('src/');
			expect(tree).toContain('index.ts');
			expect(tree).toContain('utils.ts');
			expect(tree).toContain('package.json');
		});

		it('should respect maxDepth', async () => {
			await createFile('a/b/c/deep.ts', '');

			const provider = new LocalFilesystemProvider(tmpDir);
			const tree = await provider.getFileTree('.', { maxDepth: 1 });

			expect(tree).toContain('a/');
			expect(tree).not.toContain('deep.ts');
		});

		it('should exclude default directories', async () => {
			await createFile('node_modules/pkg/index.js', '');
			await createFile('.git/config', '');
			await createFile('src/index.ts', '');

			const provider = new LocalFilesystemProvider(tmpDir);
			const tree = await provider.getFileTree('.');

			expect(tree).not.toContain('node_modules');
			expect(tree).not.toContain('.git');
			expect(tree).toContain('index.ts');
		});

		it('should support custom exclusions', async () => {
			await createFile('build/output.js', '');
			await createFile('src/index.ts', '');

			const provider = new LocalFilesystemProvider(tmpDir);
			const tree = await provider.getFileTree('.', { exclude: ['build'] });

			expect(tree).not.toContain('build');
			expect(tree).toContain('index.ts');
		});
	});

	describe('listFiles', () => {
		it('should recursively list files', async () => {
			await createFile('src/index.ts', '');
			await createFile('src/lib/helper.ts', '');
			await createFile('package.json', '');

			const provider = new LocalFilesystemProvider(tmpDir);
			const files = await provider.listFiles('.', { type: 'file' });

			expect(files.length).toBe(3);
			expect(files.map((f) => f.path)).toEqual(
				expect.arrayContaining(['src/index.ts', 'src/lib/helper.ts', 'package.json']),
			);
		});

		it('should list only directories when type is directory', async () => {
			await createFile('src/index.ts', '');
			await createFile('src/lib/helper.ts', '');
			await createFile('package.json', '');

			const provider = new LocalFilesystemProvider(tmpDir);
			const dirs = await provider.listFiles('.', { type: 'directory' });

			expect(dirs.every((d) => d.type === 'directory')).toBe(true);
			expect(dirs.map((d) => d.path)).toEqual(expect.arrayContaining(['src', 'src/lib']));
		});

		it('should list only immediate children when recursive is false', async () => {
			await createFile('src/index.ts', '');
			await createFile('src/lib/helper.ts', '');
			await createFile('package.json', '');

			const provider = new LocalFilesystemProvider(tmpDir);
			const entries = await provider.listFiles('.', { recursive: false });

			expect(entries.map((e) => e.path)).toEqual(expect.arrayContaining(['src', 'package.json']));
			expect(entries.map((e) => e.path)).not.toEqual(
				expect.arrayContaining([expect.stringContaining('/')]),
			);
		});

		it('should filter by glob pattern', async () => {
			await createFile('src/index.ts', '');
			await createFile('src/styles.css', '');
			await createFile('README.md', '');

			const provider = new LocalFilesystemProvider(tmpDir);
			const files = await provider.listFiles('.', { pattern: '**/*.ts' });

			expect(files.length).toBe(1);
			expect(files[0].path).toBe('src/index.ts');
		});

		it('should respect maxResults', async () => {
			for (let i = 0; i < 10; i++) {
				await createFile(`file${i}.txt`, '');
			}

			const provider = new LocalFilesystemProvider(tmpDir);
			const files = await provider.listFiles('.', { maxResults: 3 });

			expect(files.length).toBe(3);
		});

		it('should include file size', async () => {
			await createFile('test.txt', 'hello world');

			const provider = new LocalFilesystemProvider(tmpDir);
			const files = await provider.listFiles('.');

			expect(files[0].sizeBytes).toBe(11);
		});

		it('should exclude node_modules', async () => {
			await createFile('node_modules/pkg/index.js', '');
			await createFile('src/index.ts', '');

			const provider = new LocalFilesystemProvider(tmpDir);
			const files = await provider.listFiles('.');

			expect(files.map((f) => f.path)).not.toEqual(
				expect.arrayContaining([expect.stringContaining('node_modules')]),
			);
		});
	});

	describe('readFile', () => {
		it('should read file content', async () => {
			await createFile('test.ts', 'line1\nline2\nline3');

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.readFile('test.ts');

			expect(result.content).toBe('line1\nline2\nline3');
			expect(result.totalLines).toBe(3);
			expect(result.truncated).toBe(false);
		});

		it('should support line slicing', async () => {
			const lines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`);
			await createFile('large.ts', lines.join('\n'));

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.readFile('large.ts', { startLine: 10, maxLines: 5 });

			expect(result.content).toBe('line 10\nline 11\nline 12\nline 13\nline 14');
			expect(result.truncated).toBe(true);
			expect(result.totalLines).toBe(50);
		});

		it('should truncate at default max lines', async () => {
			const lines = Array.from({ length: 300 }, (_, i) => `line ${i + 1}`);
			await createFile('huge.ts', lines.join('\n'));

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.readFile('huge.ts');

			const outputLines = result.content.split('\n');
			expect(outputLines.length).toBe(200);
			expect(result.truncated).toBe(true);
		});

		it('should reject binary files', async () => {
			const binary = Buffer.from([0x00, 0x01, 0x02, 0xff]);
			await fs.writeFile(path.join(tmpDir, 'image.bin'), binary);

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.readFile('image.bin');

			expect(result.content).toContain('Binary file');
		});

		it('should reject files exceeding size cap', async () => {
			const large = Buffer.alloc(600 * 1024, 'a');
			await fs.writeFile(path.join(tmpDir, 'big.dat'), large);

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.readFile('big.dat');

			expect(result.content).toContain('too large');
			expect(result.truncated).toBe(true);
		});
	});

	describe('searchFiles', () => {
		it('should find matching lines', async () => {
			await createFile('src/index.ts', 'const foo = 1;\nconst bar = 2;\nfoo();');

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.searchFiles('.', { query: 'foo' });

			expect(result.matches.length).toBe(2);
			expect(result.matches[0].lineNumber).toBe(1);
			expect(result.matches[1].lineNumber).toBe(3);
		});

		it('should support case-insensitive search', async () => {
			await createFile('test.ts', 'Hello World\nhello world');

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.searchFiles('.', { query: 'hello', ignoreCase: true });

			expect(result.matches.length).toBe(2);
		});

		it('should filter by filePattern', async () => {
			await createFile('src/index.ts', 'match here');
			await createFile('src/styles.css', 'match here too');

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.searchFiles('.', {
				query: 'match',
				filePattern: '**/*.ts',
			});

			expect(result.matches.length).toBe(1);
			expect(result.matches[0].path).toBe('src/index.ts');
		});

		it('should respect maxResults', async () => {
			const lines = Array.from({ length: 100 }, () => 'match');
			await createFile('many.ts', lines.join('\n'));

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.searchFiles('.', { query: 'match', maxResults: 5 });

			expect(result.matches.length).toBe(5);
			expect(result.truncated).toBe(true);
			expect(result.totalMatches).toBe(100);
		});

		it('should handle invalid regex gracefully', async () => {
			await createFile('test.ts', 'foo(bar');

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.searchFiles('.', { query: 'foo(' });

			// Should fall back to literal match
			expect(result.matches.length).toBe(1);
		});
	});

	describe('path containment (with basePath)', () => {
		it('should reject traversal attempts', async () => {
			const provider = new LocalFilesystemProvider(tmpDir);

			await expect(provider.readFile('../../etc/passwd')).rejects.toThrow(
				'outside the allowed directory',
			);
		});

		it('should reject symlink escape', async () => {
			// Create a symlink pointing outside tmpDir
			const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'outside-'));
			await fs.writeFile(path.join(outsideDir, 'secret.txt'), 'secret');

			try {
				await fs.symlink(outsideDir, path.join(tmpDir, 'escape-link'));

				const provider = new LocalFilesystemProvider(tmpDir);

				await expect(provider.readFile('escape-link/secret.txt')).rejects.toThrow(
					'outside the allowed directory',
				);
			} finally {
				await fs.rm(outsideDir, { recursive: true, force: true });
			}
		});

		it('should allow paths within basePath', async () => {
			await createFile('valid/file.ts', 'ok');

			const provider = new LocalFilesystemProvider(tmpDir);
			const result = await provider.readFile('valid/file.ts');

			expect(result.content).toBe('ok');
		});
	});

	describe('no basePath', () => {
		it('should accept absolute paths freely', async () => {
			await createFile('test.ts', 'content');

			const provider = new LocalFilesystemProvider();
			const result = await provider.readFile(path.join(tmpDir, 'test.ts'));

			expect(result.content).toBe('content');
		});
	});

	describe('tilde expansion', () => {
		it('should expand ~ to home directory in paths', async () => {
			// Create a file in a predictable location under home
			const homeRelPath = path.relative(os.homedir(), tmpDir);
			await createFile('tilde-test.txt', 'tilde content');

			const provider = new LocalFilesystemProvider();
			const result = await provider.readFile(`~/${homeRelPath}/tilde-test.txt`);

			expect(result.content).toBe('tilde content');
		});

		it('should expand ~ in dirPath for listFiles', async () => {
			await createFile('a.ts', '');
			const homeRelPath = path.relative(os.homedir(), tmpDir);

			const provider = new LocalFilesystemProvider();
			const files = await provider.listFiles(`~/${homeRelPath}`);

			expect(files.map((f) => f.path)).toContain('a.ts');
		});
	});
});
