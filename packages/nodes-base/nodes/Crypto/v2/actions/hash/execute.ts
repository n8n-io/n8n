import type { BinaryToTextEncoding } from 'crypto';
import { createHash } from 'crypto';
import stream from 'stream';
import { promisify } from 'util';
import type { IExecuteFunctions } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

const pipeline = promisify(stream.pipeline);

export async function execute(this: IExecuteFunctions, index: number) {
	const type = this.getNodeParameter('type', index) as string;
	const encoding = this.getNodeParameter('encoding', index) as BinaryToTextEncoding;
	const value = this.getNodeParameter('value', index, '') as string;
	const hash = createHash(type);

	if (this.getNodeParameter('binaryData', index)) {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index);
		const binaryData = this.helpers.assertBinaryData(index, binaryPropertyName);
		let newValue;
		if (binaryData.id) {
			const binaryStream = await this.helpers.getBinaryStream(binaryData.id);
			hash.setEncoding(encoding);
			await pipeline(binaryStream, hash);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			newValue = hash.read();
		} else {
			newValue = hash.update(Buffer.from(binaryData.data, BINARY_ENCODING)).digest(encoding);
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		return { value: newValue, binaryProcessed: true };
	} else {
		return hash.update(value).digest(encoding);
	}
}
