import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { scanDirectory } from '../tree-scanner';

describe('tree-scanner', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-proxy-scanner-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	async function createFile(relativePath: string, content = ''): Promise<void> {
		const fullPath = path.join(tmpDir, relativePath);
		await fs.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.writeFile(fullPath, content);
	}

	it('should scan a directory and return tree entries', async () => {
		await createFile('src/index.ts', 'export {};');
		await createFile('src/utils.ts', 'export {};');
		await createFile('package.json', '{}');

		const result = await scanDirectory(tmpDir);

		expect(result.rootPath).toBe(tmpDir);
		expect(result.tree.length).toBeGreaterThanOrEqual(3);

		const filePaths = result.tree.filter((e) => e.type === 'file').map((e) => e.path);
		expect(filePaths).toContain('src/index.ts');
		expect(filePaths).toContain('src/utils.ts');
		expect(filePaths).toContain('package.json');

		const dirPaths = result.tree.filter((e) => e.type === 'directory').map((e) => e.path);
		expect(dirPaths).toContain('src');
	});

	it('should report truncated as false for small directories', async () => {
		await createFile('src/index.ts', 'export {};');
		await createFile('package.json', '{}');

		const result = await scanDirectory(tmpDir);

		expect(result.truncated).toBe(false);
	});

	it('should respect maxDepth and mark as truncated', async () => {
		await createFile('a/b/c/d/deep.ts', '');

		const result = await scanDirectory(tmpDir, 1);

		// Should have 'a' directory but not descend to 'c' or 'd'
		const paths = result.tree.map((e) => e.path);
		expect(paths).toContain('a');
		expect(paths).toContain('a/b');
		// b is at depth 1, so its children (c) should not be scanned
		expect(paths).not.toContain('a/b/c');
		expect(result.truncated).toBe(true);
	});

	it('should exclude node_modules and .git', async () => {
		await createFile('src/index.ts', '');
		await createFile('node_modules/pkg/index.js', '');
		await createFile('.git/HEAD', 'ref: refs/heads/main');

		const result = await scanDirectory(tmpDir);

		const paths = result.tree.map((e) => e.path);
		expect(paths).not.toContain('node_modules');
		expect(paths).not.toContain('.git');
		expect(paths.some((p) => p.startsWith('node_modules/'))).toBe(false);
	});

	it('should include common config dot files', async () => {
		await createFile('.gitignore', 'node_modules');
		await createFile('.env.example', 'FOO=bar');

		const result = await scanDirectory(tmpDir);

		const filePaths = result.tree.map((e) => e.path);
		expect(filePaths).toContain('.gitignore');
		expect(filePaths).toContain('.env.example');
	});

	it('should include file sizes', async () => {
		await createFile('small.txt', 'hello');

		const result = await scanDirectory(tmpDir);

		const entry = result.tree.find((e) => e.path === 'small.txt');
		expect(entry).toBeDefined();
		expect(entry?.sizeBytes).toBe(5);
	});
});
