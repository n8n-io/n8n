import { randomBytes } from 'crypto';
import type { IExecuteFunctions } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

export async function execute(this: IExecuteFunctions, index: number) {
	const encodingType = this.getNodeParameter('encodingType', index);
	if (encodingType === 'uuid') {
		return { value: uuid() };
	} else {
		const stringLength = this.getNodeParameter('stringLength', index) as number;
		if (encodingType === 'base64') {
			return randomBytes(stringLength)
				.toString(encodingType as BufferEncoding)
				.replace(/\W/g, '')
				.slice(0, stringLength);
		} else {
			return randomBytes(stringLength)
				.toString(encodingType as BufferEncoding)
				.slice(0, stringLength);
		}
	}
}
