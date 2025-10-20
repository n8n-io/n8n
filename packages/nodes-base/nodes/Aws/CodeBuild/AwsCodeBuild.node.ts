import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { project, build } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsCodeBuild implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS CodeBuild',
		name: 'awsCodeBuild',
		icon: 'file:codebuild.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS CodeBuild',
		defaults: { name: 'AWS CodeBuild' },
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
				default: 'project',
				options: [
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Build',
						value: 'build',
					},
				],
			},
			...project.description,
			...build.description,
		],
	};
}
