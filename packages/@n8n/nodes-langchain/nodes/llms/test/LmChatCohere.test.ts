import { HumanMessage } from '@langchain/core/messages';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatCohere } from '../LmChatCohere/LmChatCohere.node';

// Keep the real `@langchain/cohere` so the actual Cohere HTTP client runs and we can
// observe which chat endpoint it targets. Only stub the n8n tracing helpers.
vi.mock('@n8n/ai-utilities', () => ({
	// Regular function so it can be used as a constructor (`new N8nLlmTracing(...)`);
	// the callback handler itself can be a no-op object for this test.
	N8nLlmTracing: vi.fn(function () {}),
	makeN8nLlmFailedAttemptHandler: vi.fn(),
	getConnectionHintNoticeField: vi.fn(() => ({})),
}));

describe('LmChatCohere', () => {
	let lmChatCohere: LmChatCohere;

	const mockNode: INode = {
		id: '1',
		name: 'Cohere Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatCohere',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		const context = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		context.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
			url: 'https://api.cohere.com',
		});
		context.getNode = vi.fn().mockReturnValue(mockNode);
		context.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'command-a-03-2025';
			if (paramName === 'options') return { maxRetries: 0 };
			return undefined;
		});

		return context;
	};

	beforeEach(() => {
		lmChatCohere = new LmChatCohere();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should call the Cohere v2 chat endpoint when invoked', async () => {
		const context = setupMockContext();

		const requestedUrls: string[] = [];
		const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			requestedUrls.push(url);
			await Promise.resolve();
			// Minimal successful Cohere chat response so `.invoke()` resolves cleanly.
			return new Response(
				JSON.stringify({ text: 'hi', meta: { tokens: { inputTokens: 1, outputTokens: 1 } } }),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			);
		});
		vi.stubGlobal('fetch', fetchSpy);

		const { response } = await lmChatCohere.supplyData.call(context, 0);

		// `response` is the ChatCohere model instance; invoking it performs the real HTTP call.
		await (response as { invoke: (input: unknown) => Promise<unknown> }).invoke([
			new HumanMessage('hello'),
		]);

		const chatUrl = requestedUrls.find((url) => url.includes('/chat'));
		expect(chatUrl).toBeDefined();
		// Cohere requires `/v2/chat` for current models; `/v1/chat` returns a 400
		// "this model is not supported with '/v1/chat', please use '/v2/chat'".
		expect(new URL(chatUrl ?? '').pathname).toBe('/v2/chat');
	});
});
