import Container from 'typedi';
import { BinaryDataService } from 'n8n-core';
import type { IRun } from 'n8n-workflow';
import type { BinaryData } from 'n8n-core';

/**
 * Whenever the execution ID is not available to the binary data service at the
 * time of writing a binary data file, its name is missing the execution ID.
 * This function restores the ID in the file name and run data reference.
 *
 * ```txt
 * filesystem-v2:workflows/123/executions/temp/binary_data/69055-83c4-4493-876a-9092c4708b9b ->
 * filesystem-v2:workflows/123/executions/390/binary_data/69055-83c4-4493-876a-9092c4708b9b
 *
 * s3:workflows/123/executions/temp/binary_data/69055-83c4-4493-876a-9092c4708b9b ->
 * s3:workflows/123/executions/390/binary_data/69055-83c4-4493-876a-9092c4708b9b
 * ```
 */
export async function restoreBinaryDataId(run: IRun, executionId: string) {
	const { runData } = run.data.resultData;

	const promises = Object.keys(runData).map(async (nodeName) => {
		const binaryDataId = runData[nodeName]?.[0]?.data?.main?.[0]?.[0]?.binary?.data?.id;

		if (!binaryDataId) return;

		const [mode, fileId] = binaryDataId.split(':') as [BinaryData.StoredMode, string];

		const isMissingExecutionId = fileId.includes('/temp/');

		if (!isMissingExecutionId) return;

		const correctFileId = fileId.replace('temp', executionId);

		await Container.get(BinaryDataService).rename(fileId, correctFileId);

		const correctBinaryDataId = `${mode}:${correctFileId}`;

		// @ts-expect-error Validated at the top
		run.data.resultData.runData[nodeName][0].data.main[0][0].binary.data.id = correctBinaryDataId;
	});

	await Promise.all(promises);
}
