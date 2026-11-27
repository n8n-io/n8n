import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Create a Vitest global setup that migrates one SQLite template database
 * before test workers start in CI. Each suite copies the template file instead
 * of replaying the full migration history.
 */
export function createSqliteTemplateGlobalSetup(moduleName: string) {
	return async function setup() {
		if (
			process.env.CI !== 'true' ||
			(process.env.DB_TYPE ?? 'sqlite') !== 'sqlite' ||
			(process.env.DB_TYPE === undefined && Boolean(process.env.DB_TYPE_FILE)) ||
			process.env.N8N_TEST_DISABLE_TEMPLATE_DB === '1'
		) {
			return;
		}

		const templateDir = mkdtempSync(join(tmpdir(), `n8n-${moduleName}-sqlite-template-`));
		const settingsDir = join(templateDir, '.n8n');
		mkdirSync(settingsDir);
		writeFileSync(join(settingsDir, 'config'), JSON.stringify({ encryptionKey: 'test_key' }), {
			encoding: 'utf-8',
			mode: 0o600,
		});

		const originalUserFolder = process.env.N8N_USER_FOLDER;
		const originalEncryptionKey = process.env.N8N_ENCRYPTION_KEY;
		const originalSqliteDatabase = process.env.DB_SQLITE_DATABASE;
		const originalTemplate = process.env.N8N_TEST_SQLITE_TEMPLATE;
		process.env.N8N_USER_FOLDER = templateDir;
		process.env.N8N_ENCRYPTION_KEY = 'test_key';
		process.env.DB_SQLITE_DATABASE = 'database.sqlite';
		let resetContainer: (() => void) | undefined;
		try {
			const [{ initSqliteTemplateDb }, { Container }] = await Promise.all([
				import('./test-db.js'),
				import('@n8n/di'),
			]);
			resetContainer = () => Container.reset();
			Container.reset();
			process.env.N8N_TEST_SQLITE_TEMPLATE = await initSqliteTemplateDb(settingsDir);
		} catch (error) {
			rmSync(templateDir, { recursive: true, force: true });
			throw error;
		} finally {
			resetContainer?.();
			if (originalUserFolder === undefined) delete process.env.N8N_USER_FOLDER;
			else process.env.N8N_USER_FOLDER = originalUserFolder;
			if (originalEncryptionKey === undefined) delete process.env.N8N_ENCRYPTION_KEY;
			else process.env.N8N_ENCRYPTION_KEY = originalEncryptionKey;
			if (originalSqliteDatabase === undefined) delete process.env.DB_SQLITE_DATABASE;
			else process.env.DB_SQLITE_DATABASE = originalSqliteDatabase;
		}

		return () => {
			if (originalTemplate === undefined) delete process.env.N8N_TEST_SQLITE_TEMPLATE;
			else process.env.N8N_TEST_SQLITE_TEMPLATE = originalTemplate;
			rmSync(templateDir, { recursive: true, force: true });
		};
	};
}
