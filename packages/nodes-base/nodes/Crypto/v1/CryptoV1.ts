import type { BinaryToTextEncoding } from 'crypto';
import { createHash, createHmac, createSign, randomBytes } from 'crypto';
import stream from 'stream';
import { promisify } from 'util';
import set from 'lodash/set';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { BINARY_ENCODING, deepCopy } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { versionDescription } from './versionDescription';

const pipeline = promisify(stream.pipeline);

export class CryptoV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const action = this.getNodeParameter('action', 0) as string;

		let item: INodeExecutionData;
		for (let i = 0; i < length; i++) {
			try {
				item = items[i];
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i);
				const value = this.getNodeParameter('value', i, '') as string;
				let newValue;
				let binaryProcessed = false;

				if (action === 'generate') {
					const encodingType = this.getNodeParameter('encodingType', i);
					if (encodingType === 'uuid') {
						newValue = uuid();
					} else {
						const stringLength = this.getNodeParameter('stringLength', i) as number;
						if (encodingType === 'base64') {
							newValue = randomBytes(stringLength)
								.toString(encodingType as BufferEncoding)
								.replace(/\W/g, '')
								.slice(0, stringLength);
						} else {
							newValue = randomBytes(stringLength)
								.toString(encodingType as BufferEncoding)
								.slice(0, stringLength);
						}
					}
				}

				if (action === 'hash' || action === 'hmac') {
					const type = this.getNodeParameter('type', i) as string;
					const encoding = this.getNodeParameter('encoding', i) as BinaryToTextEncoding;
					const hashOrHmac =
						action === 'hash'
							? createHash(type)
							: createHmac(type, this.getNodeParameter('secret', i) as string);
					if (this.getNodeParameter('binaryData', i)) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						if (binaryData.id) {
							const binaryStream = await this.helpers.getBinaryStream(binaryData.id);
							hashOrHmac.setEncoding(encoding);
							await pipeline(binaryStream, hashOrHmac);
							newValue = hashOrHmac.read();
						} else {
							newValue = hashOrHmac
								.update(Buffer.from(binaryData.data, BINARY_ENCODING))
								.digest(encoding);
						}
						binaryProcessed = true;
					} else {
						newValue = hashOrHmac.update(value).digest(encoding);
					}
				}

				if (action === 'sign') {
					const algorithm = this.getNodeParameter('algorithm', i) as string;
					const encoding = this.getNodeParameter('encoding', i) as BinaryToTextEncoding;
					const privateKey = this.getNodeParameter('privateKey', i) as string;
					const sign = createSign(algorithm);
					sign.write(value);
					sign.end();
					newValue = sign.sign(privateKey, encoding);
				}

				let newItem: INodeExecutionData;
				if (dataPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: deepCopy(item.json),
						pairedItem: {
							item: i,
						},
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
						pairedItem: {
							item: i,
						},
					};
				}

				if (item.binary !== undefined && !binaryProcessed) {
					newItem.binary = item.binary;
				}

				set(newItem, `json.${dataPropertyName}`, newValue);

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as JsonObject).message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
