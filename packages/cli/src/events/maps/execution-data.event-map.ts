import type { ExecutionDataStorageLocation } from '@n8n/db';

/**
 * A "read" spans fetching the bundle from its store AND deserializing it into usable data, so a
 * deserialization failure counts as a failed read and its duration includes deserialize time.
 * A "write" is symmetric: it spans serializing the data AND writing it to its store.
 *
 * `unreadableBundles` counts bundles that were missing (the store had none) or corrupt (fetched
 * but failed to deserialize) — the data-loss signal. It excludes infrastructure failures (e.g. the
 * store being unreachable), where the bundles' integrity is unknown; those are failed reads with
 * `unreadableBundles: 0`.
 */
export type ExecutionDataEventMap = {
	'execution-data-read': {
		mode: ExecutionDataStorageLocation;
		durationMs: number;
		success: boolean;
		unreadableBundles: number;
	};
	'execution-data-write': {
		mode: ExecutionDataStorageLocation;
		durationMs: number;
		success: boolean;
		jsonSizeBytes: number;
	};
};
