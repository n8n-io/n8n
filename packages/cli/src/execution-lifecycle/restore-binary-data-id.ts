import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { BinaryData } from 'n8n-core';
import { BinaryDataConfig, BinaryDataService, TEMP_EXECUTION_ID } from 'n8n-core';
import type { IRun, WorkflowExecuteMode } from 'n8n-workflow';

/**
 * Whenever the execution ID is not available to the binary data service at the
 * time of writing a binary data file, its name is missing the execution ID.
 * This function restores the ID in the file name and run data reference.
 *
 * This can happen for:
 * - A Webhook node that accepts binary data
 * - A ChatHub workflow with file attachments
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
	if (
		(workflowExecutionMode !== 'webhook' && workflowExecutionMode !== 'chat') ||
		Container.get(BinaryDataConfig).mode === 'default'
	) {
		return;
	}

	try {
		const { runData } = run.data.resultData;

		const entries = Object.keys(runData).flatMap((nodeName) =>
			Object.values(runData[nodeName]?.[0]?.data?.main?.[0]?.[0]?.binary ?? {}),
		);

		// Track renamed files to avoid duplicate rename attempts when the same binary data
		// appears in multiple nodes (e.g., trigger node and subsequent nodes that pass it through)
		const renamedFiles = new Set<string>();

		const promises = entries.map(async (entry) => {
			const binaryDataId = entry.id;

			if (!binaryDataId) return;

			const result = replaceTempExecutionId(executionId, binaryDataId);

			if (!result) {
				return;
			}

			if (!renamedFiles.has(binaryDataId)) {
				renamedFiles.add(binaryDataId);

				await Container.get(BinaryDataService).rename(result.originalFileId, result.resolvedFileId);
			}

			entry.id = result.resolvedId;
		});

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

export function replaceTempExecutionId(
	executionId: string,
	originalId: string,
): { resolvedId: string; resolvedFileId: string; originalFileId: string } | undefined {
	const [mode, fileId] = originalId.split(':') as [BinaryData.StoredMode, string];
	const isMissingExecutionId = fileId.includes(`/${TEMP_EXECUTION_ID}/`);

	if (!isMissingExecutionId) {
		return undefined;
	}

	const resolvedFileId = fileId.replace(TEMP_EXECUTION_ID, executionId);

	return {
		originalFileId: fileId,
		resolvedFileId,
		resolvedId: `${mode}:${resolvedFileId}`,
	};
}
