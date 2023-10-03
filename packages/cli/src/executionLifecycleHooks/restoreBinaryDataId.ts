import Container from 'typedi';
import { BinaryDataService } from 'n8n-core';
import type { IRun } from 'n8n-workflow';

export function isMissingExecutionId(binaryDataId: string) {
	const UUID_CHAR_LENGTH = 36;

	return [UUID_CHAR_LENGTH + 'filesystem:'.length, UUID_CHAR_LENGTH + 's3:'.length].some(
		(incorrectLength) => binaryDataId.length === incorrectLength,
	);
}

/**
 * Whenever the execution ID is not available to the binary data service at the
 * time of writing a binary data file, its name is missing the execution ID.
 *
 * This function restores the ID in the file name and run data reference.
 *
 * ```txt
 * filesystem:11869055-83c4-4493-876a-9092c4708b9b ->
 * filesystem:39011869055-83c4-4493-876a-9092c4708b9b
 * ```
 */
export async function restoreBinaryDataId(run: IRun, executionId: string) {
	const { runData } = run.data.resultData;

	const promises = Object.keys(runData).map(async (nodeName) => {
		const binaryDataId = runData[nodeName]?.[0]?.data?.main?.[0]?.[0]?.binary?.data.id;

		if (!binaryDataId || !isMissingExecutionId(binaryDataId)) return;

		const [mode, incorrectFileId] = binaryDataId.split(':');
		const correctFileId = `${executionId}${incorrectFileId}`;
		const correctBinaryDataId = `${mode}:${correctFileId}`;

		await Container.get(BinaryDataService).rename(incorrectFileId, correctFileId);

		// @ts-expect-error Validated at the top
		run.data.resultData.runData[nodeName][0].data.main[0][0].binary.data.id = correctBinaryDataId;
	});

	await Promise.all(promises);
}
