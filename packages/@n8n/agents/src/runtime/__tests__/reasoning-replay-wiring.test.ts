import type * as AiImport from 'ai';

import type { AgentMessage } from '../../types/sdk/message';
import { AgentRuntime } from '../loop/agent-runtime';
import { AgentEventBus } from '../state/event-bus';

const { mockGenerateText } = vi.hoisted(() => ({
	mockGenerateText: vi.fn<(call: Record<string, unknown>) => Promise<Record<string, unknown>>>(),
}));

vi.mock('ai', async () => {
	const actual = await vi.importActual<typeof AiImport>('ai');
	return {
		...actual,
		generateText: async (call: Record<string, unknown>) => {
			const result = await mockGenerateText(call);
			return { ...result, finalStep: { providerMetadata: undefined } };
		},
	};
});

const history: AgentMessage[] = [
	{ role: 'user', content: [{ type: 'text', text: 'First question' }] },
	{
		role: 'assistant',
		content: [
			{ type: 'reasoning', text: 'Earlier chain of thought' },
			{ type: 'text', text: 'First answer' },
		],
	},
	{ role: 'user', content: [{ type: 'text', text: 'Second question' }] },
];

async function sentAssistantParts(model: Record<string, unknown>) {
	mockGenerateText.mockResolvedValueOnce({
		finishReason: 'stop',
		usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
		responseMessages: [{ role: 'assistant', content: [{ type: 'text', text: 'OK' }] }],
		toolCalls: [],
	});
	await new AgentRuntime({
		name: 'replay-test',
		model: model as never,
		instructions: 'test',
		eventBus: new AgentEventBus(),
	}).generate(history);
	const messages = mockGenerateText.mock.calls.at(-1)?.[0].messages as Array<{
		role: string;
		content: Array<{ type: string }>;
	}>;
	return messages.find((message) => message.role === 'assistant')?.content.map((part) => part.type);
}

describe('reasoning replay wiring', () => {
	beforeEach(() => mockGenerateText.mockReset());

	it('replays metadata-less reasoning to custom OpenAI-compatible models', async () => {
		expect(
			await sentAssistantParts({
				id: 'custom/test-model',
				url: 'http://127.0.0.1:1/v1',
				apiKey: 'k',
			}),
		).toEqual(['reasoning', 'text']);
	});

	it('still drops metadata-less reasoning for other providers', async () => {
		expect(await sentAssistantParts({ id: 'openai/gpt-4o-mini', apiKey: 'k' })).toEqual(['text']);
	});
});
