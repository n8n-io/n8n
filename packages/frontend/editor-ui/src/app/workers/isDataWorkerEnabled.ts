import { LOCAL_STORAGE_DATA_WORKER } from '@/app/constants/localStorage';

/**
 * Whether the local SQLite data worker is enabled. Gates both populating the
 * local DB (init) and reading node types from it (nodeTypes store).
 *
 * Kept out of `./index` so callers can check the flag without importing that
 * module, which eagerly spawns the SharedWorker/Worker on load.
 */
export function isDataWorkerEnabled(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.localStorage.getItem(LOCAL_STORAGE_DATA_WORKER) === 'true'
	);
}
