import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { v4 as uuidv4 } from 'uuid';

import {
	Duration,
	IProcessVariables,
	PublishMessageResponse,
	ZBClient,
	ZBClientOptions,
} from 'zeebe-node';

export class CamundaCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Camunda Cloud',
		name: 'camundaCloud',
		subtitle:
			'={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		icon: 'file:camundaCloud.svg',
		group: ['transform'],
		version: 1,
		description: 'Interact with Camunda Cloud',
		defaults: {
			name: 'Camunda Cloud',
			color: '#ff6100',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'camundaCloudApi',
				required: true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Process Instance',
						value: 'processInstance',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Job',
						value: 'job',
					},
				],
				default: 'processInstance',
				required: true,
				description: 'The resource to use',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['processInstance'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new process instance',
					},
				],
				default: 'create',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['job'],
					},
				},
				options: [
					{
						name: 'Complete',
						value: 'complete',
						description: 'Complete an activated Zeebe job',
					},
					{
						name: 'Fail',
						value: 'fail',
						description: 'Mark an activated Zeebe job as failed',
					},
				],
				default: 'complete',
				description: 'The operation to perform',
			},
			{
				displayName: 'Job Key',
				name: 'jobKey',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['complete'],
						resource: ['job'],
					},
				},
				default: '',
				description:
					'Identifier of an already activated BPMN job, e.g. as returned by the Camunda Cloud Trigger node.',
			},
			{
				displayName: 'Job Key',
				name: 'jobKey',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['fail'],
						resource: ['job'],
					},
				},
				default: '',
				description:
					'Identifier of an already activated BPMN job, e.g. as returned by the Camunda Cloud Trigger node.',
			},
			{
				displayName: 'Error Message',
				name: 'errorMessage',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['fail'],
						resource: ['job'],
					},
				},
				default: 'an error occured while executing n8n workflow',
				description: 'Error Message to return to Camunda Cloud',
			},
			{
				displayName: 'Variables (JSON)',
				name: 'variables',
				type: 'json',
				required: false,
				displayOptions: {
					show: {
						operation: ['complete'],
						resource: ['job'],
					},
				},
				default: '',
				description: 'Variables to pass to Camunda Cloud',
			},
			{
				displayName: 'BPMN Process ID',
				name: 'bpmnProcessId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['processInstance'],
					},
				},
				default: '',
				description: 'Identifier of the BPMN process definition',
			},
			{
				displayName: 'Variables (JSON)',
				name: 'variables',
				type: 'json',
				required: false,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['processInstance'],
					},
				},
				default: '',
				description: 'Variables to pass to Camunda Cloud',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Publish',
						value: 'publish',
						description: 'Publish a message to the Zeebe broker',
					},
				],
				default: 'publish',
				description: 'The operation to perform',
			},
			{
				displayName: 'Correlation Key',
				name: 'correlationKey',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						operation: ['publish'],
						resource: ['message'],
					},
				},
				default: '',
				description: 'Value to correlate with process variable',
			},
			{
				displayName: 'Message Name',
				name: 'messageName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['publish'],
						resource: ['message'],
					},
				},
				default: '',
				description: 'Name of the message',
			},
			{
				displayName: 'Variables (JSON)',
				name: 'variables',
				type: 'json',
				required: false,
				displayOptions: {
					show: {
						operation: ['publish'],
						resource: ['message'],
					},
				},
				default: '',
				description: 'Variables to pass to Camunda Cloud',
			},
			{
				displayName: 'Time To Live',
				name: 'timeToLive',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						operation: ['publish'],
						resource: ['message'],
					},
				},
				default: 3600,
				description: 'Time to live in seconds',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = this.getCredentials(
			'camundaCloudApi',
		) as IDataObject;

		const {
			clientId,
			clientSecret,
			clusterId,
			clusterRegion,
		} = credentials;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'processInstance') {
					if (operation === 'create') {
						const bpmnProcessId = this.getNodeParameter(
							'bpmnProcessId',
							i,
						) as string;

						let variables =
							(this.getNodeParameter(
								'variables',
								i,
							) as unknown) ?? {};

						if ('string' === typeof variables) {
							variables = JSON.parse(variables);
						}

						const zbc = new ZBClient({
							camundaCloud: {
								clientId,
								clientSecret,
								clusterId,
								clusterRegion,
							},
						} as ZBClientOptions);

						const zbCreateProcessResult = await zbc.createProcessInstance(
							bpmnProcessId,
							variables,
						);

						//console.log(`zbCreateProcessResult: ${JSON.stringify(zbCreateProcessResult)}`);
						returnData.push(
							(zbCreateProcessResult as unknown) as IDataObject,
						);
					}
				} else if (resource === 'message') {
					if (operation === 'publish') {
						const correlationKey =
							(this.getNodeParameter(
								'correlationKey',
								i,
							) as string) ?? '';

						let variables =
							(this.getNodeParameter(
								'variables',
								i,
							) as unknown) ?? {};

						if ('string' === typeof variables) {
							variables = JSON.parse(variables);
						}
						const timeToLive = this.getNodeParameter(
							'timeToLive',
							i,
						) as number;

						const messageName = this.getNodeParameter(
							'messageName',
							i,
						) as string;

						const zbc = new ZBClient({
							camundaCloud: {
								clientId,
								clientSecret,
								clusterId,
								clusterRegion,
							},
						} as ZBClientOptions);

						let zbPublishMsgResult: PublishMessageResponse;

						if (!correlationKey) {
							zbPublishMsgResult = await zbc.publishStartMessage({
								messageId: uuidv4(),
								name: messageName,
								variables,
								timeToLive: Duration.seconds.of(timeToLive), // seconds
							});
						} else {
							zbPublishMsgResult = await zbc.publishMessage({
								messageId: uuidv4(),
								name: messageName,
								correlationKey,
								variables,
								timeToLive: Duration.seconds.of(timeToLive), // seconds
							});
						}

						// console.log(
						// 	`zbPublishMsgResult: ${JSON.stringify(zbPublishMsgResult)}`
						// );
						returnData.push(
							(zbPublishMsgResult as unknown) as IDataObject,
						);
					}
				} else if (resource === 'job') {
					const jobKey =
						(this.getNodeParameter('jobKey', i) as string) ?? '';

					const zbc = new ZBClient({
						camundaCloud: {
							clientId,
							clientSecret,
							clusterId,
							clusterRegion,
						},
					} as ZBClientOptions);

					if (operation == 'complete') {
						let variables =
							(this.getNodeParameter(
								'variables',
								i,
							) as unknown) ?? {};

						if ('string' === typeof variables) {
							variables = JSON.parse(variables);
						}
						//console.log('COMPLETING JOB', jobKey, variables);
						await zbc.completeJob({
							jobKey,
							variables: variables as IProcessVariables,
						});

						returnData.push({ success: true } as IDataObject);
					} else if (operation === 'fail') {
						const errorMessage = this.getNodeParameter(
							'errorMessage',
							i,
						) as string;

						//console.log('FAILING JOB', jobKey);
						await zbc.failJob({
							jobKey,
							retries: 0, //raises an inident
							errorMessage,
						});

						returnData.push({ success: true } as IDataObject);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.toString() });
					continue;
				}

				throw error;
			}
		}

		// Map data to n8n data structure
		return [this.helpers.returnJsonArray(returnData)];
	}
}
