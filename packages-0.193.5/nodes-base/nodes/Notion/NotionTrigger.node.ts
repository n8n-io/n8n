import { IPollFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { notionApiRequest, simplifyObjects } from './GenericFunctions';

import moment from 'moment';

export class NotionTrigger implements INodeType {
	description: INodeTypeDescription = {
		// eslint-disable-next-line n8n-nodes-base/node-class-description-display-name-unsuffixed-trigger-node
		displayName: 'Notion Trigger (Beta)',
		name: 'notionTrigger',
		icon: 'file:notion.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Notion events occur',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'Notion Trigger',
		},
		credentials: [
			{
				name: 'notionApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Page Added to Database',
						value: 'pageAddedToDatabase',
					},
					{
						name: 'Page Updated in Database',
						value: 'pagedUpdatedInDatabase',
					},
				],
				required: true,
				default: '',
			},
			{
				displayName:
					"In Notion, make sure you share your database with your integration. Otherwise it won't be accessible, or listed here.",
				name: 'notionNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Database Name or ID',
				name: 'databaseId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatabases',
				},
				displayOptions: {
					show: {
						event: ['pageAddedToDatabase', 'pagedUpdatedInDatabase'],
					},
				},
				default: '',
				required: true,
				description:
					'The ID of this database. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						event: ['pageAddedToDatabase', 'pagedUpdatedInDatabase'],
					},
				},
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
		],
	};

	methods = {
		loadOptions: {
			async getDatabases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { results: databases } = await notionApiRequest.call(this, 'POST', `/search`, {
					page_size: 100,
					filter: { property: 'object', value: 'database' },
				});
				for (const database of databases) {
					returnData.push({
						name: database.title[0]?.plain_text || database.id,
						value: database.id,
					});
				}
				returnData.sort((a, b) => {
					if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
						return -1;
					}
					if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
						return 1;
					}
					return 0;
				});
				return returnData;
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const databaseId = this.getNodeParameter('databaseId') as string;
		const event = this.getNodeParameter('event') as string;
		const simple = this.getNodeParameter('simple') as boolean;

		const now = moment().utc().format();

		const startDate = (webhookData.lastTimeChecked as string) || now;

		const endDate = now;

		webhookData.lastTimeChecked = endDate;

		const sortProperty = event === 'pageAddedToDatabase' ? 'created_time' : 'last_edited_time';

		const body: IDataObject = {
			page_size: 1,
			sorts: [
				{
					timestamp: sortProperty,
					direction: 'descending',
				},
			],
		};

		let records: IDataObject[] = [];

		let hasMore = true;

		//get last record
		let { results: data } = await notionApiRequest.call(
			this,
			'POST',
			`/databases/${databaseId}/query`,
			body,
		);

		if (this.getMode() === 'manual') {
			if (simple === true) {
				data = simplifyObjects(data, false, 1);
			}
			if (Array.isArray(data) && data.length) {
				return [this.helpers.returnJsonArray(data)];
			}
		}

		// if something changed after the last check
		if (Object.keys(data[0]).length !== 0 && webhookData.lastRecordProccesed !== data[0].id) {
			do {
				body.page_size = 10;
				const { results, has_more, next_cursor } = await notionApiRequest.call(
					this,
					'POST',
					`/databases/${databaseId}/query`,
					body,
				);
				records.push.apply(records, results);
				hasMore = has_more;
				if (next_cursor !== null) {
					body['start_cursor'] = next_cursor;
				}
			} while (
				!moment(records[records.length - 1][sortProperty] as string).isSameOrBefore(startDate) &&
				hasMore === true
			);

			if (this.getMode() !== 'manual') {
				records = records.filter((record: IDataObject) =>
					moment(record[sortProperty] as string).isBetween(startDate, endDate),
				);
			}

			if (simple === true) {
				records = simplifyObjects(records, false, 1);
			}

			webhookData.lastRecordProccesed = data[0].id;

			if (Array.isArray(records) && records.length) {
				return [this.helpers.returnJsonArray(records)];
			}
		}

		return null;
	}
}
