import type { IExecutionResponse } from '@n8n/db';
import type {
	ExecutionResult,
	InstanceAiConversationFile,
	InstanceAiSkippedFile,
	InstanceAiSkippedFiles,
	InstanceAiStoreWorkflowFile,
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

/**
 * Store the files of some execution items as conversation files, one time for
 * each binary and at most `MAX_RUN_OUTPUT_FILES` of them. `limitReason` is the
 * reason of a file over that cap.
 */
export async function storeItemFiles(
	items: Iterable<{ binary?: IBinaryKeyData }>,
	storeFile: InstanceAiStoreWorkflowFile,
	limitReason: string,
): Promise<{ files?: InstanceAiConversationFile[]; skippedFiles?: InstanceAiSkippedFiles }> {
	const files: InstanceAiConversationFile[] = [];
	const skippedFiles: InstanceAiSkippedFile[] = [];
	let skippedTotal = 0;
	const skip = (file: InstanceAiSkippedFile) => {
		skippedTotal++;
		if (skippedFiles.length < MAX_RUN_SKIPPED_FILES) skippedFiles.push(file);
	};
	for (const [key, binary] of uniqueBinaries(items)) {
		if (files.length >= MAX_RUN_OUTPUT_FILES) {
			skip({ fileName: binary.fileName ?? key, reason: limitReason });
			continue;
		}
		const stored = await storeFile(binary);
		if (!stored) continue;
		if ('reason' in stored) skip(stored);
		else files.push(stored);
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
): Promise<Pick<ExecutionResult, 'files' | 'skippedFiles'>> {
	const runData = execution.data?.resultData?.runData;
	if (!runData || getExecutionRedaction(execution)) return {};
	const items = Object.values(collectResultItems(runData, false)).flat();
	return await storeItemFiles(
		items,
		storeOutputFile,
		`one run returns at most ${MAX_RUN_OUTPUT_FILES} files`,
	);
}
