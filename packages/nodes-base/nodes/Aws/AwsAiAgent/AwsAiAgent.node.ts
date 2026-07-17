import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { awsNodeAuthOptions, awsNodeCredentials } from '../utils';

export class AwsAiAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS AI Agent',
		name: 'awsAiAgent',
		icon: 'file:bedrock.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["region"]}}',
		description:
			'Invoke an AI agent deployed on AWS Bedrock AgentCore Runtime as a step in a workflow',
		defaults: {
			name: 'AWS AI Agent',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: awsNodeCredentials,
		properties: [
			awsNodeAuthOptions,
			{
				displayName: 'Input',
				name: 'input',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '={{ $json.chatInput }}',
				description: 'The prompt or messages to send to the agent',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			const input = this.getNodeParameter('input', i, '') as string;
			returnData.push({
				response: `Simulated agent response to: ${input}`,
			});
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
