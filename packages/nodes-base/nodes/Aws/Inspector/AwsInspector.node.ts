import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	findingOperations,
	findingFields,
	assessmentTargetOperations,
	assessmentTargetFields,
} from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsInspector implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Inspector',
		name: 'awsInspector',
		icon: 'file:inspector.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Inspector',
		defaults: { name: 'AWS Inspector' },
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
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'finding',
				options: [
					{
						name: 'Assessment Target',
						value: 'assessmentTarget',
					},
					{
						name: 'Finding',
						value: 'finding',
					},
				],
			},
			...findingOperations,
			...findingFields,
			...assessmentTargetOperations,
			...assessmentTargetFields,
		],
	};
}
