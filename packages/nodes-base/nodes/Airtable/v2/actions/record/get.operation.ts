import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	IExecuteFunctions,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import type { IRecord } from '../../helpers/interfaces';
import { flattenOutput, processAirtableError } from '../../helpers/utils';
import { apiRequest, downloadRecordAttachments } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Record ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. recf7EaZp707CEc8g',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'ID of the record to get. <a href="https://support.airtable.com/docs/record-id" target="_blank">More info</a>.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		description: 'Additional options which decide which records should be returned',
		placeholder: 'Add option',
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Download Attachments',
				name: 'downloadFields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getAttachmentColumns',
					loadOptionsDependsOn: ['base.value', 'table.value'],
				},
				default: [],
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description: "The fields of type 'attachment' that should be downloaded",
			},
		],
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

	for (let i = 0; i < items.length; i++) {
		let id;
		try {
			id = this.getNodeParameter('id', i) as string;

			const responseData = await apiRequest.call(this, 'GET', `${base}/${table}/${id}`);

			const options = this.getNodeParameter('options', 0, {});

			if (options.downloadFields) {
				const itemWithAttachments = await downloadRecordAttachments.call(
					this,
					[responseData] as IRecord[],
					options.downloadFields as string[],
				);
				returnData.push(...itemWithAttachments);
				continue;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(flattenOutput(responseData as IDataObject)),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			error = processAirtableError(error as NodeApiError, id, i);
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
