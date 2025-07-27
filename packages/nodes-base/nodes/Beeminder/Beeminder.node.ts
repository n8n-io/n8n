import moment from 'moment-timezone';
import {
	type IExecuteFunctions,
	type JsonObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeParameters,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	createDatapoint,
	deleteDatapoint,
	getAllDatapoints,
	updateDatapoint,
	createCharge,
	uncleGoal,
	createAllDatapoints,
	getSingleDatapoint,
	getGoal,
	getAllGoals,
	getArchivedGoals,
	createGoal,
	updateGoal,
	refreshGoal,
	shortCircuitGoal,
	stepDownGoal,
	cancelStepDownGoal,
	getUser,
} from './Beeminder.node.functions';
import { beeminderApiRequest } from './GenericFunctions';
import { assertIsString } from '@utils/types';

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
		},
		usableAsTool: true,
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:beeminder.png',
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'beeminderApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiToken'],
					},
				},
			},
			{
				name: 'beeminderOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'API Token',
						value: 'apiToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'apiToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				required: true,
				options: [
					{
						name: 'Charge',
						value: 'charge',
					},
					{
						name: 'Datapoint',
						value: 'datapoint',
					},
					{
						name: 'Goal',
						value: 'goal',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'datapoint',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['charge'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a charge',
						action: 'Create a charge',
					},
				],
				default: 'create',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['datapoint'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create datapoint for goal',
						action: 'Create datapoint for goal',
					},
					{
						name: 'Create All',
						value: 'createAll',
						description: 'Create multiple datapoints at once',
						action: 'Create multiple datapoints at once',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a datapoint',
						action: 'Delete a datapoint',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a single datapoint',
						action: 'Get a single datapoint',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many datapoints for a goal',
						action: 'Get many datapoints for a goal',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a datapoint',
						action: 'Update a datapoint',
					},
				],
				default: 'create',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['goal'],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new goal',
						action: 'Create a new goal',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a specific goal',
						action: 'Get a specific goal',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many goals',
						action: 'Get many goals',
					},
					{
						name: 'Get Archived',
						value: 'getArchived',
						description: 'Get archived goals',
						action: 'Get archived goals',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a goal',
						action: 'Update a goal',
					},
					{
						name: 'Refresh',
						value: 'refresh',
						description: 'Refresh goal data',
						action: 'Refresh goal data',
					},
					{
						name: 'Short Circuit',
						value: 'shortCircuit',
						description: 'Short circuit pledge',
						action: 'Short circuit pledge',
					},
					{
						name: 'Step Down',
						value: 'stepDown',
						description: 'Step down pledge',
						action: 'Step down pledge',
					},
					{
						name: 'Cancel Step Down',
						value: 'cancelStepDown',
						action: 'Cancel step down',
					},
					{
						name: 'Uncle',
						value: 'uncle',
						description: 'Derail a goal and charge the pledge amount',
						action: 'Derail a goal and charge the pledge amount',
					},
				],
				default: 'get',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get user information',
						action: 'Get user information',
					},
				],
				default: 'get',
				required: true,
			},
			{
				displayName: 'Goal Name or ID',
				name: 'goalName',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGoals',
				},
				displayOptions: {
					show: {
						resource: ['datapoint'],
					},
				},
				default: '',
				description:
					'The name of the goal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				required: true,
			},
			{
				displayName: 'Goal Name or ID',
				name: 'goalName',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGoals',
				},
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['uncle'],
					},
				},
				default: '',
				description:
					'The name of the goal to derail. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				required: true,
			},
			{
				displayName: 'Goal Name or ID',
				name: 'goalName',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGoals',
				},
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['get', 'update', 'refresh', 'shortCircuit', 'stepDown', 'cancelStepDown'],
					},
				},
				default: '',
				description:
					'The name of the goal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				required: true,
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['charge'],
						operation: ['create'],
					},
				},
				default: 0,
				description: 'Charge amount in USD',
				required: true,
			},
			{
				displayName: 'Datapoints',
				name: 'datapoints',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['datapoint'],
						operation: ['createAll'],
					},
				},
				default: '[]',
				description:
					'Array of datapoint objects to create. Each object should contain value and optionally timestamp, comment, etc.',
				placeholder:
					'[{"value": 1, "comment": "First datapoint"}, {"value": 2, "comment": "Second datapoint"}]',
				required: true,
			},
			{
				displayName: 'Goal Slug',
				name: 'slug',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Unique identifier for the goal',
				required: true,
			},
			{
				displayName: 'Goal Title',
				name: 'title',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Human-readable title for the goal',
				required: true,
			},
			{
				displayName: 'Goal Type',
				name: 'goal_type',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['create'],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Hustler',
						value: 'hustler',
					},
					{
						name: 'Biker',
						value: 'biker',
					},
					{
						name: 'Fatloser',
						value: 'fatloser',
					},
					{
						name: 'Gainer',
						value: 'gainer',
					},
					{
						name: 'Inboxer',
						value: 'inboxer',
					},
					{
						name: 'Drinker',
						value: 'drinker',
					},
					{
						name: 'Custom',
						value: 'custom',
					},
				],
				default: 'hustler',
				description:
					'Type of goal. <a href="https://api.beeminder.com/#attributes-2">More info here.</a>.',
				required: true,
			},
			{
				displayName: 'Goal Units',
				name: 'gunits',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Units for the goal (e.g., "hours", "pages", "pounds")',
				required: true,
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['datapoint'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['datapoint'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 300,
				},
				default: 30,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				default: 1,
				placeholder: '',
				description: 'Datapoint value to send',
				displayOptions: {
					show: {
						resource: ['datapoint'],
						operation: ['create'],
					},
				},
				required: true,
			},
			{
				displayName: 'Datapoint ID',
				name: 'datapointId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['datapoint'],
						operation: ['update', 'delete', 'get'],
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
						resource: ['datapoint'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						type: 'dateTime',
						default: '',
						placeholder: '',
						description:
							'Defaults to "now" if none is passed in, or the existing timestamp if the datapoint is being updated rather than created',
					},
					{
						displayName: 'Request ID',
						name: 'requestid',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'String to uniquely identify a datapoint',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['charge'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: 'Charge explanation',
					},
					{
						displayName: 'Dry Run',
						name: 'dryrun',
						type: 'boolean',
						default: false,
						description: 'Whether to test charge creation without actually charging',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Goal Date',
						name: 'goaldate',
						type: 'dateTime',
						default: null,
						description: 'Target date for the goal',
					},
					{
						displayName: 'Goal Value',
						name: 'goalval',
						type: 'number',
						default: null,
						description: 'Target value for the goal',
					},
					{
						displayName: 'Rate',
						name: 'rate',
						type: 'number',
						default: null,
						description: 'Rate of progress (units per day)',
					},
					{
						displayName: 'Initial Value',
						name: 'initval',
						type: 'number',
						default: 0,
						description: "Initial value for today's date",
					},
					{
						displayName: 'Secret',
						name: 'secret',
						type: 'boolean',
						default: false,
						description: 'Whether the goal is secret',
					},
					{
						displayName: 'Data Public',
						name: 'datapublic',
						type: 'boolean',
						default: false,
						description: 'Whether the data is public',
					},
					{
						displayName: 'Data Source',
						name: 'datasource',
						type: 'options',
						options: [
							{
								name: 'API',
								value: 'api',
							},
							{
								name: 'IFTTT',
								value: 'ifttt',
							},
							{
								name: 'Zapier',
								value: 'zapier',
							},
							{
								name: 'Manual',
								value: 'manual',
							},
						],
						default: 'manual',
						description: 'Data source for the goal',
					},
					{
						displayName: 'Dry Run',
						name: 'dryrun',
						type: 'boolean',
						default: false,
						description: 'Whether to test the endpoint without actually creating a goal',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'json',
						default: '[]',
						description: 'Array of alphanumeric tags for the goal. Replaces existing tags.',
						placeholder: '["tag1", "tag2"]',
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
						resource: ['goal'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Human-readable title for the goal',
					},
					{
						displayName: 'Y-Axis',
						name: 'yaxis',
						type: 'string',
						default: '',
						description: 'Y-axis label for the goal graph',
					},
					{
						displayName: 'Tmin',
						name: 'tmin',
						type: 'string',
						default: '',
						placeholder: 'yyyy-mm-dd',
						description: 'Minimum date for the goal in format yyyy-mm-dd',
					},
					{
						displayName: 'Tmax',
						name: 'tmax',
						type: 'string',
						default: '',
						placeholder: 'yyyy-mm-dd',
						description: 'Maximum date for the goal in format yyyy-mm-dd',
					},
					{
						displayName: 'Secret',
						name: 'secret',
						type: 'boolean',
						default: false,
						description: 'Whether the goal is secret',
					},
					{
						displayName: 'Data Public',
						name: 'datapublic',
						type: 'boolean',
						default: false,
						description: 'Whether the data is public',
					},
					{
						displayName: 'Road All',
						name: 'roadall',
						type: 'json',
						default: '[]',
						description:
							'Array of arrays defining the bright red line. Each sub-array contains [date, value, rate] with exactly one field null.',
						placeholder: '[["2023-01-01", 0, null], [null, 100, 1]]',
					},
					{
						displayName: 'Data Source',
						name: 'datasource',
						type: 'options',
						options: [
							{
								name: 'API',
								value: 'api',
							},
							{
								name: 'IFTTT',
								value: 'ifttt',
							},
							{
								name: 'Zapier',
								value: 'zapier',
							},
							{
								name: 'Manual',
								value: '',
							},
						],
						default: '',
						description: 'Data source for the goal. Use empty string for manual entry.',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'json',
						default: '[]',
						description: 'Array of alphanumeric tags for the goal. Replaces existing tags.',
						placeholder: '["tag1", "tag2"]',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['get'],
					},
				},
				options: [
					{
						displayName: 'Include Datapoints',
						name: 'datapoints',
						type: 'boolean',
						default: false,
						description: 'Whether to include datapoints in the response',
					},
					{
						displayName: 'Emaciated',
						name: 'emaciated',
						type: 'boolean',
						default: false,
						description:
							'Whether to include the goal attributes called road, roadall, and fullroad will be stripped from the goal object',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['get'],
					},
				},
				options: [
					{
						displayName: 'Associations',
						name: 'associations',
						type: 'boolean',
						default: false,
						description: 'Whether to include associations in the response',
					},
					{
						displayName: 'Diff Since',
						name: 'diff_since',
						type: 'dateTime',
						default: null,
						description:
							'Only goals and datapoints that have been created or updated since the timestamp will be returned',
					},
					{
						displayName: 'Skinny',
						name: 'skinny',
						type: 'boolean',
						default: false,
						description: 'Whether to return minimal user data',
					},
					{
						displayName: 'Emaciated',
						name: 'emaciated',
						type: 'boolean',
						default: false,
						description:
							'Whether to include the goal attributes called road, roadall, and fullroad will be stripped from any goal objects returned with the user',
					},
					{
						displayName: 'Datapoints Count',
						name: 'datapoints_count',
						type: 'number',
						default: null,
						description: 'Number of datapoints to include',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Emaciated',
						name: 'emaciated',
						type: 'boolean',
						default: false,
						description:
							'Whether to include the goal attributes called road, roadall, and fullroad will be stripped from the goal objects',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['goal'],
						operation: ['getArchived'],
					},
				},
				options: [
					{
						displayName: 'Emaciated',
						name: 'emaciated',
						type: 'boolean',
						default: false,
						description:
							'Whether to include the goal attributes called road, roadall, and fullroad will be stripped from the goal objects',
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
						resource: ['datapoint'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Sort',
						name: 'sort',
						type: 'string',
						default: 'id',
						placeholder: '',
						description: 'Attribute to sort on',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						displayOptions: {
							show: {
								'/returnAll': [false],
							},
						},
						default: 1,
						typeOptions: {
							minValue: 1,
						},
						description: 'Used to paginate results, 1-indexed, meaning page 1 is the first page',
					},
					{
						displayName: 'Per Page',
						name: 'per',
						type: 'number',
						displayOptions: {
							show: {
								'/returnAll': [false],
							},
						},
						default: 25,
						typeOptions: {
							minValue: 0,
						},
						description:
							'Number of results per page. Default 25. Ignored without page parameter. Must be non-negative',
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
						resource: ['datapoint'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'number',
						default: 1,
						placeholder: '',
						description: 'Datapoint value to send',
					},
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						type: 'dateTime',
						default: '',
						placeholder: '',
						description:
							'Defaults to "now" if none is passed in, or the existing timestamp if the datapoint is being updated rather than created',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available groups to display them to user so that they can
			// select them easily
			async getGoals(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = '/users/me/goals.json';

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
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const timezone = this.getTimezone();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		let results: JsonObject[];

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'datapoint') {
					const goalName = this.getNodeParameter('goalName', i) as string;
					if (operation === 'create') {
						const value = this.getNodeParameter('value', i) as number;
						const options = this.getNodeParameter('additionalFields', i) as INodeParameters;
						const data: JsonObject = {
							value,
							goalName,
						};
						Object.assign(data, options);

						if (data.timestamp) {
							data.timestamp = moment.tz(data.timestamp, timezone).unix();
						}
						results = await createDatapoint.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i) as INodeParameters;
						const data: JsonObject = {
							goalName,
						};
						Object.assign(data, options);

						if (!returnAll) {
							data.count = this.getNodeParameter('limit', 0);
						}

						results = await getAllDatapoints.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'update') {
						const datapointId = this.getNodeParameter('datapointId', i) as string;
						const options = this.getNodeParameter('updateFields', i) as INodeParameters;
						const data: JsonObject = {
							goalName,
							datapointId,
						};
						Object.assign(data, options);
						if (data.timestamp) {
							data.timestamp = moment.tz(data.timestamp, timezone).unix();
						}
						results = await updateDatapoint.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'delete') {
						const datapointId = this.getNodeParameter('datapointId', i) as string;
						const data: JsonObject = {
							goalName,
							datapointId,
						};
						results = await deleteDatapoint.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'createAll') {
						const datapoints = this.getNodeParameter('datapoints', i) as string;
						const data: JsonObject = {
							goalName,
							datapoints: JSON.parse(datapoints),
						};
						results = await createAllDatapoints.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'get') {
						const datapointId = this.getNodeParameter('datapointId', i) as string;
						const data: JsonObject = {
							goalName,
							datapointId,
						};
						results = await getSingleDatapoint.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				} else if (resource === 'charge') {
					if (operation === 'create') {
						const amount = this.getNodeParameter('amount', i) as number;
						const options = this.getNodeParameter('additionalFields', i) as INodeParameters;
						const data: JsonObject = {
							amount,
						};
						Object.assign(data, options);

						results = await createCharge.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				} else if (resource === 'goal') {
					if (operation === 'create') {
						const slug = this.getNodeParameter('slug', i);
						assertIsString('slug', slug);
						const title = this.getNodeParameter('title', i);
						assertIsString('title', title);
						const goalType = this.getNodeParameter('goal_type', i);
						assertIsString('goalType', goalType);
						const gunits = this.getNodeParameter('gunits', i);
						assertIsString('gunits', gunits);
						const options = this.getNodeParameter('additionalFields', i) as INodeParameters;
						const data: JsonObject = {
							slug,
							title,
							goal_type: goalType,
							gunits,
						};
						Object.assign(data, options);

						if (data.goaldate) {
							data.goaldate = moment.tz(data.goaldate, timezone).unix();
						}
						results = await createGoal.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'get') {
						const goalName = this.getNodeParameter('goalName', i) as string;
						const options = this.getNodeParameter('additionalFields', i) as INodeParameters;
						const data: JsonObject = {
							goalName,
						};
						Object.assign(data, options);

						results = await getGoal.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'getAll') {
						const options = this.getNodeParameter('additionalFields', i) as INodeParameters;
						const data: JsonObject = {};
						Object.assign(data, options);

						results = await getAllGoals.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'getArchived') {
						const options = this.getNodeParameter('additionalFields', i) as INodeParameters;
						const data: JsonObject = {};
						Object.assign(data, options);

						results = await getArchivedGoals.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'update') {
						const goalName = this.getNodeParameter('goalName', i) as string;
						const options = this.getNodeParameter('updateFields', i) as INodeParameters;
						const data: JsonObject = {
							goalName,
						};
						Object.assign(data, options);

						if (data.goaldate) {
							data.goaldate = moment.tz(data.goaldate, timezone).unix();
						}
						results = await updateGoal.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'refresh') {
						const goalName = this.getNodeParameter('goalName', i) as string;
						const data: JsonObject = {
							goalName,
						};
						results = await refreshGoal.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'shortCircuit') {
						const goalName = this.getNodeParameter('goalName', i) as string;
						const data: JsonObject = {
							goalName,
						};
						results = await shortCircuitGoal.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'stepDown') {
						const goalName = this.getNodeParameter('goalName', i) as string;
						const data: JsonObject = {
							goalName,
						};
						results = await stepDownGoal.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'cancelStepDown') {
						const goalName = this.getNodeParameter('goalName', i) as string;
						const data: JsonObject = {
							goalName,
						};
						results = await cancelStepDownGoal.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'uncle') {
						const goalName = this.getNodeParameter('goalName', i) as string;
						const data: JsonObject = {
							goalName,
						};

						results = await uncleGoal.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				} else if (resource === 'user') {
					if (operation === 'get') {
						const options = this.getNodeParameter('additionalFields', i) as INodeParameters;
						const data: JsonObject = {};
						Object.assign(data, options);

						results = await getUser.call(this, data);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {}, itemIndex: i });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
