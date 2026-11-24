import type { INodeType, INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { supplyMemory, WindowedChatMemory } from '@n8n/ai-node-sdk';
import { InMemoryChatHistory } from './memory';

type MemoryOptions = {
	windowSize?: number;
};

export class ExampleChatMemory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Example Memory',
		name: 'exampleChatMemory',
		icon: { light: 'file:example.svg', dark: 'file:example.dark.svg' },
		group: ['transform'],
		version: [1],
		description: 'Store conversation history in memory',
		defaults: {
			name: 'Example Memory',
		},
		codex: {
			categories: ['assistant'],
			subcategories: {
				AI: ['Memory', 'Root Nodes'],
				Memory: ['Other memories'],
			},
			resources: {
				primaryDocumentation: [],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		credentials: [],
		properties: [
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{ $json.sessionId }}',
				description: 'Unique identifier for the conversation session',
				placeholder: 'user-123',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options for memory management',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Window Size',
						name: 'windowSize',
						type: 'number',
						default: 10,
						description: 'Number of recent message pairs to keep in context',
						typeOptions: {
							minValue: 1,
							maxValue: 100,
						},
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as MemoryOptions;

		// Create the in-memory chat history storage
		const history = new InMemoryChatHistory(sessionId);

		// Wrap with windowed memory to limit context size
		const memory = new WindowedChatMemory(history, {
			windowSize: options.windowSize ?? 10,
		});

		return supplyMemory(this, memory);
	}
}
