/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import type { BaseChatMemory } from 'langchain/memory';
import type { SerializedConstructor } from 'langchain/dist/load/serializable';

function simplifyMessage(message: SerializedConstructor) {
	return {
		sender: message.id[message.id.length - 1],
		text: message.kwargs.content,
	};
}
export class MemoryChatRetriever implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Messages Retriever',
		name: 'memoryChatRetriever',
		icon: 'fa:database',
		group: ['transform'],
		version: 1,
		description: 'Retrieve chat messages from memory and use them in the workflow',
		defaults: {
			name: 'Memory Chat Retriever',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			'main',
			{
				displayName: 'Memory',
				maxConnections: 1,
				type: 'memory',
				required: true,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main'],
		properties: [
			{
				displayName: 'Simplify Output',
				name: 'simplifyOutput',
				type: 'boolean',
				description: 'Whether to simplify the output to only include the sender and the text',
				default: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Chat Memory Retriever');

		const memory = (await this.getInputConnectionData('memory', 0)) as BaseChatMemory | undefined;
		const simplifyOutput = this.getNodeParameter('simplifyOutput', 0) as boolean;

		const messages = await memory?.chatHistory.getMessages();

		const serializedMessages =
			messages?.map((message) => {
				const serializedMessage = message.toJSON();
				if (simplifyOutput)
					return { json: simplifyMessage(serializedMessage as SerializedConstructor) };

				return { json: serializedMessage as unknown as IDataObject };
			}) ?? [];

		return this.prepareOutputData(serializedMessages);
	}
}
