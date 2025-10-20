import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { hostedZone, recordSet } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsRoute53 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Route 53',
		name: 'awsRoute53',
		icon: 'file:route53.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Route 53',
		defaults: { name: 'AWS Route 53' },
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
				'Accept': 'application/xml',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'hostedZone',
				options: [
					{
						name: 'Hosted Zone',
						value: 'hostedZone',
					},
					{
						name: 'Record Set',
						value: 'recordSet',
					},
				],
			},
			...hostedZone.description,
			...recordSet.description,
		],
	};
}
