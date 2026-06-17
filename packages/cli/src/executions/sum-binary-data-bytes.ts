import type {
	IBinaryData,
	IBinaryKeyData,
	IRunExecutionData,
	ITaskDataConnections,
} from 'n8n-workflow';
import { BINARY_IN_JSON_PROPERTY } from 'n8n-workflow';

/** Yield every binary reference carried by a set of task-data connections, including binary
 * embedded in an item's json under {@link BINARY_IN_JSON_PROPERTY}. */
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
 * Yield every binary reference an execution holds, across every place run data can carry it:
 * each node run's output and `inputOverride`, plus the in-flight `nodeExecutionStack` and
 * `waitingExecution` (a paused execution keeps its binary only there, not yet in `runData`).
 *
 * `data` can be `undefined` at runtime even though the type says otherwise — callers force it with
 * `!` (e.g. `active-executions.ts`), so we guard. The param keeps its non-undefined type on purpose:
 * widening it to `| undefined` tips a borderline TypeORM type elsewhere over TS's
 * instantiation-depth limit (TS2589).
 */
function* iterateBinary(data: IRunExecutionData): Iterable<IBinaryData> {
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
 * Sum the byte size of the binary data an execution offloaded to separate storage (db/fs/S3),
 * to measure how much binary data it holds outside the JSON bundle.
 *
 * Only binary with an `id` is counted — that id is the handle to a separately stored blob. Inline
 * binary (the legacy in-memory mode kept the bytes in the run data itself) has no id and is already
 * measured by `jsonSizeBytes`, so excluding it here keeps the two columns additive instead of
 * double-counting. Each unique blob is counted once (deduped by id); a reference missing `bytes`
 * contributes `0`, matching the "0 means unknown" semantics of `jsonSizeBytes`.
 */
export function sumBinaryDataBytes(data: IRunExecutionData): number {
	const bytesByBlobId = new Map<string, number>();
	for (const binary of iterateBinary(data)) {
		if (binary?.id) bytesByBlobId.set(binary.id, binary.bytes ?? 0);
	}

	let total = 0;
	for (const bytes of bytesByBlobId.values()) total += bytes;
	return total;
}
