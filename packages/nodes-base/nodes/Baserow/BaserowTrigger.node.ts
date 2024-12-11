import moment from 'moment-timezone';
import type {
	IPollFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import {
	baserowApiRequest,
	baserowApiRequestAllItems,
	getJwtToken,
	getTableFields,
	TableFieldMapper,
	toOptions,
} from './GenericFunctions';
import type { BaserowCredentials, LoadedResource, Row } from './types';

export class BaserowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Baserow Trigger',
		name: 'baserowTrigger',
		icon: 'file:baserow.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Baserow events occur',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'Baserow Trigger',
		},
		credentials: [
			{
				name: 'baserowApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Database Name or ID',
				name: 'databaseId',
				type: 'options',
				default: '',
				required: true,
				description:
					'Database to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDatabaseIds',
				},
			},
			{
				displayName: 'Table Name or ID',
				name: 'tableId',
				type: 'options',
				default: '',
				required: true,
				description:
					'Table to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsDependsOn: ['databaseId'],
					loadOptionsMethod: 'getTableIds',
				},
			},
			{
				displayName: 'Trigger Field',
				name: 'triggerField',
				type: 'string',
				default: '',
				description:
					'A Created Time or Last Modified Time field that will be used to sort records. If you do not have a Created Time or Last Modified Time field in your schema, please create one, because without this field trigger will not work correctly.',
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
						requiresDataPath: 'multiple',
						default: '',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
						description:
							'Fields to be included in the response. Multiple ones can be set separated by comma. Example: <code>name, id</code>. By default all fields will be included.',
					},
					{
						displayName: 'View ID',
						name: 'viewId',
						type: 'string',
						default: '',
						description:
							'The name or ID of a view in the table. If set, only the records in that view will be returned.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getDatabaseIds(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
				const jwtToken = await getJwtToken.call(this, credentials);
				const endpoint = '/api/applications/';
				const databases = (await baserowApiRequest.call(
					this,
					'GET',
					endpoint,
					jwtToken,
				)) as LoadedResource[];
				return toOptions(databases);
			},

			async getTableIds(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
				const jwtToken = await getJwtToken.call(this, credentials);
				const databaseId = this.getNodeParameter('databaseId', 0) as string;
				const endpoint = `/api/database/tables/database/${databaseId}/`;
				const tables = (await baserowApiRequest.call(
					this,
					'GET',
					endpoint,
					jwtToken,
				)) as LoadedResource[];
				return toOptions(tables);
			},

			async getTableFields(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
				const jwtToken = await getJwtToken.call(this, credentials);
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const endpoint = `/api/database/fields/table/${tableId}/`;
				const fields = (await baserowApiRequest.call(
					this,
					'GET',
					endpoint,
					jwtToken,
				)) as LoadedResource[];
				return toOptions(fields);
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
		const jwtToken = await getJwtToken.call(this, credentials);
		const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;
		const webhookData = this.getWorkflowStaticData('node');
		const tableId = this.getNodeParameter('tableId') as string;
		const triggerField = this.getNodeParameter('triggerField') as string;

		const fields = await getTableFields.call(this, tableId, jwtToken);
		const tableMapper = new TableFieldMapper();
		tableMapper.createMappings(fields);

		const qs: IDataObject = {};

		const endpoint = `/api/database/rows/table/${tableId}/`;

		const now = moment().utc().format();

		const startDate = (webhookData.lastTimeChecked as string) || now;

		const endDate = now;

		if (additionalFields.viewId) {
			qs.view_id = additionalFields.viewId;
		}

		if (additionalFields.fields) {
			const include_fields = (additionalFields.fields as string)
				.split(',')
				.map((field) => tableMapper.setField(field))
				.join(',');
			qs.include = include_fields;
		}

		// Constructing datetime filters is unintuitive..
		// First, the date_after filter is deprecated, but still works.
		// Second, the datetime needs to be prefixed with the timezone.
		//
		// Example: "Europe/Amsterdam?2024-10-11 12:13:14"
		// see: https://community.baserow.io/t/filtering-on-datetime-fields-does-not-seem-possible/6515/5
		// Note: the real zone does not matter, as long as it is consistent.
		const timezone = moment.tz.guess();
		qs[`filter__${tableMapper.nameToId(triggerField)}__date_after`] = `${timezone}?${startDate}`;

		if (this.getMode() === 'manual') {
			qs.size = 1;
		}

		const rows = (await baserowApiRequestAllItems.call(
			this,
			'GET',
			endpoint,
			jwtToken,
			{},
			qs,
		)) as Row[];

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(rows) && rows.length) {
			rows.forEach((row) => tableMapper.idsToNames(row));

			if (this.getMode() === 'manual' && rows[0][triggerField] === undefined) {
				throw new NodeOperationError(this.getNode(), `The Field "${triggerField}" does not exist.`);
			}

			return [this.helpers.returnJsonArray(rows)];
		}

		return null;
	}
}
