import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';
import type { Promiser } from '@sqlite.org/sqlite-wasm';

export type DatabaseTable = {
	name: string;
	schema: string;
};

export type DatabaseConfig = {
	filename: `file:${string}.sqlite3?vfs=opfs`;
	tables: Record<string, DatabaseTable>;
};

export async function useDatabase(config: DatabaseConfig) {
	let promiser: Promiser | null = null;
	let dbId: string | null = null;

	// Initialize the SQLite worker
	promiser = await new Promise((resolve) => {
		const _promiser = sqlite3Worker1Promiser({
			onready: () => resolve(_promiser),
		});
	});

	if (!promiser) throw new Error('Failed to initialize promiser');

	// Get configuration and open database
	const cfg = await promiser('config-get', {});
	const openResponse = await promiser('open', {
		filename: config.filename,
	});

	if (openResponse.type === 'error') {
		throw new Error(openResponse.result.message);
	}

	dbId = openResponse.result.dbId as string;

	for (const table of Object.values(config.tables)) {
		await promiser('exec', {
			dbId,
			sql: table.schema,
		});
	}

	return {
		promiser,
		dbId,
		cfg,
	};
}
