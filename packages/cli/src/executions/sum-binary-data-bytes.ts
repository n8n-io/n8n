import type { IRunExecutionData } from 'n8n-workflow';

/**
 * Sum the byte size of the binary data an execution offloaded to a separate store (filesystem/S3),
 * to measure how much binary data it holds outside the JSON bundle.
 *
 * Only binary with an `id` is counted — that id is the handle to a separately stored blob. Inline
 * binary (the `default` storage mode keeps the bytes in the run data itself) has no id and is
 * already measured by `jsonSizeBytes`, so excluding it here keeps the two columns additive instead
 * of double-counting. Each unique blob is counted once (deduped by id); a reference missing `bytes`
 * contributes `0`, matching the "0 means unknown" semantics of `jsonSizeBytes`.
 */
export function sumBinaryDataBytes(data: IRunExecutionData): number {
	const seen = new Set<string>();
	let total = 0;

	for (const nodeRuns of Object.values(data?.resultData?.runData ?? {})) {
		for (const nodeRun of nodeRuns ?? []) {
			for (const connection of Object.values(nodeRun.data ?? {})) {
				for (const items of connection ?? []) {
					for (const item of items ?? []) {
						for (const binary of Object.values(item?.binary ?? {})) {
							if (!binary?.id || seen.has(binary.id)) continue;
							seen.add(binary.id);
							total += binary.bytes ?? 0;
						}
					}
				}
			}
		}
	}

	return total;
}
