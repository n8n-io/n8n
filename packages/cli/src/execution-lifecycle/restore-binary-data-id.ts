import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { BinaryData } from 'n8n-core';
import { BinaryDataConfig, BinaryDataService, TEMP_EXECUTION_ID } from 'n8n-core';
import type { IBinaryData, IRun, WorkflowExecuteMode } from 'n8n-workflow';

/**
 * Whenever the execution ID is not available to the binary data service at the
 * time of writing a binary data file, its name is missing the execution ID.
 * This function moves the file under the execution. For blob storage, this also
 * restores the ID in the file name and run data reference. Database IDs remain
 * unchanged because ownership is stored separately from the file ID.
 *
 * This edge case can happen only for a Webhook node that accepts binary data,
 * when the binary data manager is set to persist this binary data.
 *
 * ```txt
 * filesystem-v2:workflows/123/executions/temp/binary_data/69055-83c4-4493-876a-9092c4708b9b ->
 * filesystem-v2:workflows/123/executions/390/binary_data/69055-83c4-4493-876a-9092c4708b9b
 *
 * s3:workflows/123/executions/temp/binary_data/69055-83c4-4493-876a-9092c4708b9b ->
 * s3:workflows/123/executions/390/binary_data/69055-83c4-4493-876a-9092c4708b9b
 *
 * database:69055-83c4-4493-876a-9092c4708b9b keeps its ID while its source ID
 * changes from `temp` to `390`.
 * ```
 */
type RestoreEntry = {
	binaryDataRefs: IBinaryData[];
	mode: BinaryData.StoredMode;
	fileId: string;
};

function collectRestoreEntries(run: IRun): RestoreEntry[] {
	const entriesByFileId = new Map<string, RestoreEntry>();

	for (const nodeRuns of Object.values(run.data.resultData.runData)) {
		for (const nodeRun of nodeRuns ?? []) {
			for (const outputs of nodeRun.data?.main ?? []) {
				for (const item of outputs ?? []) {
					for (const binaryData of Object.values(item?.binary ?? {})) {
						const binaryDataId = binaryData?.id;
						if (!binaryDataId) continue;

						const [mode, fileId] = binaryDataId.split(':') as [BinaryData.StoredMode, string];
						if (mode !== 'database' && !fileId.includes(`/${TEMP_EXECUTION_ID}/`)) continue;

						const existing = entriesByFileId.get(fileId);
						if (existing) {
							existing.binaryDataRefs.push(binaryData);
						} else {
							entriesByFileId.set(fileId, {
								binaryDataRefs: [binaryData],
								mode,
								fileId,
							});
						}
					}
				}
			}
		}
	}

	return [...entriesByFileId.values()];
}

export async function restoreBinaryDataId(
	run: IRun,
	executionId: string,
	workflowExecutionMode: WorkflowExecuteMode,
) {
	if (workflowExecutionMode !== 'webhook' || Container.get(BinaryDataConfig).mode === 'default') {
		return;
	}

	try {
		const entries = collectRestoreEntries(run);

		await Promise.all(
			entries.map(async (entry) => {
				const claimedFileId = await Container.get(BinaryDataService).claimForExecution(
					entry.fileId,
					executionId,
				);

				for (const binaryData of entry.binaryDataRefs) {
					binaryData.id = `${entry.mode}:${claimedFileId}`;
				}
			}),
		);
	} catch (e) {
		const error = e instanceof Error ? e : new Error(`${e}`);
		const logger = Container.get(Logger);

		if (typeof error.message === 'string' && error.message.includes('ENOENT')) {
			logger.warn('Failed to restore binary data ID - No such file or dir', {
				executionId,
				error,
			});
			return;
		}

		logger.error('Failed to restore binary data ID - Unknown error', { executionId, error });
	}
}
