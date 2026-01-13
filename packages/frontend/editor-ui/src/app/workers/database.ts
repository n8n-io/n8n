import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database as Sqlite3Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';

export type DatabaseTable = {
	name: string;
	schema: string;
};

export type DatabaseConfig = {
	filename: string;
	tables: Record<string, DatabaseTable>;
};

export type Database = {
	db: Sqlite3Database;
	sqlite3: Sqlite3Static;
};

export async function initializeDatabase(config: DatabaseConfig): Promise<Database> {
	console.log('SharedWorker / initializeDatabase');
	console.log('SharedWorker / crossOriginIsolated:', self.crossOriginIsolated);
	console.log(
		'SharedWorker / SharedArrayBuffer available:',
		typeof SharedArrayBuffer !== 'undefined',
	);

	// Initialize SQLite directly in the SharedWorker (no nested worker needed)
	const sqlite3 = await sqlite3InitModule({
		print: console.log,
		printErr: console.error,
		locateFile: (file: string) => {
			// In development, Vite serves from node_modules
			// In production, files are copied to assets/
			if (file.endsWith('.wasm')) {
				return new URL(`/assets/${file}`, self.location.origin).href;
			}
			return file;
		},
	});

	console.log('Running SQLite3 version', sqlite3.version.libVersion);

	// Use OPFS if available for persistent storage, otherwise use in-memory
	const db =
		'opfs' in sqlite3
			? new sqlite3.oo1.OpfsDb(config.filename)
			: new sqlite3.oo1.DB(config.filename, 'ct');

	console.log(
		'opfs' in sqlite3
			? `OPFS is available, created persisted database at ${db.filename}`
			: `OPFS is not available, created transient database ${db.filename}`,
	);

	// Create tables from config
	for (const table of Object.values(config.tables)) {
		db.exec(table.schema);
	}

	return {
		db,
		sqlite3,
	};
}
