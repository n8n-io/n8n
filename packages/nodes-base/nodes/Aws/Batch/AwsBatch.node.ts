import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { job, jobQueue } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsBatch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Batch',
		name: 'awsBatch',
		icon: 'file:batch.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Batch',
		defaults: { name: 'AWS Batch' },
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
				default: 'job',
				options: [
					{
						name: 'Job',
						value: 'job',
					},
					{
						name: 'Job Queue',
						value: 'jobQueue',
					},
				],
			},
			...job.description,
			...jobQueue.description,
		],
	};
}
