import type { IExecutionResponse } from '@n8n/db';
import type {
	ExecutionResult,
	InstanceAiSkippedFile,
	InstanceAiSkippedFiles,
	InstanceAiStoreWorkflowFile,
	InstanceAiStoredWorkflowFile,
} from '@n8n/instance-ai';
import type { IBinaryData, IBinaryKeyData } from 'n8n-workflow';

import { getExecutionRedaction } from '@/executions/execution-viewer-reader';
import { collectResultItems } from '@/workflows/callable/callable-workflow-result';

/** Most output files that one run stores, so a large batch cannot flood the conversation. */
export const MAX_RUN_OUTPUT_FILES = 10;

/** Most skipped files that one result lists. `skippedFiles.total` counts all of them. */
export const MAX_RUN_SKIPPED_FILES = 10;

/**
 * Each binary of the items one time, with its key. Nodes pass the same stored
 * binary on, so several items can carry one binary.
 */
function* uniqueBinaries(
	items: Iterable<{ binary?: IBinaryKeyData }>,
): Generator<[key: string, binary: IBinaryData]> {
	const seen = new Set<IBinaryData | string>();
	for (const item of items) {
		for (const [key, binary] of Object.entries(item.binary ?? {})) {
			const identity = binary.id ?? binary;
			if (seen.has(identity)) continue;
			seen.add(identity);
			yield [key, binary];
		}
	}
}

/** The number of files of the items, each binary one time, as `storeItemFiles` stores them. */
export function countItemFiles(items: Iterable<{ binary?: IBinaryKeyData }>): number {
	let count = 0;
	for (const _ of uniqueBinaries(items)) count++;
	return count;
}

export interface StoreItemFilesOptions {
	/**
	 * The binary ids of the inputs of the run. A binary with one of them is looked
	 * up even when the cap is full, because it can give its conversation file
	 * instead of a new file.
	 */
	inputBinaryIds?: readonly string[];
	/**
	 * List a conversation file that the run passed on unchanged, marked
	 * `passedOn`. By default `files` lists only new files, as with project agents.
	 */
	listPassedOn?: boolean;
	/** Called with each binary that has a conversation file, including a file passed on. */
	onStored?: (binary: IBinaryData, fileId: string) => void;
}

/**
 * Store the files of some execution items as conversation files, one time for
 * each binary and at most `MAX_RUN_OUTPUT_FILES` new files. A conversation file
 * that the run passed on is not a new file, so it does not count against the
 * cap. `limitReason` is the reason of a file over that cap.
 */
export async function storeItemFiles(
	items: Iterable<{ binary?: IBinaryKeyData }>,
	storeFile: InstanceAiStoreWorkflowFile,
	limitReason: string,
	options: StoreItemFilesOptions = {},
): Promise<{ files?: InstanceAiStoredWorkflowFile[]; skippedFiles?: InstanceAiSkippedFiles }> {
	const inputBinaryIds = new Set(options.inputBinaryIds);
	const files: InstanceAiStoredWorkflowFile[] = [];
	let newFiles = 0;
	const skippedFiles: InstanceAiSkippedFile[] = [];
	let skippedTotal = 0;
	const skip = (file: InstanceAiSkippedFile) => {
		skippedTotal++;
		if (skippedFiles.length < MAX_RUN_SKIPPED_FILES) skippedFiles.push(file);
	};
	for (const [key, binary] of uniqueBinaries(items)) {
		const atCap = newFiles >= MAX_RUN_OUTPUT_FILES;
		if (atCap && !(binary.id && inputBinaryIds.has(binary.id))) {
			skip({ fileName: binary.fileName ?? key, reason: limitReason });
			continue;
		}
		const stored = await storeFile(binary);
		if (!stored) continue;
		if ('reason' in stored) {
			skip(stored);
			continue;
		}
		if (atCap && !stored.passedOn) {
			skip({ fileName: binary.fileName ?? key, reason: limitReason });
			continue;
		}
		options.onStored?.(binary, stored.fileId);
		if (!stored.passedOn) {
			newFiles++;
			files.push(stored);
		} else if (options.listPassedOn) {
			files.push(stored);
		}
	}
	return {
		...(files.length > 0 ? { files } : {}),
		...(skippedTotal > 0 ? { skippedFiles: { total: skippedTotal, files: skippedFiles } } : {}),
	};
}

/**
 * Store each file that the last node of a run returned as a conversation file,
 * one time for each binary, as the workflow tools of project agents do. A
 * redacted execution stores nothing, because its data is hidden from the user.
 */
export async function storeRunOutputFiles(
	execution: IExecutionResponse,
	storeOutputFile: InstanceAiStoreWorkflowFile,
	inputs: Pick<StoreItemFilesOptions, 'inputBinaryIds'> = {},
): Promise<Pick<ExecutionResult, 'files' | 'skippedFiles'>> {
	const runData = execution.data?.resultData?.runData;
	if (!runData || getExecutionRedaction(execution)) return {};
	const items = Object.values(collectResultItems(runData, false)).flat();
	return await storeItemFiles(
		items,
		storeOutputFile,
		`one run returns at most ${MAX_RUN_OUTPUT_FILES} files`,
		inputs,
	);
}

/** The stored binary ids of the items, for `StoreItemFilesOptions.inputBinaryIds`. */
export function binaryIdsOf(items: Iterable<{ binary?: IBinaryKeyData }>): string[] {
	const ids: string[] = [];
	for (const [, binary] of uniqueBinaries(items)) if (binary.id) ids.push(binary.id);
	return ids;
}
