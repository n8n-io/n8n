import {
	IPollFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	apiRequestAllItems,
} from './GenericFunctions';

import * as moment from 'moment';

export class AirtableTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Airtable Trigger',
		name: 'airtableTrigger',
		icon: 'file:airtable.png',
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
						description: '',
					},
					{
						displayName: 'View ID',
						name: 'viewId',
						type: 'string',
						default: '',
						description: '',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {

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

		qs['fields[]'] = [triggerField];

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

		const { records } = await apiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(records) && records.length) {

			return [this.helpers.returnJsonArray(records)];
		}

		return null;
	}
}
