import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { DaprClient, HttpMethod } from "dapr-client";

export class Dapr implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Dapr',
		name: 'dapr',
		icon: 'file:dapr.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Dapr API',
		defaults: {
			name: 'Dapr',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'dapr',
				required: true,
				testedBy: 'daprTest',
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				description: 'The operation to perform.',
				options: [
					{
						name: 'Invoke a Service',
						value: 'invokeService',
					},
					{
						name: 'Get state',
						value: 'getState',
					},
					{
						name: 'Set state',
						value: 'setState',
					},
					{
						name: 'Delete state',
						value: 'deleteState',
					},
					{
						name: 'Publish messages',
						value: 'publishMessages',
					},
					{
						name: 'Invoke Output Binding',
						value: 'invokeOutputBinding',
					}
				],
				default: 'invokeService',
			},
			{
				displayName: 'Service App ID',
				name: 'serviceAppId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['invokeService'],
					},
				},
			},
			{
				displayName: 'Service Method',
				name: 'serviceMethod',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['invokeService'],
					},
				},
			},
			{
				displayName: 'Http Method',
				name: 'method',
				type: 'options',
				default: 'get',
				description: 'The HTTP method to use.',
				displayOptions: {
					show: {
						'operation': ['invokeService']
					}
				},
				options: [
					{
						name: 'GET',
						value: HttpMethod.GET,
					},
					{
						name: 'POST',
						value: HttpMethod.POST,
					},
					{
						name: 'PUT',
						value: HttpMethod.PUT,
					},
					{
						name: 'DELETE',
						value: HttpMethod.DELETE,
					},
				],
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				displayOptions: {
					show: {
						operation: [
							'invokeService'
						],
					},
				},
			},
			{
				displayName: 'Store name',
				name: 'storeName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getState',
							'setState',
							'deleteState'
						],
					},
				},
			},
			{
				displayName: 'State key',
				name: 'stateKey',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getState',
							'setState',
							'deleteState'
						],
					},
				},
			},
			{
				displayName: 'State objects',
				name: 'stateObjects',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'setState',
						],
					},
				},
			},
			{
				displayName: 'Pubsub name',
				name: 'pubsubName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'publishMessages',
						],
					},
				},
			},
			{
				displayName: 'Pubsub topic',
				name: 'pubsubTopic',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'publishMessages',
						],
					},
				},
			},
			{
				displayName: 'Pubsub messages',
				name: 'pubsubMessages',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'publishMessages',
						],
					},
				},
			},
			{
				displayName: 'Binding name',
				name: 'bindingName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'invokeOutputBinding',
						],
					},
				},
			},
			{
				displayName: 'Binding Operation',
				name: 'bindingOperation',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'invokeOutputBinding',
						],
					},
				},
			},
			{
				displayName: 'Binding Data',
				name: 'bindingData',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'invokeOutputBinding',
						],
					},
				},
			}
		],
	};

	methods = {
		credentialTest: {
			async daprTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;
				const daprHost = credentials!.daprHost as string || '127.0.0.1';
				const daprPort = credentials!.daprPort as string || '3500';
				const daprClient = new DaprClient(daprHost, daprPort);
				const isHealthy = await daprClient.health.isHealthy()
				if (!isHealthy) {
					return {
						status: 'Error',
						message: 'Dapr sidecar is not healthy',
					};
				}

				return {
					status: 'OK',
					message: 'Dapr sidecar is healthy!',
				}
			},
		}
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const daprClient = new DaprClient();
		const returnData: IDataObject[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		switch (operation) {
			case 'invokeService': {
				const serviceAppId = this.getNodeParameter('serviceAppId', 0) as string || '';
				const serviceMethod = this.getNodeParameter('serviceMethod', 0) as string || '';
				const httpMethod = this.getNodeParameter('httpMethod', 0) as HttpMethod || '';
				const data = this.getNodeParameter('data', 0) as string || '';
				const response = await daprClient.invoker.invoke(serviceAppId, serviceMethod, httpMethod, JSON.parse(data));
				returnData.push({ success: true, data: response });
				break;
			}

			case 'getState': {
				const storeName = this.getNodeParameter('storeName', 0) as string;
				const stateKey = this.getNodeParameter('stateKey', 0) as string;
				const response = await daprClient.state.get(storeName, stateKey);
				returnData.push({ success: true, data: response });
				break;
			}

			case 'setState': {
				const storeName = this.getNodeParameter('storeName', 0) as string;
				const stateKey = this.getNodeParameter('stateKey', 0) as string;
				const stateObjects = this.getNodeParameter('stateObjects', 0) as string;
				await daprClient.state.save(storeName, [
					{
						key: stateKey,
						value: stateObjects,
					}
				]);
				returnData.push({ success: true });
				break;
			}

			case 'deleteState': {
				const storeName = this.getNodeParameter('storeName', 0) as string;
				const stateKey = this.getNodeParameter('stateKey', 0) as string;
				await daprClient.state.delete(storeName, stateKey);
				returnData.push({ success: true });
				break;
			}

			case 'publishMessages': {
				const pubsubName = this.getNodeParameter('pubsubName', 0) as string;
				const pubsubTopic = this.getNodeParameter('pubsubTopic', 0) as string;
				const pubsubMessages = this.getNodeParameter('pubsubMessages', 0) as string;
				const success = await daprClient.pubsub.publish(pubsubName, pubsubTopic, JSON.parse(pubsubMessages));
				returnData.push({ success });
				break;
			}

			case 'invokeOutputBinding': {
				const bindingName = this.getNodeParameter('bindingName', 0) as string;
				const bindingOperation = this.getNodeParameter('bindingOperation', 0) as string;
				const bindingData = this.getNodeParameter('bindingData', 0) as string;
				const response = await daprClient.binding.send(bindingName, bindingOperation, bindingData);
				returnData.push({ success: true, data: response });
				break;
			}

			default:
				throw new Error(`The operation "${operation}" is not supported!`);
		}

		if (operation === 'getState') {

		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
