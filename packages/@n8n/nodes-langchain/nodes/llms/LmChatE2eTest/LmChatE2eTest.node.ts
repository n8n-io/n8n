import {
	BaseChatModel,
	type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { ChatMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';
import {
	type ISupplyDataFunctions,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { N8nLlmTracing } from '../N8nLlmTracing';

class E2eTestModel extends BaseChatModel<{}> {
	constructor(
		private response: string,
		fields: BaseChatModelParams,
	) {
		super(fields);
	}

	_llmType(): string {
		return 'e2e';
	}

	async _generate(): Promise<ChatResult> {
		return {
			generations: [
				{
					message: new ChatMessage(this.response, 'assistant'),
					text: this.response,
				},
			],
			llmOutput: {
				tokenUsage: {
					promptTokens: 10,
					completionTokens: 20,
					totalTokens: 30,
				},
			},
		};
	}

	bindTools() {
		return this;
	}
}

export class LmChatE2eTest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E2E Testing Chat Model',
		name: 'lmChatE2eTest',
		icon: { light: 'file:e2e.svg', dark: 'file:e2e.svg' },
		group: ['transform'],
		version: [1],
		description: 'For e2e testing',
		defaults: {
			name: 'E2E Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [],
		requestDefaults: {},
		properties: [
			{
				displayName: 'Response',
				name: 'response',
				type: 'string',
				default: 'Hello from e2e model!',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const response = this.getNodeParameter('response', itemIndex) as string;

		return {
			response: new E2eTestModel(response, {
				callbacks: [new N8nLlmTracing(this)],
			}),
		};
	}
}
