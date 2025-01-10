/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { Node, NodeConnectionType, WAIT_INDEFINITELY } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';

export class Chat extends Node {
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

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const manualTriggerFunction = async () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		return {
			manualTriggerFunction,
		};
	}

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		context.sendChatMessage(context.getNodeParameter('message', 0) as string);

		await context.putExecutionToWait(WAIT_INDEFINITELY);
		return [context.getInputData()];
	}
}
