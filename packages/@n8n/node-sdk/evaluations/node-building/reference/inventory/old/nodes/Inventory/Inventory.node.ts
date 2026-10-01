import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

const BASE_URL = 'http://127.0.0.1:18090/inventory/v1';

const forKind = (kind: string) => ({
	show: { resource: ['item'], operation: ['create'], kind: [kind] },
});

const numberField = (displayName: string, name: string): INodeProperties => ({
	displayName,
	name,
	type: 'number',
	default: 0,
	displayOptions: forKind('physical'),
});

interface FieldError {
	field: string;
	message: string;
}

const isFieldError = (value: unknown): value is FieldError =>
	typeof value === 'object' &&
	value !== null &&
	'field' in value &&
	'message' in value &&
	typeof value.field === 'string' &&
	typeof value.message === 'string';

export class Inventory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Inventory',
		name: 'inventory',
		icon: 'file:inventory.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create inventory items',
		defaults: { name: 'Inventory' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'inventoryApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Item', value: 'item' }],
				default: 'item',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['item'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create an item',
						description: 'Create an item',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Kind',
				name: 'kind',
				type: 'options',
				displayOptions: { show: { resource: ['item'], operation: ['create'] } },
				options: [
					{ name: 'Digital', value: 'digital' },
					{ name: 'Physical', value: 'physical' },
				],
				default: 'physical',
			},
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['item'], operation: ['create'] } },
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['item'], operation: ['create'] } },
				default: '',
			},
			numberField('Weight (Grams)', 'weightGrams'),
			numberField('Length (Cm)', 'lengthCm'),
			numberField('Width (Cm)', 'widthCm'),
			numberField('Height (Cm)', 'heightCm'),
			{
				displayName: 'Download URL',
				name: 'downloadUrl',
				type: 'string',
				displayOptions: forKind('digital'),
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		for (const itemIndex of this.getInputData().keys()) {
			const parameter = (name: string) => this.getNodeParameter(name, itemIndex);
			try {
				const kind = String(parameter('kind'));
				const base = { kind, sku: String(parameter('sku')), name: String(parameter('name')) };
				const body: IDataObject =
					kind === 'physical'
						? {
								...base,
								weight: { value: parameter('weightGrams'), unit: 'g' },
								dimensions: {
									length: parameter('lengthCm'),
									width: parameter('widthCm'),
									height: parameter('heightCm'),
									unit: 'cm',
								},
							}
						: { ...base, downloadUrl: parameter('downloadUrl') };
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'inventoryApi',
					{
						method: 'POST',
						url: `${BASE_URL}/items`,
						body,
						json: true,
						returnFullResponse: true,
						ignoreHttpStatusErrors: true,
					},
				);
				const { statusCode } = response;
				const responseBody: IDataObject = response.body;
				if (statusCode === 422) {
					const errors: unknown[] = Array.isArray(responseBody.errors) ? responseBody.errors : [];
					const fields = errors
						.filter(isFieldError)
						.map(({ field, message }) => `${field}: ${message}`);
					throw new NodeApiError(this.getNode(), responseBody as JsonObject, {
						message: `Invalid item: ${fields.join('; ')}`,
						httpCode: '422',
						itemIndex,
					});
				}
				if (statusCode >= 400) {
					throw new NodeApiError(this.getNode(), responseBody as JsonObject, {
						httpCode: String(statusCode),
						itemIndex,
					});
				}
				returnData.push({ json: responseBody, pairedItem: itemIndex });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: itemIndex });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}
		return [returnData];
	}
}
