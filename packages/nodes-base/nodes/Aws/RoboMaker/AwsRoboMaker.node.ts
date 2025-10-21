import type {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { robotApplicationOperations, robotApplicationFields, simulationOperations, simulationFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsRoboMaker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS RoboMaker',
		name: 'awsRoboMaker',
		icon: 'file:robomaker.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with AWS RoboMaker',
		defaults: {
			name: 'AWS RoboMaker',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			headers: {
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
						name: 'Robot Application',
						value: 'robotApplication',
					},
					{
						name: 'Simulation',
						value: 'simulation',
					},
				],
				default: 'robotApplication',
			},
			...robotApplicationOperations,
			...robotApplicationFields,
			...simulationOperations,
			...simulationFields,
		],
	};
}
