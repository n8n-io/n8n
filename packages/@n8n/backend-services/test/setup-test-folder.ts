import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Same instance setup as packages/cli/test/setup-test-folder.ts, so a moved test finds it.
process.env.N8N_ENCRYPTION_KEY = 'test_key';

const baseDir = join(tmpdir(), 'n8n-tests/');
mkdirSync(baseDir, { recursive: true });

const testDir = mkdtempSync(baseDir);
mkdirSync(join(testDir, '.n8n'));
process.env.N8N_USER_FOLDER = testDir;
process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'true';

writeFileSync(
	join(testDir, '.n8n/config'),
	JSON.stringify({ encryptionKey: 'test_key', instanceId: '123' }),
	{
		encoding: 'utf-8',
		mode: 0o600,
	},
);
