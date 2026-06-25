import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

process.env.N8N_ENCRYPTION_KEY = 'test_key';

const baseDir = join(tmpdir(), 'n8n-tests/');
mkdirSync(baseDir, { recursive: true });

const testDir = mkdtempSync(baseDir);
mkdirSync(join(testDir, '.n8n'));
process.env.N8N_USER_FOLDER = testDir;
process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'true';

// Disable egress protection in tests, for the same reason proxy env vars are
// cleared in setup-mocks: when active, high-risk call sites route outbound
// requests through a custom agent + secure DNS lookup that nock cannot
// intercept, so resolving the fake hostnames these suites mock fails (even in
// `log` mode, where DNS/infra errors propagate by design). `off` also matches
// the historical default these suites were written against; egress-specific
// tests opt in explicitly. Must be set here, before `@/config` is imported and
// the config classes are instantiated. The legacy alias is cleared so it can't
// override the mode.
process.env.N8N_EGRESS_PROTECTION_MODE = 'off';
delete process.env.N8N_SSRF_PROTECTION_ENABLED;

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
