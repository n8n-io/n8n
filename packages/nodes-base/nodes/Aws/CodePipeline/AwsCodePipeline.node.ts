import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { pipeline, execution } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsCodePipeline implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS CodePipeline',
		name: 'awsCodePipeline',
		icon: 'file:codepipeline.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS CodePipeline',
		defaults: { name: 'AWS CodePipeline' },
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
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'pipeline',
				options: [
					{
						name: 'Pipeline',
						value: 'pipeline',
					},
					{
						name: 'Execution',
						value: 'execution',
					},
				],
			},
			...pipeline.description,
			...execution.description,
		],
	};
}
