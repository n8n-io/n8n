/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { NodeConnectionTypes, WAIT_INDEFINITELY } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
} from 'n8n-workflow';

export class Chat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to Chat',
		name: 'chat',
		icon: 'fa:comments',
		iconColor: 'black',
		group: ['input'],
		version: 1,
		description: 'Send a message to a chat',
		defaults: {
			name: 'Respond to Chat',
		},
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chat/',
					},
				],
			},
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Wait Response From Chat',
						name: 'waitResponseFromChat',
						type: 'boolean',
						default: true,
					},
				],
			},
		],
	};

	async onMessage(
		context: IExecuteFunctions,
		data: INodeExecutionData,
	): Promise<INodeExecutionData[][]> {
		const options = context.getNodeParameter('options', 0, {}) as {
			waitResponseFromChat?: boolean;
		};

		if (options.waitResponseFromChat === false) {
			const inputData = context.getInputData();
			return [inputData];
		}
		return [[data]];
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const message = this.getNodeParameter('message', 0) as string;

		await this.putExecutionToWait(WAIT_INDEFINITELY);
		return [[{ json: {}, sendMessage: message }]];
	}
}
