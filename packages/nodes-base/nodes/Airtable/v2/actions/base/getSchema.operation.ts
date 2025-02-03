import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
	NodeApiError,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { processAirtableError } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { baseRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...baseRLC,
		description: 'The Airtable Base to retrieve the schema from',
	},
];

const displayOptions = {
	show: {
		resource: ['base'],
		operation: ['getSchema'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const baseId = this.getNodeParameter('base', 0, undefined, {
				extractValue: true,
			}) as string;

			const responseData = await apiRequest.call(this, 'GET', `meta/bases/${baseId}/tables`);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData.tables as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			error = processAirtableError(error as NodeApiError, undefined, i);
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
