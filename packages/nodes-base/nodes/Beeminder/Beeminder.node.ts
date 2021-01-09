import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';
import {
	createDatapoint,
	deleteDatapoint,
	getAllDatapoints,
	updateDatapoint
} from './Beeminder.node.functions';

const DATAPOINT_RESOURCE = 'datapoint';

const CREATE_OPERATION = 'create';
const READ_OPERATION = 'read';
const UPDATE_OPERATION = 'update';
const DELETE_OPERATION = 'delete';

const GOAL_NAME_PROP = 'goalName';
const VALUE_PROP = 'value';
const COMMENT_PROP = 'comment';
const DATAPOINT_ID_PROP = 'datapointId';
const SORT_PROP = 'sort';
const COUNT_PROP = 'count';
const PAGE_PROP = 'page';
const PER_PROP = 'per';
const TIMESTAMP_PROP = 'timestamp';
const REQUEST_ID_PROP = 'requestId';

export class Beeminder implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Beeminder',
		name: 'beeminder',
		group: ['output'],
		version: 1,
		description: 'Custom Beeminder Api',
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
				required: true
			}
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
						value: DATAPOINT_RESOURCE
					}
				],
				default: DATAPOINT_RESOURCE,
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					hide: {
						resource: [
							DATAPOINT_RESOURCE,
						],
					},
				},
				options: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{
								name: 'Create',
								value: CREATE_OPERATION,
								description: 'Create datapoint for goal.',
							},
							{
								name: 'Read',
								value: READ_OPERATION,
								description: 'Get all datapoints for goal.',
							},
							{
								name: 'Update',
								value: UPDATE_OPERATION,
								description: 'Update a datapoint.',
							},
							{
								name: 'Delete',
								value: DELETE_OPERATION,
								description: 'Delete a datapoint.',
							}
						],
						default: CREATE_OPERATION,
						description: 'The operation to perform.',
					},
					{
						displayName: 'Goal name',
						name: GOAL_NAME_PROP,
						type: 'string',
						default: '',
						placeholder: 'Goal name',
						description: 'Goal name',
						required: true
					},
					{
						displayName: 'Datapoint value',
						name: VALUE_PROP,
						type: 'number',
						default: 1,
						placeholder: '',
						description: 'Datapoint value to send.',
						displayOptions: {
							show: {
								operation: [CREATE_OPERATION, UPDATE_OPERATION]
							},
						},
						required: true
					},
					{
						displayName: 'Comment',
						name: COMMENT_PROP,
						type: 'string',
						default: '',
						placeholder: 'Comment',
						description: 'Comment',
						displayOptions: {
							show: {
								operation: [CREATE_OPERATION, UPDATE_OPERATION]
							}
						}
					},
					{
						displayName: 'Timestamp',
						name: TIMESTAMP_PROP,
						type: 'dateTime',
						default: '',
						placeholder: '',
						description: 'Unix timestamp (or ISO datetime standard). Defaults to "now" if none is passed in.',
						displayOptions: {
							show: {
								operation: [CREATE_OPERATION, UPDATE_OPERATION]
							}
						}
					},
					{
						displayName: 'Request Id',
						name: REQUEST_ID_PROP,
						type: 'string',
						default: '',
						placeholder: '',
						description: 'String to uniquely identify a datapoint.',
						displayOptions: {
							show: {
								operation: [CREATE_OPERATION]
							}
						}
					},
					{
						displayName: 'Datapoint id',
						name: DATAPOINT_ID_PROP,
						type: 'string',
						default: '',
						placeholder: '',
						description: 'Datapoint id',
						displayOptions: {
							show: {
								operation: [UPDATE_OPERATION, DELETE_OPERATION]
							}
						},
						required: true
					},
					{
						displayName: 'Sort',
						name: SORT_PROP,
						type: 'string',
						default: 'id',
						placeholder: '',
						description: 'Attribute to sort on.',
						displayOptions: {
							show: {
								operation: [READ_OPERATION]
							}
						}
					},
					{
						displayName: 'Count',
						name: COUNT_PROP,
						type: 'number',
						default: '',
						placeholder: '',
						description: 'Limit results to count number of datapoints. Defaults to all datapoints if not set.',
						displayOptions: {
							show: {
								operation: [READ_OPERATION]
							}
						}
					},
					{
						displayName: 'Page number',
						name: PAGE_PROP,
						type: 'number',
						default: '',
						placeholder: '',
						description: 'Used to paginate results.',
						displayOptions: {
							show: {
								operation: [READ_OPERATION]
							}
						}
					},
					{
						displayName: 'Number of results per page',
						name: PER_PROP,
						type: 'number',
						default: '',
						placeholder: '',
						description: 'Number of results per page. Default 25. Ignored without page parameter.',
						displayOptions: {
							show: {
								operation: [READ_OPERATION]
							}
						}
					}
				]
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: INodeExecutionData[][] = [];
		const length = items.length as unknown as number;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (resource === DATAPOINT_RESOURCE) {
			for (let i = 0; i < length; i++) {
				const goalName = this.getNodeParameter(GOAL_NAME_PROP, i) as string;
				let results;
				if (operation === CREATE_OPERATION) {
					const value = this.getNodeParameter(VALUE_PROP, i) as number;
					const comment = this.getNodeParameter(COMMENT_PROP, i) as string;
					const timestamp = this.getNodeParameter(TIMESTAMP_PROP, i) as string;

					results = await createDatapoint.call(this, goalName, value, comment, timestamp);
				}
				else if (operation === READ_OPERATION) {
					const sort = this.getNodeParameter(SORT_PROP, i) as string;
					const count = this.getNodeParameter(COUNT_PROP, i) as number;
					const page = this.getNodeParameter(PAGE_PROP, i) as number;
					const per = this.getNodeParameter(PER_PROP, i) as number;

					results = await getAllDatapoints.call(this, goalName, sort, count, page, per);
				}
				else if (operation === UPDATE_OPERATION) {
					const datapointId = this.getNodeParameter(DATAPOINT_ID_PROP, i) as string;
					const value = this.getNodeParameter(VALUE_PROP, i) as number;
					const comment = this.getNodeParameter(COMMENT_PROP, i) as string;
					const timestamp = this.getNodeParameter(TIMESTAMP_PROP, i) as string;

					results = await updateDatapoint.call(this, goalName, datapointId, value, comment, timestamp);
				}
				else if (operation === DELETE_OPERATION) {
					const datapointId = this.getNodeParameter(DATAPOINT_ID_PROP, i) as string;

					results = await deleteDatapoint.call(this, goalName, datapointId);
				}

				returnData.push(this.helpers.returnJsonArray(results));
			}
		}

		return returnData;
	}
}

