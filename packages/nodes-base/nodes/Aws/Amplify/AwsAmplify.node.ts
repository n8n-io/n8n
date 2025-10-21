import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	appOperations,
	appFields,
	branchOperations,
	branchFields,
	domainOperations,
	domainFields,
} from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsAmplify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Amplify',
		name: 'awsAmplify',
		icon: 'file:amplify.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Amplify',
		defaults: { name: 'AWS Amplify' },
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
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'app',
				options: [
					{
						name: 'App',
						value: 'app',
					},
					{
						name: 'Branch',
						value: 'branch',
					},
					{
						name: 'Domain',
						value: 'domain',
					},
				],
			},
			...appOperations,
			...appFields,
			...branchOperations,
			...branchFields,
			...domainOperations,
			...domainFields,
		],
	};
}
