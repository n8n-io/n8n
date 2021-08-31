import {
	IPollFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiRequestAllItems,
	downloadRecordAttachments,
} from './GenericFunctions';

import * as moment from 'moment';

export class AirtableTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Airtable Trigger',
		name: 'airtableTrigger',
		icon: 'file:airtable.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Airtable events occur',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'Airtable Trigger',
			color: '#445599',
		},
		credentials: [
			{
				name: 'airtableApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Base ID',
				name: 'baseId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of this base.',
			},
			{
				displayName: 'Table',
				name: 'tableId',
				type: 'string',
				default: '',
				description: 'The name of table to access.',
				required: true,
			},
			{
				displayName: 'Trigger Field',
				name: 'triggerField',
				type: 'string',
				default: '',
				description: `A Created Time or Last Modified Time field that will be used to sort records. <br>
				If you do not have a Created Time or Last Modified Time field in your schema, please create one,<br>
				because without this field trigger will not work correctly.`,
				required: true,
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				default: false,
				description: `When set to true the attachment fields define in 'Download Fields' will be downloaded.`,
			},
			{
				displayName: 'Download Fields',
				name: 'downloadFieldNames',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						downloadAttachments: [
							true,
						],
					},
				},
				default: '',
				description: `Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.`,
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						default: '',
						description: `Fields to be included in the response.<br>
						Multiple ones can be set separated by comma. Example: name,id.<br>
						By default just the trigger field will be included.`,
					},
					{
						displayName: 'Formula',
						name: 'formula',
						type: 'string',
						default: '',
						description: `Formulas may involve functions, numeric operations, logical operations, and text operations that operate on fields. More info <a href="https://support.airtable.com/hc/en-us/articles/203255215-Formula-Field-Reference">here</a>.`,
					},
					{
						displayName: 'View ID',
						name: 'viewId',
						type: 'string',
						default: '',
						description: 'The name or ID of a view in the table. If set, only the records in that view will be returned.',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const downloadAttachments = this.getNodeParameter('downloadAttachments', 0) as boolean;

		const webhookData = this.getWorkflowStaticData('node');

		const qs: IDataObject = {};

		const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;

		const base = this.getNodeParameter('baseId') as string;

		const table = this.getNodeParameter('tableId') as string;

		const triggerField = this.getNodeParameter('triggerField') as string;

		const endpoint = `${base}/${table}`;

		const now = moment().utc().format();

		const startDate = webhookData.lastTimeChecked as string || now;

		const endDate = now;

		if (additionalFields.viewId) {
			qs.view = additionalFields.viewId;
		}

		if (additionalFields.fields) {
			qs['fields[]'] = (additionalFields.fields as string).split(',');
		}

		qs.filterByFormula = `IS_AFTER({${triggerField}}, DATETIME_PARSE("${startDate}", "YYYY-MM-DD HH:mm:ss"))`;

		if (additionalFields.formula) {
			qs.filterByFormula = `AND(${qs.filterByFormula}, ${additionalFields.formula})`;
		}

		if (this.getMode() === 'manual') {
			delete qs.filterByFormula;
			qs.maxRecords = 1;
		}

		const { records } = await apiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(records) && records.length) {
			if (this.getMode() === 'manual' && records[0].fields[triggerField] === undefined) {
				throw new NodeOperationError(this.getNode(), `The Field "${triggerField}" does not exist.`);
			}

			if (downloadAttachments === true) {
				const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', 0) as string).split(',');
				const data = await downloadRecordAttachments.call(this, records, downloadFieldNames);
				return [data];
			}

			return [this.helpers.returnJsonArray(records)];
		}

		return null;
	}
}
