import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	clusterOperations,
	clusterFields,
	clusterSnapshotOperations,
	clusterSnapshotFields,
} from './descriptions';

export class AwsAurora implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Aurora',
		name: 'awsAurora',
		icon: 'file:aurora.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Aurora',
		defaults: {
			name: 'AWS Aurora',
		},
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
				'Content-Type': 'application/x-www-form-urlencoded',
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
						name: 'Cluster',
						value: 'cluster',
					},
					{
						name: 'Cluster Snapshot',
						value: 'clusterSnapshot',
					},
				],
				default: 'cluster',
			},
			...clusterOperations,
			...clusterFields,
			...clusterSnapshotOperations,
			...clusterSnapshotFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}
