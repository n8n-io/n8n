import * as aiModule from 'ai';
import type { Mock } from 'vitest';

import { Agent } from '../agent';

vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: () => () => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v3' }),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AiImport = typeof import('ai');

vi.mock('ai', async () => {
	const actual = await vi.importActual<AiImport>('ai');
	return {
		...actual,
		generateText: vi.fn(),
	};
});

const { generateText } = aiModule as unknown as {
	generateText: Mock;
};

function makeGenerateSuccess(text: string) {
	return {
		finishReason: 'stop',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'text', text }],
				},
			],
		},
		toolCalls: [],
	};
}

describe('Agent isolated runtimes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('keeps result state bound to the runtime that produced it', async () => {
		generateText
			.mockResolvedValueOnce(makeGenerateSuccess('first response'))
			.mockResolvedValueOnce(makeGenerateSuccess('second response'));
		const agent = new Agent('agent').model('openai/gpt-4o-mini').instructions('test');

		const first = await agent.generate('first');
		const second = await agent.generate('second');

		expect(first.getState().messageList.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					content: expect.arrayContaining([expect.objectContaining({ text: 'first response' })]),
				}),
			]),
		);
		expect(second.getState().messageList.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					content: expect.arrayContaining([expect.objectContaining({ text: 'second response' })]),
				}),
			]),
		);
	});
});
