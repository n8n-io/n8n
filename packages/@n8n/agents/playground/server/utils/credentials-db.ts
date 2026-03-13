import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
	if (!db) {
		const dbPath = resolve(process.cwd(), 'credentials.db');
		db = new DatabaseSync(dbPath);
		db.exec(`
			CREATE TABLE IF NOT EXISTS credentials (
				name TEXT PRIMARY KEY,
				api_key TEXT NOT NULL
			)
		`);
	}
	return db;
}

function maskKey(key: string): string {
	if (key.length <= 8) return '••••';
	return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function listCredentials(): Array<{ name: string; maskedKey: string }> {
	const rows = getDb()
		.prepare('SELECT name, api_key FROM credentials ORDER BY name')
		.all() as Array<{
		name: string;
		api_key: string;
	}>;
	return rows.map((r) => ({ name: r.name, maskedKey: maskKey(r.api_key) }));
}

export function getCredentialKey(name: string): string | undefined {
	const row = getDb().prepare('SELECT api_key FROM credentials WHERE name = ?').get(name) as
		| { api_key: string }
		| undefined;
	return row?.api_key;
}

export function createCredential(name: string, apiKey: string): boolean {
	try {
		getDb().prepare('INSERT INTO credentials (name, api_key) VALUES (?, ?)').run(name, apiKey);
		return true;
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes('UNIQUE constraint')) return false;
		throw e;
	}
}

export function updateCredential(name: string, apiKey: string): boolean {
	const result = getDb()
		.prepare('UPDATE credentials SET api_key = ? WHERE name = ?')
		.run(apiKey, name);
	return result.changes > 0;
}

export function deleteCredential(name: string): boolean {
	const result = getDb().prepare('DELETE FROM credentials WHERE name = ?').run(name);
	return result.changes > 0;
}
