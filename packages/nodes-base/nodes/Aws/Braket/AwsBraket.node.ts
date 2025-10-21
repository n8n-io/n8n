import type {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { quantumTaskOperations, quantumTaskFields, deviceOperations, deviceFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsBraket implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Braket',
		name: 'awsBraket',
		icon: 'file:braket.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with AWS Braket (Quantum Computing)',
		defaults: {
			name: 'AWS Braket',
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
				'Content-Type': 'application/json',
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
						name: 'Quantum Task',
						value: 'quantumTask',
					},
					{
						name: 'Device',
						value: 'device',
					},
				],
				default: 'quantumTask',
			},
			...quantumTaskOperations,
			...quantumTaskFields,
			...deviceOperations,
			...deviceFields,
		],
	};
}
