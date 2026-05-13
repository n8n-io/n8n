import { randomBytes } from 'node:crypto';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface TempTree {
	rootDir: string;
	dbPath: string;
	userFolderPath: string;
}

export function createTempTree(): TempTree {
	const id = `${process.pid}-${randomBytes(4).toString('hex')}`;
	const rootDir = join(tmpdir(), `n8n-headless-${id}`);
	const userFolderPath = join(rootDir, 'user-folder');
	const dbPath = join(rootDir, 'database.sqlite');

	mkdirSync(userFolderPath, { recursive: true });

	return { rootDir, dbPath, userFolderPath };
}

export function registerCleanup(rootDir: string): () => void {
	let cleanedUp = false;

	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		try {
			rmSync(rootDir, { recursive: true, force: true });
		} catch {
			// Best-effort: errors during shutdown cleanup are intentionally swallowed
			// since there is nothing useful we can do with them.
		}
	};

	// 'exit' fires on normal termination and after explicit process.exit() calls.
	process.once('exit', cleanup);

	// Signal handlers translate the signal into a normal exit so 'exit' runs cleanup.
	// Using process.exit (not cleanup directly) lets command-level handlers registered
	// later via prependOnceListener run their orderly-shutdown logic first.
	process.once('SIGINT', () => process.exit(130));
	process.once('SIGTERM', () => process.exit(143));

	process.once('uncaughtException', (error) => {
		// eslint-disable-next-line no-console
		console.error('headless: uncaught exception', error);
		process.exit(1);
	});
	process.once('unhandledRejection', (reason) => {
		// eslint-disable-next-line no-console
		console.error('headless: unhandled rejection', reason);
		process.exit(1);
	});

	return cleanup;
}
