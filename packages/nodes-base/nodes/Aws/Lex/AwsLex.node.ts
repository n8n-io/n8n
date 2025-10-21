import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import { botOperations, botFields, intentOperations, intentFields } from './descriptions';

export class AwsLex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Lex',
		name: 'awsLex',
		icon: 'file:lex.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Lex',
		defaults: {
			name: 'AWS Lex',
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
						name: 'Bot',
						value: 'bot',
					},
					{
						name: 'Intent',
						value: 'intent',
					},
				],
				default: 'bot',
			},
			...botOperations,
			...botFields,
			...intentOperations,
			...intentFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}
