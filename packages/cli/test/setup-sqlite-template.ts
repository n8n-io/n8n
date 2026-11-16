/**
 * Vitest global setup for the SQLite integration tests in CI. It migrates one
 * SQLite database file before the workers start. Each test file's
 * `testDb.init()` then copies that file instead of replaying the full
 * migration history.
 *
 * It runs only in CI, so a local run never builds or copies a template.
 * Set N8N_TEST_DISABLE_TEMPLATE_DB=1 to opt out (e.g. when bisecting migration bugs).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let templateDir: string | undefined;

export async function setup() {
	if (
		process.env.CI !== 'true' ||
		process.env.DB_TYPE !== 'sqlite' ||
		process.env.N8N_TEST_DISABLE_TEMPLATE_DB === '1'
	) {
		return;
	}

	templateDir = mkdtempSync(join(tmpdir(), 'n8n-sqlite-template-'));
	mkdirSync(join(templateDir, '.n8n'));
	// Same instance settings as `setup-test-folder.ts` gives each test file.
	writeFileSync(
		join(templateDir, '.n8n/config'),
		JSON.stringify({ encryptionKey: 'test_key', instanceId: '123' }),
		{ encoding: 'utf-8', mode: 0o600 },
	);

	const originalUserFolder = process.env.N8N_USER_FOLDER;
	process.env.N8N_USER_FOLDER = templateDir;
	const start = Date.now();
	const { testDb } = await import('@n8n/backend-test-utils');
	const { Container } = await import('@n8n/di');
	try {
		// `global-setup.ts` already created the config classes with the default
		// n8n folder. Reset them, so they read the template folder set above.
		Container.reset();
		process.env.N8N_TEST_SQLITE_TEMPLATE = await testDb.initSqliteTemplateDb(
			join(templateDir, '.n8n'),
		);
	} finally {
		Container.reset();
		if (originalUserFolder === undefined) delete process.env.N8N_USER_FOLDER;
		else process.env.N8N_USER_FOLDER = originalUserFolder;
	}
	console.log(`✓ SQLite template DB ready (${Date.now() - start}ms)`);
}

export async function teardown() {
	if (templateDir) rmSync(templateDir, { recursive: true, force: true });
}
