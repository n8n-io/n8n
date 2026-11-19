import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.N8N_ENCRYPTION_KEY = 'test_key';

const baseDir = join(tmpdir(), 'n8n-insights-tests');
mkdirSync(baseDir, { recursive: true });

const testDir = mkdtempSync(join(baseDir, 'run-'));
const settingsDir = join(testDir, '.n8n');
mkdirSync(settingsDir);
process.env.N8N_USER_FOLDER = testDir;
process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'true';

writeFileSync(join(settingsDir, 'config'), JSON.stringify({ encryptionKey: 'test_key' }), {
	encoding: 'utf-8',
	mode: 0o600,
});
