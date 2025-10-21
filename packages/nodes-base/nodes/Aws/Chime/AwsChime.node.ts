import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	meetingOperations,
	meetingFields,
	attendeeOperations,
	attendeeFields,
} from './descriptions';

export class AwsChime implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Chime',
		name: 'awsChime',
		icon: 'file:chime.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Chime',
		defaults: {
			name: 'AWS Chime',
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
						name: 'Attendee',
						value: 'attendee',
					},
					{
						name: 'Meeting',
						value: 'meeting',
					},
				],
				default: 'meeting',
			},
			...meetingOperations,
			...meetingFields,
			...attendeeOperations,
			...attendeeFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}
