import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';
import { StructuredOutputParser } from '@langchain/classic/output_parsers';
import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { processItem } from '../processItem';

vi.mock('@utils/tracing', () => ({
	getTracingConfig: vi.fn(() => ({})),
}));

/** Replies with content-block arrays, the message shape the OpenAI Responses
 *  API and reasoning models produce (instead of plain string content). */
class ContentBlocksChatModel extends BaseChatModel {
	constructor(private readonly reply: string) {
		super({});
	}

	_llmType() {
		return 'content-blocks-fake';
	}

	async _generate(): Promise<ChatResult> {
		return {
			generations: [
				{
					message: new AIMessage({ content: [{ type: 'text', text: this.reply }] }),
					text: '',
				},
			],
		};
	}
}

describe('processItem with content-block model output', () => {
	it('parses the classification from array message content', async () => {
		const ctx = mock<IExecuteFunctions>();
		ctx.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
			if (param === 'inputText') return 'My invoice was charged twice, please refund';
			return defaultValue;
		});

		const categories = [
			{ category: 'Billing', description: 'Payments and refunds' },
			{ category: 'Technical', description: 'Bugs and errors' },
		];
		const parser = StructuredOutputParser.fromZodSchema(
			z.object({ Billing: z.boolean(), Technical: z.boolean() }),
		);
		const llm = new ContentBlocksChatModel('```json\n{"Billing":true,"Technical":false}\n```');

		const output = await processItem(
			ctx,
			0,
			{ json: {} },
			llm,
			parser,
			categories,
			'Categories are mutually exclusive, and only one can be true',
			undefined,
		);

		expect(output).toEqual({ Billing: true, Technical: false });
	});
});
