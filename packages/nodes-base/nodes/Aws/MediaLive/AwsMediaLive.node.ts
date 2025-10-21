import type {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { channelOperations, channelFields, inputOperations, inputFields } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsMediaLive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS MediaLive',
		name: 'awsMediaLive',
		icon: 'file:medialive.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with AWS MediaLive',
		defaults: {
			name: 'AWS MediaLive',
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
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Input',
						value: 'input',
					},
				],
				default: 'channel',
			},
			...channelOperations,
			...channelFields,
			...inputOperations,
			...inputFields,
		],
	};
}
