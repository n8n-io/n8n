import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	IExecuteFunctions,
} from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { apiRequest, downloadRecordAttachments } from '../../transport';
import { flattenOutput, processAirtableError } from '../../helpers/utils';
import type { IRecord } from '../../helpers/interfaces';

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
		placeholder: 'Add Option',
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
	// {
	// 	displayName: 'Instructions',
	// 	name: 'instructions',
	// 	type: 'string',
	// 	noDataExpression: true,
	// 	default: '',
	// 	placeholder: 'Describe how you want to transform your data and click Generate',
	// 	typeOptions: {
	// 		rows: 5,
	// 	},
	// },
	// {
	// 	displayName: 'Generate Code',
	// 	name: 'generate',
	// 	type: 'button',
	// 	default: '',
	// 	typeOptions: {
	// 		action: {
	// 			type: 'updateProperty',
	// 			handler: 'generateCodeUsingAiService',
	// 			target: 'jsCode',
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'Code',
	// 	name: 'jsCode',
	// 	type: 'string',
	// 	default: '',
	// 	hint: 'To edit this code, adjust the prompt. Or copy and paste into a code node',
	// 	typeOptions: {
	// 		rows: 5,
	// 	},
	// },
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
			if (this.continueOnFail(error)) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
