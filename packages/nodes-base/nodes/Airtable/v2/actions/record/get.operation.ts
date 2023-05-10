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
		description: 'ID of the record to return',
	},
];

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['get'],
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

	let id: string;
	for (let i = 0; i < items.length; i++) {
		id = this.getNodeParameter('id', i) as string;

		const endpoint = `${base}/${table}/${id}`;

		// Make one request after another. This is slower but makes
		// sure that we do not run into the rate limit they have in
		// place and so block for 30 seconds. Later some global
		// functionality in core should make it easy to make requests
		// according to specific rules like not more than 5 requests
		// per seconds.
		try {
			const responseData = await apiRequest.call(this, 'GET', endpoint, body, qs);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
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
