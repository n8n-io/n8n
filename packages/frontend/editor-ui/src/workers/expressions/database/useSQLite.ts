import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';
import { databaseConfig } from './schema';

export async function useSQLite() {
	let promiser: ReturnType<typeof sqlite3Worker1Promiser> | null = null;
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
		filename: databaseConfig.filename,
	});

	console.log('sqlite config', cfg, openResponse);

	if (openResponse.type === 'error') {
		throw new Error(openResponse.result.message);
	}

	dbId = openResponse.result.dbId as string;

	await promiser('exec', {
		dbId,
		sql: databaseConfig.tables.executions.schema,
	});

	return {
		promiser,
		dbId,
	};
}
