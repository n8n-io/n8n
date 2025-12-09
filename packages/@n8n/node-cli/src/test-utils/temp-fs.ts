import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'vitest';

async function createTempDir(): Promise<string> {
	const ostmpdir = os.tmpdir();
	const tmpdir = path.join(ostmpdir, 'n8n-node-cli-test-');
	return await fs.mkdtemp(tmpdir);
}

interface TmpDirFixture {
	tmpdir: string;
}

export const tmpdirTest = test.extend<TmpDirFixture>({
	tmpdir: async ({ expect: _expect }, use) => {
		const directory = await createTempDir();
		const originalCwd = process.cwd();

		process.chdir(directory);

		try {
			await use(directory);
		} finally {
			process.chdir(originalCwd);
			// Add a small delay to ensure all file handles are released
			await new Promise((resolve) => setTimeout(resolve, 100));
			await fs.rm(directory, { recursive: true, force: true });
		}
	},
});
