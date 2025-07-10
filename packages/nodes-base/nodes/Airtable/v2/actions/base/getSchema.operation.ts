import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { processAirtableError } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { baseRLC } from '../common.descriptions';
import type { TablesResponse } from '../types';

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
	let returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const baseId = this.getNodeParameter('base', i, undefined, {
				extractValue: true,
			}) as string;

			const responseData: TablesResponse = await apiRequest.call(
				this,
				'GET',
				`meta/bases/${baseId}/tables`,
			);

			const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData.tables), {
				itemData: { item: i },
			});

			returnData = returnData.concat(executionData);
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
