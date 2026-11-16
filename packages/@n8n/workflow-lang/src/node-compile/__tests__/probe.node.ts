import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export class Probe implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Probe',
		name: 'probe',
		group: ['transform'],
		version: 1,
		description: 'A node for the checks of the error settings',
		defaults: { name: 'Probe' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{ displayName: 'Id', name: 'id', type: 'string', default: '' },
			{ displayName: 'Strict', name: 'strict', type: 'boolean', default: false },
			{ displayName: 'Pair Error Items', name: 'pairErrors', type: 'boolean', default: true },
			{ displayName: 'Twice', name: 'twice', type: 'boolean', default: false },
			{ displayName: 'Whole', name: 'whole', type: 'boolean', default: false },
			{ displayName: 'Pairs', name: 'pairs', type: 'string', default: 'object' },
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			const strict = this.getNodeParameter('strict', i) as boolean;
			if (strict) throw new NodeOperationError(this.getNode(), 'The strict setting stops the node');
			try {
				const id = this.getNodeParameter('id', i) as string;
				let response;
				try {
					response = await this.helpers.httpRequest({
						method: 'GET',
						url: 'https://api.example.test/things/' + id,
						json: true,
					});
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
				returnData.push({ json: response, pairedItem: { item: i } });
				const twice = this.getNodeParameter('twice', i) as boolean;
				if (twice) returnData.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					const failure = error as NodeApiError;
					const whole = this.getNodeParameter('whole', 0) as boolean;
					if (whole) return [[{ json: this.getInputData(0)[0].json, error: failure }]];
					const pairErrors = this.getNodeParameter('pairErrors', i) as boolean;
					const pairs = this.getNodeParameter('pairs', 0) as string;
					const json = { error: failure.message, message: failure.description };
					if (pairs === 'number') returnData.push({ json, pairedItem: i });
					else if (pairs === 'list') returnData.push({ json, pairedItem: [{ item: i }] });
					else if (pairs === 'last')
						returnData.push({ json, pairedItem: { item: items.length - 1 } });
					else if (pairs === 'outside') returnData.push({ json, pairedItem: { item: 7 } });
					else if (pairErrors) {
						returnData.push({
							json: { error: failure.message, message: failure.description },
							pairedItem: { item: i },
						});
					} else {
						returnData.push({ json: { error: failure.message, message: failure.description } });
					}
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
