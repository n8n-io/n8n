import { type IExecuteFunctions } from 'n8n-workflow';

export async function readBinaryData(
	this: IExecuteFunctions,
	i: number,
	binaryPropertyName: string,
) {
	const bin = this.helpers.assertBinaryData(i, binaryPropertyName);
	let buffer: Buffer;
	if (bin.id) {
		const chunkSize = 256 * 1024;
		const stream = await this.helpers.getBinaryStream(bin.id, chunkSize);
		buffer = await this.helpers.binaryToBuffer(stream);
	} else {
		buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
	}
	return {
		buffer,
		binaryData: bin,
	};
}
