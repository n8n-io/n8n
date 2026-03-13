import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { BinaryData } from 'n8n-core';
import { BinaryDataConfig, BinaryDataService } from 'n8n-core';
import type { IRun, WorkflowExecuteMode } from 'n8n-workflow';

/**
 * Whenever the execution ID is not available to the binary data service at the
 * time of writing a binary data file, its name is missing the execution ID.
 * This function restores the ID in the file name and run data reference.
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
 * ```
 */
export async function restoreBinaryDataId(
	run: IRun,
	executionId: string,
	workflowExecutionMode: WorkflowExecuteMode,
) {
	if (workflowExecutionMode !== 'webhook' || Container.get(BinaryDataConfig).mode === 'default') {
		return;
	}

	try {
		const { runData } = run.data.resultData;

		// Collect all binary data references that need renaming, grouped by
		// fileId so each unique file is only renamed once.  When binary data
		// flows through multiple nodes they all share the same underlying file,
		// so renaming more than once causes ENOENT on the second attempt.
		const renameTasks = new Map<
			string,
			{ mode: BinaryData.StoredMode; correctFileId: string; nodeNames: string[] }
		>();

		for (const nodeName of Object.keys(runData)) {
			const binaryDataId = runData[nodeName]?.[0]?.data?.main?.[0]?.[0]?.binary?.data?.id;

			if (!binaryDataId) continue;

			const [mode, fileId] = binaryDataId.split(':') as [BinaryData.StoredMode, string];

			if (!fileId.includes('/temp/')) continue;

			const existing = renameTasks.get(fileId);
			if (existing) {
				existing.nodeNames.push(nodeName);
			} else {
				renameTasks.set(fileId, {
					mode,
					correctFileId: fileId.replace('temp', executionId),
					nodeNames: [nodeName],
				});
			}
		}

		const promises = [...renameTasks.entries()].map(
			async ([fileId, { mode, correctFileId, nodeNames }]) => {
				await Container.get(BinaryDataService).rename(fileId, correctFileId);

				const correctBinaryDataId = `${mode}:${correctFileId}`;

				for (const nodeName of nodeNames) {
					// @ts-expect-error Validated at the top
					run.data.resultData.runData[nodeName][0].data.main[0][0].binary.data.id =
						correctBinaryDataId;
				}
			},
		);

		await Promise.all(promises);
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
