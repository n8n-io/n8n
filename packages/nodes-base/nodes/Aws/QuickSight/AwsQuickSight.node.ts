import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	dashboardOperations,
	dashboardFields,
	dataSetOperations,
	dataSetFields,
	analysisOperations,
	analysisFields,
} from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsQuickSight implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS QuickSight',
		name: 'awsQuickSight',
		icon: 'file:quicksight.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS QuickSight',
		defaults: { name: 'AWS QuickSight' },
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
				default: 'dashboard',
				options: [
					{
						name: 'Analysis',
						value: 'analysis',
					},
					{
						name: 'Dashboard',
						value: 'dashboard',
					},
					{
						name: 'Data Set',
						value: 'dataSet',
					},
				],
			},
			...dashboardOperations,
			...dashboardFields,
			...dataSetOperations,
			...dataSetFields,
			...analysisOperations,
			...analysisFields,
		],
	};
}
