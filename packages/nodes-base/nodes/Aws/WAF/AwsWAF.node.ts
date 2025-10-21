import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleWAFError } from './helpers/errorHandler';

import {
	webAclOperations,
	webAclFields,
	ipSetOperations,
	ipSetFields,
} from './descriptions';

export class AwsWAF implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS WAF',
		name: 'awsWAF',
		icon: 'file:waf.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS WAF (Web Application Firewall)',
		defaults: {
			name: 'AWS WAF',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'IP Set',
						value: 'ipSet',
					},
					{
						name: 'Web ACL',
						value: 'webAcl',
					},
				],
				default: 'webAcl',
			},
			...webAclOperations,
			...webAclFields,
			...ipSetOperations,
			...ipSetFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				let response: IDataObject | IDataObject[];

				// Handle additional fields
				if (['list', 'create', 'update'].includes(operation)) {
					const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

					if (Object.keys(additionalFields).length > 0) {
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!requestOptions.body) {
							requestOptions.body = {};
						}

						// Parse JSON strings for Rules and Addresses fields
						if (additionalFields.Rules && typeof additionalFields.Rules === 'string') {
							additionalFields.Rules = JSON.parse(additionalFields.Rules as string);
						}

						Object.assign(requestOptions.body, additionalFields);
					}
				}

				// Parse JSON parameters
				const jsonParams = ['defaultAction', 'visibilityConfig', 'addresses'];
				for (const param of jsonParams) {
					try {
						const value = this.getNodeParameter(param, itemIndex, '') as string;
						if (value) {
							const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
							if (!requestOptions.body) {
								requestOptions.body = {};
							}
							const key = param.charAt(0).toUpperCase() + param.slice(1);
							(requestOptions.body as IDataObject)[key] = JSON.parse(value);
						}
					} catch (error) {
						// Parameter not present for this operation, continue
					}
				}

				// Make the request using n8n's routing
				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				// Handle errors
				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleWAFError.call(this, response, itemIndex);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response as IDataObject[]),
					{ itemData: { item: itemIndex } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
