import set from 'lodash/set';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { versionDescription } from './versionDescription';

import { execute as generateExecute } from './actions/generate/execute';
import { execute as hashExecute } from './actions/hash/execute';
import { execute as hmacExecute } from './actions/hmac/execute';
import { execute as signExecute } from './actions/sign/execute';

export class CryptoV2 implements INodeType {
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
		type ActionType = 'hash' | 'generate' | 'hmac' | 'sign';

		const actionExecutors: Record<
			ActionType,
			(
				this: IExecuteFunctions,
				index: number,
			) => Promise<string | { value: string; binaryProcessed?: boolean }>
		> = {
			hash: hashExecute,
			generate: generateExecute,
			hmac: hmacExecute,
			sign: signExecute,
		};

		let item: INodeExecutionData;
		for (let i = 0; i < length; i++) {
			try {
				item = items[i];
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i);

				const result = await actionExecutors[action as ActionType].call(this, i);
				const { value, binaryProcessed } =
					typeof result === 'string' ? { value: result, binaryProcessed: false } : result;

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

				set(newItem, `json.${dataPropertyName}`, value);

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
