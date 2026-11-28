import type { IExecutionResponse } from '@n8n/db';
import type {
	ExecutionResult,
	InstanceAiSkippedFile,
	InstanceAiStoreWorkflowFile,
} from '@n8n/instance-ai';
import type { IBinaryData } from 'n8n-workflow';

import { getExecutionRedaction } from '@/executions/execution-viewer-reader';
import { collectResultItems } from '@/workflows/callable/callable-workflow-result';

/** Most output files that one run stores, so a large batch cannot flood the conversation. */
export const MAX_RUN_OUTPUT_FILES = 10;

/** Most skipped files that one run lists. `skippedFiles.total` counts all of them. */
export const MAX_RUN_SKIPPED_FILES = 10;

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
	const files: NonNullable<ExecutionResult['files']> = [];
	const skippedFiles: InstanceAiSkippedFile[] = [];
	let skippedTotal = 0;
	const skip = (file: InstanceAiSkippedFile) => {
		skippedTotal++;
		if (skippedFiles.length < MAX_RUN_SKIPPED_FILES) skippedFiles.push(file);
	};
	const seen = new Set<IBinaryData | string>();
	for (const items of Object.values(collectResultItems(runData, false))) {
		for (const item of items) {
			for (const [key, binary] of Object.entries(item.binary ?? {})) {
				// Nodes pass the same stored binary on, so store it one time.
				const identity = binary.id ?? binary;
				if (seen.has(identity)) continue;
				seen.add(identity);
				if (files.length >= MAX_RUN_OUTPUT_FILES) {
					skip({
						fileName: binary.fileName ?? key,
						reason: `one run returns at most ${MAX_RUN_OUTPUT_FILES} files`,
					});
					continue;
				}
				const stored = await storeOutputFile(binary);
				if (!stored) continue;
				if ('reason' in stored) skip(stored);
				else files.push(stored);
			}
		}
	}
	return {
		...(files.length > 0 ? { files } : {}),
		...(skippedTotal > 0 ? { skippedFiles: { total: skippedTotal, files: skippedFiles } } : {}),
	};
}
