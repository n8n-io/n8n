import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

const testFolder = mkdtempSync(join(tmpdir(), 'n8n-node-engine-compatibility-'));

process.env.N8N_USER_FOLDER = testFolder;
process.env.N8N_ENCRYPTION_KEY = 'test-key';

afterAll(() => {
	rmSync(testFolder, { recursive: true, force: true });
});
