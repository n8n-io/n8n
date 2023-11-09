import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';

const baseDir = join(tmpdir(), 'n8n-tests/');
mkdirSync(baseDir, { recursive: true });

const testDir = mkdtempSync(baseDir);
mkdirSync(join(testDir, '.n8n'));
process.env.N8N_USER_FOLDER = testDir;

writeFileSync(
	join(testDir, '.n8n/config'),
	JSON.stringify({ encryptionKey: 'testkey', instanceId: '123' }),
	'utf-8',
);
