/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { BINARY_ENCODING, NodeConnectionType, WAIT_INDEFINITELY } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	IDataObject,
	IBinaryKeyData,
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

	async onMessage(context: IExecuteFunctions, data: IDataObject): Promise<INodeExecutionData[][]> {
		const { sessionId, action, chatInput, files } = data;
		const binary: IBinaryKeyData = {};

		if (files) {
			for (const [index, file] of (files as IDataObject[]).entries()) {
				const base64 = file.data as string;
				const buffer = Buffer.from(base64, BINARY_ENCODING);
				const binaryData = await context.helpers.prepareBinaryData(
					buffer,
					file.name as string,
					file.type as string,
				);

				binary[`data_${index}`] = binaryData;
			}
		}

		const returnData: INodeExecutionData = { json: { sessionId, action, chatInput } };
		if (Object.keys(binary).length > 0) {
			returnData.binary = binary;
		}
		return [[returnData]];
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.sendChatMessage(this.getNodeParameter('message', 0) as string);

		await this.putExecutionToWait(WAIT_INDEFINITELY);
		return [this.getInputData()];
	}
}
