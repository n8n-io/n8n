import moment from 'moment-timezone';
import {
	type IExecuteFunctions,
	type JsonObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
	jsonParse,
	assertParamIsString,
	validateNodeParameters,
	assertParamIsNumber,
	assertParamIsArray,
} from 'n8n-workflow';

import type { Datapoint } from './Beeminder.node.functions';
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

		for (let i = 0; i < length; i++) {
			try {
				let results: JsonObject[];

				if (resource === 'datapoint') {
					const goalName = this.getNodeParameter('goalName', i);
					assertParamIsString('goalName', goalName, this.getNode());
					results = await executeDatapointOperations(this, operation, goalName, i, timezone);
				} else if (resource === 'charge') {
					results = await executeChargeOperations(this, operation, i);
				} else if (resource === 'goal') {
					results = await executeGoalOperations(this, operation, i, timezone);
				} else if (resource === 'user') {
					results = await executeUserOperations(this, operation, i, timezone);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				const executionData = buildExecutionData(this, results, i);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const errorData = {
						json: {},
						error: error instanceof NodeOperationError ? error : undefined,
						itemIndex: i,
					};
					returnData.push(errorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

function buildExecutionData(
	context: IExecuteFunctions,
	results: JsonObject[],
	itemIndex: number,
): INodeExecutionData[] {
	return context.helpers.constructExecutionMetaData(context.helpers.returnJsonArray(results), {
		itemData: { item: itemIndex },
	});
}

async function executeDatapointCreate(
	context: IExecuteFunctions,
	goalName: string,
	itemIndex: number,
	timezone: string,
): Promise<JsonObject[]> {
	const value = context.getNodeParameter('value', itemIndex);
	assertParamIsNumber('value', value, context.getNode());

	const options = context.getNodeParameter('additionalFields', itemIndex);
	if (options.timestamp) {
		options.timestamp = moment.tz(options.timestamp, timezone).unix();
	}

	validateNodeParameters(
		options,
		{
			comment: { type: 'string' },
			timestamp: { type: 'number' },
			requestid: { type: 'string' },
		},
		context.getNode(),
	);

	const data = {
		value,
		goalName,
		...options,
	};

	return await createDatapoint.call(context, data);
}

async function executeDatapointGetAll(
	context: IExecuteFunctions,
	goalName: string,
	itemIndex: number,
): Promise<JsonObject[]> {
	const returnAll = context.getNodeParameter('returnAll', itemIndex);
	const options = context.getNodeParameter('options', itemIndex);
	validateNodeParameters(
		options,
		{
			sort: { type: 'string' },
			page: { type: 'number' },
			per: { type: 'number' },
		},
		context.getNode(),
	);

	const data = {
		goalName,
		count: !returnAll ? context.getNodeParameter('limit', 0) : undefined,
		...options,
	};

	return await getAllDatapoints.call(context, data);
}

async function executeDatapointUpdate(
	context: IExecuteFunctions,
	goalName: string,
	itemIndex: number,
	timezone: string,
): Promise<JsonObject[]> {
	const datapointId = context.getNodeParameter('datapointId', itemIndex);
	assertParamIsString('datapointId', datapointId, context.getNode());
	const options = context.getNodeParameter('updateFields', itemIndex);
	if (options.timestamp) {
		options.timestamp = moment.tz(options.timestamp, timezone).unix();
	}

	validateNodeParameters(
		options,
		{
			value: { type: 'number' },
			comment: { type: 'string' },
			timestamp: { type: 'number' },
		},
		context.getNode(),
	);

	const data = {
		goalName,
		datapointId,
		...options,
	};

	return await updateDatapoint.call(context, data);
}

async function executeDatapointDelete(
	context: IExecuteFunctions,
	goalName: string,
	itemIndex: number,
): Promise<JsonObject[]> {
	const datapointId = context.getNodeParameter('datapointId', itemIndex);
	assertParamIsString('datapointId', datapointId, context.getNode());
	const data = {
		goalName,
		datapointId,
	};
	return await deleteDatapoint.call(context, data);
}

async function executeDatapointCreateAll(
	context: IExecuteFunctions,
	goalName: string,
	itemIndex: number,
): Promise<JsonObject[]> {
	const datapoints = context.getNodeParameter('datapoints', itemIndex);
	const parsedDatapoints = typeof datapoints === 'string' ? jsonParse(datapoints) : datapoints;
	assertParamIsArray<Datapoint>(
		'datapoints',
		parsedDatapoints,
		(val): val is Datapoint => typeof val === 'object' && val !== null && 'value' in val,
		context.getNode(),
	);

	const data = {
		goalName,
		datapoints: parsedDatapoints,
	};
	return await createAllDatapoints.call(context, data);
}

async function executeDatapointGet(
	context: IExecuteFunctions,
	goalName: string,
	itemIndex: number,
): Promise<JsonObject[]> {
	const datapointId = context.getNodeParameter('datapointId', itemIndex);
	assertParamIsString('datapointId', datapointId, context.getNode());
	const data = {
		goalName,
		datapointId,
	};
	return await getSingleDatapoint.call(context, data);
}

async function executeDatapointOperations(
	context: IExecuteFunctions,
	operation: string,
	goalName: string,
	itemIndex: number,
	timezone: string,
): Promise<JsonObject[]> {
	switch (operation) {
		case 'create':
			return await executeDatapointCreate(context, goalName, itemIndex, timezone);
		case 'getAll':
			return await executeDatapointGetAll(context, goalName, itemIndex);
		case 'update':
			return await executeDatapointUpdate(context, goalName, itemIndex, timezone);
		case 'delete':
			return await executeDatapointDelete(context, goalName, itemIndex);
		case 'createAll':
			return await executeDatapointCreateAll(context, goalName, itemIndex);
		case 'get':
			return await executeDatapointGet(context, goalName, itemIndex);
		default:
			throw new NodeOperationError(context.getNode(), `Unknown datapoint operation: ${operation}`);
	}
}

async function executeChargeOperations(
	context: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<JsonObject[]> {
	if (operation === 'create') {
		const amount = context.getNodeParameter('amount', itemIndex);
		assertParamIsNumber('amount', amount, context.getNode());
		const options = context.getNodeParameter('additionalFields', itemIndex);
		validateNodeParameters(
			options,
			{
				note: { type: 'string' },
				dryrun: { type: 'boolean' },
			},
			context.getNode(),
		);
		const data = {
			amount,
			...options,
		};

		return await createCharge.call(context, data);
	}
	throw new NodeOperationError(context.getNode(), `Unknown charge operation: ${operation}`);
}

async function executeGoalCreate(
	context: IExecuteFunctions,
	itemIndex: number,
	timezone: string,
): Promise<JsonObject[]> {
	const slug = context.getNodeParameter('slug', itemIndex);
	assertParamIsString('slug', slug, context.getNode());
	const title = context.getNodeParameter('title', itemIndex);
	assertParamIsString('title', title, context.getNode());
	const goalType = context.getNodeParameter('goal_type', itemIndex);
	assertParamIsString('goalType', goalType, context.getNode());
	const gunits = context.getNodeParameter('gunits', itemIndex);
	assertParamIsString('gunits', gunits, context.getNode());
	const options = context.getNodeParameter('additionalFields', itemIndex);
	if ('tags' in options && typeof options.tags === 'string') {
		options.tags = jsonParse(options.tags);
	}
	if (options.goaldate && typeof options.goaldate === 'string') {
		options.goaldate = moment.tz(options.goaldate, timezone).unix();
	}

	validateNodeParameters(
		options,
		{
			goaldate: { type: 'number' },
			goalval: { type: 'number' },
			rate: { type: 'number' },
			initval: { type: 'number' },
			secret: { type: 'boolean' },
			datapublic: { type: 'boolean' },
			datasource: { type: 'string' },
			dryrun: { type: 'boolean' },
			tags: { type: 'string[]' },
		},
		context.getNode(),
	);

	const data = {
		slug,
		title,
		goal_type: goalType,
		gunits,
		...options,
	};

	return await createGoal.call(context, data);
}

async function executeGoalGet(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<JsonObject[]> {
	const goalName = context.getNodeParameter('goalName', itemIndex);
	assertParamIsString('goalName', goalName, context.getNode());
	const options = context.getNodeParameter('additionalFields', itemIndex);
	validateNodeParameters(
		options,
		{
			datapoints: { type: 'boolean' },
			emaciated: { type: 'boolean' },
		},
		context.getNode(),
	);
	const data = {
		goalName,
		...options,
	};

	return await getGoal.call(context, data);
}

async function executeGoalGetAll(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<JsonObject[]> {
	const options = context.getNodeParameter('additionalFields', itemIndex);
	validateNodeParameters(
		options,
		{
			emaciated: { type: 'boolean' },
		},
		context.getNode(),
	);
	const data = { ...options };

	return await getAllGoals.call(context, data);
}

async function executeGoalGetArchived(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<JsonObject[]> {
	const options = context.getNodeParameter('additionalFields', itemIndex);
	validateNodeParameters(
		options,
		{
			emaciated: { type: 'boolean' },
		},
		context.getNode(),
	);
	const data = { ...options };

	return await getArchivedGoals.call(context, data);
}

async function executeGoalUpdate(
	context: IExecuteFunctions,
	itemIndex: number,
	timezone: string,
): Promise<JsonObject[]> {
	const goalName = context.getNodeParameter('goalName', itemIndex);
	assertParamIsString('goalName', goalName, context.getNode());
	const options = context.getNodeParameter('updateFields', itemIndex);
	if ('tags' in options && typeof options.tags === 'string') {
		options.tags = jsonParse(options.tags);
	}
	if ('roadall' in options && typeof options.roadall === 'string') {
		options.roadall = jsonParse(options.roadall);
	}
	if ('goaldate' in options && options.goaldate) {
		options.goaldate = moment.tz(options.goaldate, timezone).unix();
	}
	validateNodeParameters(
		options,
		{
			title: { type: 'string' },
			yaxis: { type: 'string' },
			tmin: { type: 'string' },
			tmax: { type: 'string' },
			goaldate: { type: 'number' },
			secret: { type: 'boolean' },
			datapublic: { type: 'boolean' },
			roadall: { type: 'object' },
			datasource: { type: 'string' },
			tags: { type: 'string[]' },
		},
		context.getNode(),
	);
	const data = {
		goalName,
		...options,
	};
	return await updateGoal.call(context, data);
}

async function executeGoalRefresh(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<JsonObject[]> {
	const goalName = context.getNodeParameter('goalName', itemIndex);
	assertParamIsString('goalName', goalName, context.getNode());
	const data = {
		goalName,
	};
	return await refreshGoal.call(context, data);
}

async function executeGoalShortCircuit(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<JsonObject[]> {
	const goalName = context.getNodeParameter('goalName', itemIndex);
	assertParamIsString('goalName', goalName, context.getNode());

	const data = {
		goalName,
	};
	return await shortCircuitGoal.call(context, data);
}

async function executeGoalStepDown(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<JsonObject[]> {
	const goalName = context.getNodeParameter('goalName', itemIndex);
	assertParamIsString('goalName', goalName, context.getNode());

	const data = {
		goalName,
	};
	return await stepDownGoal.call(context, data);
}

async function executeGoalCancelStepDown(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<JsonObject[]> {
	const goalName = context.getNodeParameter('goalName', itemIndex);
	assertParamIsString('goalName', goalName, context.getNode());
	const data = {
		goalName,
	};
	return await cancelStepDownGoal.call(context, data);
}

async function executeGoalUncle(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<JsonObject[]> {
	const goalName = context.getNodeParameter('goalName', itemIndex);
	assertParamIsString('goalName', goalName, context.getNode());
	const data = {
		goalName,
	};

	return await uncleGoal.call(context, data);
}

async function executeGoalOperations(
	context: IExecuteFunctions,
	operation: string,
	itemIndex: number,
	timezone: string,
): Promise<JsonObject[]> {
	switch (operation) {
		case 'create':
			return await executeGoalCreate(context, itemIndex, timezone);
		case 'get':
			return await executeGoalGet(context, itemIndex);
		case 'getAll':
			return await executeGoalGetAll(context, itemIndex);
		case 'getArchived':
			return await executeGoalGetArchived(context, itemIndex);
		case 'update':
			return await executeGoalUpdate(context, itemIndex, timezone);
		case 'refresh':
			return await executeGoalRefresh(context, itemIndex);
		case 'shortCircuit':
			return await executeGoalShortCircuit(context, itemIndex);
		case 'stepDown':
			return await executeGoalStepDown(context, itemIndex);
		case 'cancelStepDown':
			return await executeGoalCancelStepDown(context, itemIndex);
		case 'uncle':
			return await executeGoalUncle(context, itemIndex);
		default:
			throw new NodeOperationError(context.getNode(), `Unknown goal operation: ${operation}`);
	}
}

async function executeUserOperations(
	context: IExecuteFunctions,
	operation: string,
	itemIndex: number,
	timezone: string,
): Promise<JsonObject[]> {
	if (operation === 'get') {
		const options = context.getNodeParameter('additionalFields', itemIndex);
		if (options.diff_since) {
			options.diff_since = moment.tz(options.diff_since, timezone).unix();
		}
		validateNodeParameters(
			options,
			{
				associations: { type: 'boolean' },
				diff_since: { type: 'number' },
				skinny: { type: 'boolean' },
				emaciated: { type: 'boolean' },
				datapoints_count: { type: 'number' },
			},
			context.getNode(),
		);
		const data = { ...options };

		return await getUser.call(context, data);
	}
	throw new NodeOperationError(context.getNode(), `Unknown user operation: ${operation}`);
}
