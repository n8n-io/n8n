/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { NodeConnectionType, WAIT_INDEFINITELY } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	IDataObject,
} from 'n8n-workflow';

export class Chat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to Chat and Wait for Response',
		name: 'chat',
		icon: 'fa:comments',
		iconColor: 'black',
		group: ['input'],
		version: 1,
		description: 'Respond to Chat and Wait for Response',
		defaults: {
			name: 'Respond to Chat and Wait for Response',
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
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
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
		],
	};

	async onMessage(_context: IExecuteFunctions, data: IDataObject): Promise<INodeExecutionData[][]> {
		return [[{ json: data }]];
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.sendChatMessage(this.getNodeParameter('message', 0) as string);

		await this.putExecutionToWait(WAIT_INDEFINITELY);
		return [this.getInputData()];
	}
}
