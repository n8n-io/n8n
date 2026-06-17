import type {
	IBinaryData,
	IBinaryKeyData,
	IRunExecutionData,
	ITaskDataConnections,
} from 'n8n-workflow';
import { BINARY_IN_JSON_PROPERTY } from 'n8n-workflow';

/**
 * Yield every binary ref in a set of connections, including binary nested in json under
 * {@link BINARY_IN_JSON_PROPERTY}.
 */
function* iterateConnectionsBinary(
	connections: ITaskDataConnections | undefined,
): Iterable<IBinaryData> {
	for (const outputs of Object.values(connections ?? {})) {
		for (const items of outputs ?? []) {
			for (const item of items ?? []) {
				yield* Object.values(item?.binary ?? {});

				const jsonBinary = item?.json?.[BINARY_IN_JSON_PROPERTY];
				if (jsonBinary && typeof jsonBinary === 'object') {
					yield* Object.values(jsonBinary as IBinaryKeyData);
				}
			}
		}
	}
}

/**
 * Yield every binary ref an execution holds: each node run's `data` and `inputOverride`, plus the
 * in-flight `nodeExecutionStack` and `waitingExecution` (a paused execution holds binary only there,
 * not yet in `runData`).
 *
 * `data` can be `undefined` at runtime (and in integration tests), so it's guarded throughout.
 */
function* iterateBinary(data: IRunExecutionData | undefined): Iterable<IBinaryData> {
	for (const nodeRuns of Object.values(data?.resultData.runData ?? {})) {
		for (const nodeRun of nodeRuns ?? []) {
			yield* iterateConnectionsBinary(nodeRun?.data);
			yield* iterateConnectionsBinary(nodeRun?.inputOverride);
		}
	}

	const executionData = data?.executionData;
	for (const executeData of executionData?.nodeExecutionStack ?? []) {
		yield* iterateConnectionsBinary(executeData?.data);
	}
	for (const runs of Object.values(executionData?.waitingExecution ?? {})) {
		for (const connections of Object.values(runs ?? {})) {
			yield* iterateConnectionsBinary(connections);
		}
	}
}

/**
 * Sum the bytes of binary an execution offloaded to separate storage (db/fs/S3) — the binary it
 * holds outside the JSON bundle.
 *
 * Counts only binary with an `id` (the handle to a stored blob), deduped so each blob counts once.
 * Inline binary has no id and is already in `jsonSizeBytes`, so skipping it keeps the two columns
 * additive. Missing `bytes` counts as `0`, matching `jsonSizeBytes`' "0 means unknown".
 */
export function sumBinaryDataBytes(data: IRunExecutionData | undefined): number {
	const bytesByBlobId = new Map<string, number>();
	for (const binary of iterateBinary(data)) {
		if (binary?.id) bytesByBlobId.set(binary.id, binary.bytes ?? 0);
	}

	let total = 0;
	for (const bytes of bytesByBlobId.values()) total += bytes;
	return total;
}
