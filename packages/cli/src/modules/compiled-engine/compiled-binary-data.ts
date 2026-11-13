import type { IBinaryData, IRunExecutionData } from 'n8n-workflow';

/** The part of n8n-core's `BinaryDataService` that this module uses. */
export interface BinaryDataMover {
	rename(oldFileId: string, newFileId: string): Promise<void>;
	deleteMany(
		locations: Array<{ type: 'execution'; workflowId: string; executionId: string }>,
	): Promise<void>;
}

/**
 * The execution part of the location of the binary data of a production run while
 * it runs in `wfrt`. The fallback host writes under it (binary-store.ts of the host),
 * because n8n gives the run its execution id only when the run is saved.
 */
export function runtimeLocationId(wfrtId: string): string {
	return `wfrt-${wfrtId}`;
}

function binaryRefs(data: IRunExecutionData): IBinaryData[] {
	const refs: IBinaryData[] = [];
	for (const runs of Object.values(data.resultData.runData)) {
		for (const run of runs ?? []) {
			for (const outputs of Object.values(run.data ?? {})) {
				for (const items of outputs ?? []) {
					for (const item of items ?? []) {
						for (const binary of Object.values(item?.binary ?? {})) {
							if (binary?.id) refs.push(binary);
						}
					}
				}
			}
		}
	}
	return refs;
}

/**
 * Moves the binary data of a production run from the location of its runtime id to the
 * location of its n8n execution id, before n8n saves the run, as n8n's own
 * `restoreBinaryDataId` does for the `temp` location. Each file is renamed, and the
 * ids in the run data follow. Then n8n's hooks delete the data of a run that is not
 * saved, and n8n's pruning deletes it with the execution. Files that the run data
 * does not name are deleted.
 */
export async function moveRunBinaryData(
	mover: BinaryDataMover,
	data: IRunExecutionData,
	workflowId: string,
	wfrtId: string,
	executionId: string,
): Promise<void> {
	const from = `/executions/${runtimeLocationId(wfrtId)}/`;
	const to = `/executions/${executionId}/`;
	const renamed = new Map<string, string>();
	for (const binary of binaryRefs(data)) {
		const id = binary.id;
		if (!id) continue;
		const colon = id.indexOf(':');
		const fileId = id.slice(colon + 1);
		if (!fileId.includes(from)) continue;
		let target = renamed.get(fileId);
		if (target === undefined) {
			target = fileId.replace(from, to);
			await mover.rename(fileId, target);
			renamed.set(fileId, target);
		}
		binary.id = `${id.slice(0, colon)}:${target}`;
	}
	await mover.deleteMany([
		{ type: 'execution', workflowId, executionId: runtimeLocationId(wfrtId) },
	]);
}
