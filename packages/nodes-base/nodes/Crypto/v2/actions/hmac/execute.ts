import type { BinaryToTextEncoding } from 'crypto';
import { createHmac } from 'crypto';
import stream from 'stream';
import { promisify } from 'util';
import type { IExecuteFunctions } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

const pipeline = promisify(stream.pipeline);

export async function execute(this: IExecuteFunctions, index: number) {
	const type = this.getNodeParameter('type', index) as string;
	const encoding = this.getNodeParameter('encoding', index) as BinaryToTextEncoding;
	const value = this.getNodeParameter('value', index, '') as string;
	const secret = (await this.getCredentials('crypto', index)).secret as string;
	const hmac = createHmac(type, secret);

	if (this.getNodeParameter('binaryData', index)) {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index);
		const binaryData = this.helpers.assertBinaryData(index, binaryPropertyName);
		let newValue;
		if (binaryData.id) {
			const binaryStream = await this.helpers.getBinaryStream(binaryData.id);
			hmac.setEncoding(encoding);
			await pipeline(binaryStream, hmac);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			newValue = hmac.read();
		} else {
			newValue = hmac.update(Buffer.from(binaryData.data, BINARY_ENCODING)).digest(encoding);
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		return { value: newValue, binaryProcessed: true };
	} else {
		return hmac.update(value).digest(encoding);
	}
}
