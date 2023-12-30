import type { BinaryToTextEncoding } from 'crypto';
import { createSign } from 'crypto';
import type { IExecuteFunctions } from 'n8n-workflow';

export async function execute(this: IExecuteFunctions, index: number) {
	const algorithm = this.getNodeParameter('algorithm', index) as string;
	const encoding = this.getNodeParameter('encoding', index) as BinaryToTextEncoding;
	const privateKey = (await this.getCredentials('crypto', index)).privateKey as string;
	const formattedKey = privateKey.replace(/\\n/g, '\n');
	const value = this.getNodeParameter('value', index, '') as string;

	const sign = createSign(algorithm);
	sign.write(value);
	sign.end();
	return sign.sign(formattedKey, encoding);
}
