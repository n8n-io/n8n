import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the record to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['deleteRecord'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	base: string,
	table: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const body: IDataObject = {};
	const qs: IDataObject = {};

	const endpoint = `${base}/${table}`;

	const rows: string[] = [];
	const options = this.getNodeParameter('options', 0, {});
	const bulkSize = (options.bulkSize as number) || 10;

	for (let i = 0; i < items.length; i++) {
		try {
			const id = this.getNodeParameter('id', i) as string;

			rows.push(id);

			if (rows.length === bulkSize || i === items.length - 1) {
				// Make one request after another. This is slower but makes
				// sure that we do not run into the rate limit they have in
				// place and so block for 30 seconds. Later some global
				// functionality in core should make it easy to make requests
				// according to specific rules like not more than 5 requests
				// per seconds.
				qs.records = rows;

				const responseData = await apiRequest.call(this, 'DELETE', endpoint, body, qs);

				const executionData = this.helpers.constructExecutionMetaData(
					wrapData(responseData.records as IDataObject[]),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
				// empty rows
				rows.length = 0;
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
