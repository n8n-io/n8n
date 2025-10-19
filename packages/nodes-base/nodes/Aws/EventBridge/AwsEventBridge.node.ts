import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';

import { awsApiRequestREST } from '../GenericFunctions';

export class AwsEventBridge implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS EventBridge',
		name: 'awsEventBridge',
		icon: 'file:eventbridge.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Create event-driven applications with EventBridge',
		defaults: {
			name: 'AWS EventBridge',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Put Events',
						value: 'putEvents',
						description: 'Send custom events to EventBridge',
						action: 'Put events',
					},
					{
						name: 'Put Rule',
						value: 'putRule',
						description: 'Create or update an EventBridge rule',
						action: 'Put rule',
					},
					{
						name: 'Put Targets',
						value: 'putTargets',
						description: 'Add targets to an EventBridge rule',
						action: 'Put targets',
					},
					{
						name: 'List Rules',
						value: 'listRules',
						description: 'List EventBridge rules',
						action: 'List rules',
					},
					{
						name: 'Delete Rule',
						value: 'deleteRule',
						description: 'Delete an EventBridge rule',
						action: 'Delete rule',
					},
				],
				default: 'putEvents',
			},
			// Put Events
			{
				displayName: 'Event Bus Name',
				name: 'eventBusName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putEvents', 'putRule', 'putTargets', 'listRules'],
					},
				},
				default: 'default',
				description: 'Event bus name',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putEvents'],
					},
				},
				default: '',
				required: true,
				placeholder: 'myapp.orders',
				description: 'Event source',
			},
			{
				displayName: 'Detail Type',
				name: 'detailType',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putEvents'],
					},
				},
				default: '',
				required: true,
				placeholder: 'Order Placed',
				description: 'Event detail type',
			},
			{
				displayName: 'Detail',
				name: 'detail',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putEvents'],
					},
				},
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				placeholder: '{"orderId": "12345", "amount": 100}',
				description: 'Event detail JSON',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['putEvents'],
					},
				},
				options: [
					{
						displayName: 'Resources',
						name: 'resources',
						type: 'string',
						default: '',
						description: 'Comma-separated ARNs',
					},
				],
			},
			// Put Rule
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putRule', 'putTargets', 'deleteRule'],
					},
				},
				default: '',
				required: true,
				description: 'Rule name',
			},
			{
				displayName: 'Event Pattern',
				name: 'eventPattern',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putRule'],
					},
				},
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				placeholder: '{"source": ["myapp.orders"]}',
				description: 'Event pattern JSON',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['putRule'],
					},
				},
				options: [
					{ name: 'Enabled', value: 'ENABLED' },
					{ name: 'Disabled', value: 'DISABLED' },
				],
				default: 'ENABLED',
				description: 'Rule state',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['putRule'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Rule description',
					},
					{
						displayName: 'Role ARN',
						name: 'roleArn',
						type: 'string',
						default: '',
						description: 'IAM role ARN for targets',
					},
				],
			},
			// Put Targets
			{
				displayName: 'Targets',
				name: 'targets',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						operation: ['putTargets'],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'targetsValues',
						displayName: 'Target',
						values: [
							{
								displayName: 'ID',
								name: 'id',
								type: 'string',
								default: '',
								required: true,
								description: 'Unique target ID',
							},
							{
								displayName: 'ARN',
								name: 'arn',
								type: 'string',
								default: '',
								required: true,
								description: 'Target ARN (Lambda, SNS, SQS, etc.)',
							},
							{
								displayName: 'Role ARN',
								name: 'roleArn',
								type: 'string',
								default: '',
								description: 'IAM role (required for most targets)',
							},
							{
								displayName: 'Input',
								name: 'input',
								type: 'string',
								typeOptions: {
									rows: 2,
								},
								default: '',
								description: 'Static JSON input',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);
				let responseData: any;

				if (operation === 'putEvents') {
					const eventBusName = this.getNodeParameter('eventBusName', i) as string;
					const source = this.getNodeParameter('source', i) as string;
					const detailType = this.getNodeParameter('detailType', i) as string;
					const detail = this.getNodeParameter('detail', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					// Validate JSON
					try {
						JSON.parse(detail);
					} catch (error) {
						throw new NodeApiError(this.getNode(), {
							message: 'Detail must be valid JSON',
						} as any);
					}

					const entry: IDataObject = {
						Source: source,
						DetailType: detailType,
						Detail: detail,
						EventBusName: eventBusName,
						Time: new Date().toISOString(),
					};

					if (additionalFields.resources) {
						entry.Resources = (additionalFields.resources as string).split(',').map((r) => r.trim());
					}

					const body = {
						Entries: [entry],
					};

					responseData = await awsApiRequestREST.call(
						this,
						'events',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'AWSEvents.PutEvents',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				} else if (operation === 'putRule') {
					const name = this.getNodeParameter('name', i) as string;
					const eventPattern = this.getNodeParameter('eventPattern', i) as string;
					const state = this.getNodeParameter('state', i) as string;
					const eventBusName = this.getNodeParameter('eventBusName', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					// Validate JSON
					try {
						JSON.parse(eventPattern);
					} catch (error) {
						throw new NodeApiError(this.getNode(), {
							message: 'Event pattern must be valid JSON',
						} as any);
					}

					const body: IDataObject = {
						Name: name,
						EventPattern: eventPattern,
						State: state,
						EventBusName: eventBusName,
					};

					if (additionalFields.description) {
						body.Description = additionalFields.description;
					}
					if (additionalFields.roleArn) {
						body.RoleArn = additionalFields.roleArn;
					}

					responseData = await awsApiRequestREST.call(
						this,
						'events',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'AWSEvents.PutRule',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				} else if (operation === 'putTargets') {
					const name = this.getNodeParameter('name', i) as string;
					const eventBusName = this.getNodeParameter('eventBusName', i) as string;
					const targetsValues = this.getNodeParameter('targets.targetsValues', i, []) as any[];

					const targets = targetsValues.map((target) => {
						const t: IDataObject = {
							Id: target.id,
							Arn: target.arn,
						};
						if (target.roleArn) {
							t.RoleArn = target.roleArn;
						}
						if (target.input) {
							t.Input = target.input;
						}
						return t;
					});

					const body = {
						Rule: name,
						EventBusName: eventBusName,
						Targets: targets.slice(0, 5), // Max 5 targets per request
					};

					responseData = await awsApiRequestREST.call(
						this,
						'events',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'AWSEvents.PutTargets',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				} else if (operation === 'listRules') {
					const eventBusName = this.getNodeParameter('eventBusName', i) as string;

					const body = {
						EventBusName: eventBusName,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'events',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'AWSEvents.ListRules',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					responseData = responseData.Rules || [];
				} else if (operation === 'deleteRule') {
					const name = this.getNodeParameter('name', i) as string;
					const eventBusName = this.getNodeParameter('eventBusName', i) as string;

					const body = {
						Name: name,
						EventBusName: eventBusName,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'events',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'AWSEvents.DeleteRule',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					responseData = { success: true, ruleName: name };
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
