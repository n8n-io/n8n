import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

import { awsApiRequestREST } from './GenericFunctions';

export class AwsLambda implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Lambda',
		name: 'awsLambda',
		icon: 'file:lambda.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["function"]}}',
		description: 'Invoke functions on AWS Lambda',
		defaults: {
			name: 'AWS Lambda',
		},
		inputs: ['main'],
		outputs: ['main'],
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
						name: 'Invoke',
						value: 'invoke',
						description: 'Invoke a function',
						action: 'Invoke a function',
					},
				],
				default: 'invoke',
			},
			{
				displayName: 'Function Name or ID',
				name: 'function',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getFunctions',
				},
				displayOptions: {
					show: {
						operation: ['invoke'],
					},
				},
				options: [],
				default: '',
				required: true,
				description:
					'The function you want to invoke. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Qualifier',
				name: 'qualifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['invoke'],
					},
				},
				required: true,
				default: '$LATEST',
				description: 'Specify a version or alias to invoke a published version of the function',
			},
			{
				displayName: 'Invocation Type',
				name: 'invocationType',
				type: 'options',
				options: [
					{
						name: 'Wait for Results',
						value: 'RequestResponse',
						description: 'Invoke the function synchronously and wait for the response',
					},
					{
						name: 'Continue Workflow',
						value: 'Event',
						description: 'Invoke the function and immediately continue the workflow',
					},
				],
				displayOptions: {
					show: {
						operation: ['invoke'],
					},
				},
				default: 'RequestResponse',
				description: 'Specify if the workflow should wait for the function to return the results',
			},
			{
				displayName: 'JSON Input',
				name: 'payload',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['invoke'],
					},
				},
				default: '',
				description: 'The JSON that you want to provide to your Lambda function as input',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getFunctions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const data = await awsApiRequestREST.call(this, 'lambda', 'GET', '/2015-03-31/functions/');

				for (const func of data.Functions!) {
					returnData.push({
						name: func.FunctionName as string,
						value: func.FunctionArn as string,
					});
				}

				if (data.NextMarker) {
					let marker: string = data.NextMarker;
					while (true) {
						const dataLoop = await awsApiRequestREST.call(
							this,
							'lambda',
							'GET',
							`/2015-03-31/functions/?MaxItems=50&Marker=${encodeURIComponent(marker)}`,
						);

						for (const func of dataLoop.Functions!) {
							returnData.push({
								name: func.FunctionName as string,
								value: func.FunctionArn as string,
							});
						}

						if (dataLoop.NextMarker) {
							marker = dataLoop.NextMarker;
						} else {
							break;
						}
					}
				}

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const params = {
					FunctionName: this.getNodeParameter('function', i) as string,
					InvocationType: this.getNodeParameter('invocationType', i) as string,
					Payload: this.getNodeParameter('payload', i) as string,
					Qualifier: this.getNodeParameter('qualifier', i) as string,
				};

				const responseData = await awsApiRequestREST.call(
					this,
					'lambda',
					'POST',
					`/2015-03-31/functions/${params.FunctionName}/invocations?Qualifier=${params.Qualifier}`,
					params.Payload,
					{
						'X-Amz-Invocation-Type': params.InvocationType,
						'Content-Type': 'application/x-amz-json-1.0',
					},
				);

				if (responseData !== null && responseData?.errorMessage !== undefined) {
					let _errorMessage = responseData.errorMessage;

					if (responseData.stackTrace) {
						_errorMessage += `\n\nStack trace:\n${responseData.stackTrace}`;
					}

					throw new NodeApiError(this.getNode(), responseData);
				} else {
					returnData.push({
						result: responseData,
					} as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
