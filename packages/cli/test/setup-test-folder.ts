import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

process.env.N8N_ENCRYPTION_KEY = 'test_key';
process.env.N8N_RUNNERS_AUTH_TOKEN = 'test_token';

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

// This is needed to ensure that `process.env` overrides in tests
// are set before any of the config classes are instantiated.
// TODO: delete this after we are done migrating everything to config classes
import '@/config';

// The import above is hoisted, so `GlobalConfig` is built before the env vars in
// this file are set. Env only reaches instances built after a `Container.reset()`.
// Task runners run in external mode only, which needs a shared secret with the
// launcher, so set it on the instance that already exists as well.
Container.get(TaskRunnersConfig).authToken = 'test_token';
