import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	createDatapoint,
	deleteDatapoint,
	getAllDatapoints,
	updateDatapoint
} from './Beeminder.node.functions';

import {
	beeminderApiRequest,
} from './GenericFunctions';

import * as moment from 'moment-timezone';

export class Beeminder implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Beeminder',
		name: 'beeminder',
		group: ['output'],
		version: 1,
		description: 'Consume Beeminder API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Beeminder',
			color: '#FFCB06',
		},
		icon: 'file:beeminder.png',
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'beeminderApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Datapoint',
						value: 'datapoint',
					},
				],
				default: 'datapoint',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create datapoint for goal.',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a datapoint.',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all datapoints for a goal.',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a datapoint.',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
				required: true,
			},
			{
				displayName: 'Goal Name',
				name: 'goalName',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGoals',
				},
				displayOptions: {
					show: {
						resource: [
							'datapoint',
						],
					},
				},
				default: '',
				description: 'The name of the goal.',
				required: true,
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'datapoint',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'datapoint',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 300,
				},
				default: 30,
				description: 'How many results to return.',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				default: 1,
				placeholder: '',
				description: 'Datapoint value to send.',
				displayOptions: {
					show: {
						resource: [
							'datapoint',
						],
						operation: [
							'create',
						],
					},
				},
				required: true,
			},
			{
				displayName: 'Datapoint ID',
				name: 'datapointId',
				type: 'string',
				default: '',
				description: 'Datapoint id',
				displayOptions: {
					show: {
						operation: [
							'update',
							'delete',
						],
					},
				},
				required: true,
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'datapoint',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
						description: 'Comment',
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						type: 'dateTime',
						default: '',
						placeholder: '',
						description: 'Defaults to "now" if none is passed in, or the existing timestamp if the datapoint is being updated rather than created.',
					},
					{
						displayName: 'Request ID',
						name: 'requestId',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'String to uniquely identify a datapoint.',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'datapoint',
						],
						operation: [
							'getAll',
						],
					},
				},
				options: [
					{
						displayName: 'Sort',
						name: 'sort',
						type: 'string',
						default: 'id',
						placeholder: '',
						description: 'Attribute to sort on.',
					},
				],
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'datapoint',
						],
						operation: [
							'update',
						],
					},
				},
				options: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'number',
						default: 1,
						placeholder: '',
						description: 'Datapoint value to send.',
					},
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
						description: 'Comment',
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						type: 'dateTime',
						default: '',
						placeholder: '',
						description: 'Defaults to "now" if none is passed in, or the existing timestamp if the datapoint is being updated rather than created.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available groups to display them to user so that he can
			// select them easily
			async getGoals(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {

				const credentials = await this.getCredentials('beeminderApi');

				if (credentials === undefined) {
					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}

				const endpoint = `/users/${credentials.user}/goals.json`;

				const returnData: INodePropertyOptions[] = [];
				const goals = await beeminderApiRequest.call(this, 'GET', endpoint);
				for (const goal of goals) {
					returnData.push({
						name: goal.slug,
						value: goal.slug,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const timezone = this.getTimezone();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		let results;


		for (let i = 0; i < length; i++) {

			if (resource === 'datapoint') {
				const goalName = this.getNodeParameter('goalName', i) as string;
				if (operation === 'create') {
					const value = this.getNodeParameter('value', i) as number;
					const options = this.getNodeParameter('additionalFields', i) as INodeParameters;
					const data: IDataObject = {
						value,
						goalName,
					};
					Object.assign(data, options);

					if (data.timestamp) {
						data.timestamp = moment.tz(data.timestamp, timezone).unix();
					}
					results = await createDatapoint.call(this, data);
				}
				else if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as INodeParameters;
					const data: IDataObject = {
						goalName,
					};
					Object.assign(data, options);

					if (returnAll === false) {
						data.count = this.getNodeParameter('limit', 0) as number;
					}

					results = await getAllDatapoints.call(this, data);
				}
				else if (operation === 'update') {
					const datapointId = this.getNodeParameter('datapointId', i) as string;
					const options = this.getNodeParameter('updateFields', i) as INodeParameters;
					const data: IDataObject = {
						goalName,
						datapointId,
					};
					Object.assign(data, options);
					if (data.timestamp) {
						data.timestamp = moment.tz(data.timestamp, timezone).unix();
					}
					results = await updateDatapoint.call(this, data);
				}
				else if (operation === 'delete') {
					const datapointId = this.getNodeParameter('datapointId', i) as string;
					const data: IDataObject = {
						goalName,
						datapointId,
					};
					results = await deleteDatapoint.call(this, data);
				}
			}

			if (Array.isArray(results)) {
				returnData.push.apply(returnData, results as IDataObject[]);
			} else {
				returnData.push(results as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

