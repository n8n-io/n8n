import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { trace } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsXRay implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS X-Ray',
		name: 'awsXRay',
		icon: 'file:xray.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS X-Ray for distributed tracing',
		defaults: { name: 'AWS X-Ray' },
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
				default: 'trace',
				options: [
					{
						name: 'Trace',
						value: 'trace',
					},
				],
			},
			...trace.description,
		],
	};
}
