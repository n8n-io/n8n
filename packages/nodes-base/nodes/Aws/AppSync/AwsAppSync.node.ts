import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { graphqlApi, dataSource } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsAppSync implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS AppSync',
		name: 'awsAppSync',
		icon: 'file:appsync.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS AppSync GraphQL APIs',
		defaults: { name: 'AWS AppSync' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'graphqlApi',
				options: [
					{
						name: 'GraphQL API',
						value: 'graphqlApi',
					},
					{
						name: 'Data Source',
						value: 'dataSource',
					},
				],
			},
			...graphqlApi.description,
			...dataSource.description,
		],
	};
}
