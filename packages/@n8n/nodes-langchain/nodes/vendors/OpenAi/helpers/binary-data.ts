import type { IBinaryData, IExecuteFunctions } from 'n8n-workflow';

/** Chunk size to use for streaming. 256Kb */
const CHUNK_SIZE = 256 * 1024;

/**
 * Gets the binary data file for the given item index and given property name.
 * Returns the file name, content type and the file content. Uses streaming
 * when possible.
 */
export async function getBinaryDataFile(
	ctx: IExecuteFunctions,
	itemIdx: number,
	binaryPropertyData: string | IBinaryData,
) {
	const binaryData = ctx.helpers.assertBinaryData(itemIdx, binaryPropertyData);

	const fileContent = binaryData.id
		? await ctx.helpers.getBinaryStream(binaryData.id, CHUNK_SIZE)
		: await ctx.helpers.getBinaryDataBuffer(itemIdx, binaryPropertyData);

	return {
		filename: binaryData.fileName,
		contentType: binaryData.mimeType,
		fileContent,
	};
}
