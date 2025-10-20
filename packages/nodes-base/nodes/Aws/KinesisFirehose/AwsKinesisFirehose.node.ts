import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { deliveryStream } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsKinesisFirehose implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Kinesis Firehose',
		name: 'awsKinesisFirehose',
		icon: 'file:kinesisfirehose.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Kinesis Firehose',
		defaults: { name: 'AWS Kinesis Firehose' },
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
				default: 'deliveryStream',
				options: [
					{
						name: 'Delivery Stream',
						value: 'deliveryStream',
					},
				],
			},
			...deliveryStream.description,
		],
	};
}
