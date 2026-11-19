import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const testFolder = mkdtempSync(join(tmpdir(), 'n8n-backend-services-'));

process.env.N8N_USER_FOLDER = testFolder;
process.env.N8N_ENCRYPTION_KEY = 'test-key';

afterAll(() => {
	rmSync(testFolder, { recursive: true, force: true });
});
