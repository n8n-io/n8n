import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	fleetOperations,
	fleetFields,
	buildOperations,
	buildFields,
	gameSessionOperations,
	gameSessionFields,
} from './descriptions';

export class AwsGameLift implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS GameLift',
		name: 'awsGameLift',
		icon: 'file:gamelift.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS GameLift',
		defaults: {
			name: 'AWS GameLift',
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
				'Content-Type': 'application/x-amz-json-1.1',
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
						name: 'Build',
						value: 'build',
					},
					{
						name: 'Fleet',
						value: 'fleet',
					},
					{
						name: 'Game Session',
						value: 'gameSession',
					},
				],
				default: 'fleet',
			},
			...fleetOperations,
			...fleetFields,
			...buildOperations,
			...buildFields,
			...gameSessionOperations,
			...gameSessionFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}
