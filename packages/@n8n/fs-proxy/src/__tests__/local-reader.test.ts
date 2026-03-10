import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { readFile, searchFiles } from '../local-reader';

describe('local-reader', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-proxy-reader-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	async function createFile(relativePath: string, content = ''): Promise<void> {
		const fullPath = path.join(tmpDir, relativePath);
		await fs.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.writeFile(fullPath, content);
	}

	describe('readFile', () => {
		it('should read a text file', async () => {
			await createFile('hello.txt', 'Hello, world!\nLine 2\nLine 3');

			const result = await readFile(tmpDir, 'hello.txt');
			expect(result.path).toBe('hello.txt');
			expect(result.content).toContain('Hello, world!');
			expect(result.totalLines).toBe(3);
			expect(result.truncated).toBe(false);
		});

		it('should respect maxLines', async () => {
			const lines = Array.from({ length: 500 }, (_, i) => `Line ${i + 1}`).join('\n');
			await createFile('big.txt', lines);

			const result = await readFile(tmpDir, 'big.txt', { maxLines: 10 });
			expect(result.content.split('\n')).toHaveLength(10);
			expect(result.truncated).toBe(true);
			expect(result.totalLines).toBe(500);
		});

		it('should respect startLine', async () => {
			const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n');
			await createFile('numbered.txt', lines);

			const result = await readFile(tmpDir, 'numbered.txt', { startLine: 5, maxLines: 3 });
			expect(result.content).toBe('Line 5\nLine 6\nLine 7');
		});

		it('should detect binary files', async () => {
			const binary = Buffer.alloc(100);
			binary[50] = 0; // null byte
			await fs.writeFile(path.join(tmpDir, 'binary.dat'), binary);

			await expect(readFile(tmpDir, 'binary.dat')).rejects.toThrow('Binary file');
		});

		it('should reject files larger than 512KB', async () => {
			const large = Buffer.alloc(600 * 1024, 'a');
			await fs.writeFile(path.join(tmpDir, 'large.txt'), large);

			await expect(readFile(tmpDir, 'large.txt')).rejects.toThrow('too large');
		});

		it('should reject path traversal', async () => {
			await expect(readFile(tmpDir, '../../../etc/passwd')).rejects.toThrow('escapes');
		});
	});

	describe('searchFiles', () => {
		it('should find matches in files', async () => {
			await createFile('src/index.ts', 'const foo = 1;\nconst bar = 2;\nconst foo_bar = 3;');
			await createFile('src/utils.ts', 'export function foo() {}');

			const result = await searchFiles(tmpDir, '.', { query: 'foo' });
			expect(result.query).toBe('foo');
			expect(result.matches.length).toBeGreaterThanOrEqual(2);
			expect(result.matches.some((m) => m.path.includes('index.ts'))).toBe(true);
		});

		it('should support case-insensitive search', async () => {
			await createFile('test.ts', 'Hello World\nhello world');

			const result = await searchFiles(tmpDir, '.', {
				query: 'hello',
				ignoreCase: true,
			});
			expect(result.matches).toHaveLength(2);
		});

		it('should respect maxResults', async () => {
			const content = Array.from({ length: 100 }, (_, i) => `match_${i}`).join('\n');
			await createFile('many.txt', content);

			const result = await searchFiles(tmpDir, '.', {
				query: 'match_',
				maxResults: 5,
			});
			expect(result.matches).toHaveLength(5);
			expect(result.truncated).toBe(true);
		});
	});
});
