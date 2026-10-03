import { proxyFetch } from '@n8n/ai-utilities';
import { createResultOk } from '@n8n/utils/result';
import type { INode, ISupplyDataFunctions, NodeEgressFilter } from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { LmChatOllama } from '../LmChatOllama.node';

vi.mock('@n8n/ai-utilities', async () => {
	const actual = await vi.importActual('@n8n/ai-utilities');
	return {
		...(actual as Record<string, unknown>),
		proxyFetch: vi.fn(),
	};
});

const mockedProxyFetch = proxyFetch as MockedFunction<typeof proxyFetch>;

const nodeDef: INode = {
	id: '1',
	name: 'Ollama Chat Model',
	typeVersion: 1,
	type: 'n8n-nodes-langchain.lmChatOllama',
	position: [0, 0],
	parameters: {},
};

/** A complete, non-streaming Ollama `/api/chat` response. */
const ollamaResponse = {
	model: 'llama3',
	created_at: '2026-01-01T00:00:00.000Z',
	message: { role: 'assistant', content: 'pong' },
	done: true,
	done_reason: 'stop',
	total_duration: 1,
	load_duration: 1,
	prompt_eval_count: 1,
	prompt_eval_duration: 1,
	eval_count: 1,
	eval_duration: 1,
};

const egressFilter: NodeEgressFilter = {
	validateUrl: vi.fn().mockResolvedValue(createResultOk(undefined)),
	validateConnectionHost: vi.fn().mockReturnValue(createResultOk(undefined)),
	createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
	validateRedirectSync: vi.fn(),
};

function setupContext(options: Record<string, unknown>) {
	const ctx = mockDeep<ISupplyDataFunctions>();
	ctx.getNode.mockReturnValue(nodeDef);
	ctx.getCredentials.mockResolvedValue({ baseUrl: 'http://ollama.example.com:11434' });
	ctx.getNodeParameter.mockImplementation((name: string) => {
		if (name === 'model') return 'llama3';
		if (name === 'options') return options;
		return undefined;
	});
	ctx.helpers.getSecureEgressFilter.mockReturnValue(egressFilter);
	return ctx;
}

/** Reads `stream` out of the JSON body that was sent to Ollama. */
function sentStreamFlag(): unknown {
	const call = mockedProxyFetch.mock.calls.at(-1);
	if (!call) throw new Error('no request was sent');

	const { init } = call[0];
	if (typeof init?.body !== 'string') throw new Error('request body was not a JSON string');

	return (JSON.parse(init.body) as { stream?: unknown }).stream;
}

describe('LmChatOllama streaming', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedProxyFetch.mockResolvedValue(
			new Response(JSON.stringify(ollamaResponse), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			}),
		);
	});

	describe('with Streaming disabled', () => {
		it('sends stream: false to Ollama and returns the full response', async () => {
			const node = new LmChatOllama();
			const { response } = await node.supplyData.call(setupContext({ streaming: false }), 0);
			const model = response as unknown as {
				invoke: (input: string) => Promise<{ content: string }>;
			};

			const result = await model.invoke('ping');

			expect(sentStreamFlag()).toBe(false);
			expect(result.content).toBe('pong');
		});

		it('preserves tool calls from the non-streaming response', async () => {
			mockedProxyFetch.mockResolvedValue(
				new Response(
					JSON.stringify({
						...ollamaResponse,
						message: {
							role: 'assistant',
							content: '',
							tool_calls: [
								{
									function: { name: 'getWeather', arguments: { city: 'Berlin' } },
								},
							],
						},
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);

			const node = new LmChatOllama();
			const { response } = await node.supplyData.call(setupContext({ streaming: false }), 0);
			const model = response as unknown as {
				invoke: (input: string) => Promise<{ tool_calls?: unknown[] }>;
			};

			const result = await model.invoke('What is the weather in Berlin?');

			expect(sentStreamFlag()).toBe(false);
			expect(result.tool_calls).toHaveLength(1);
			expect(result.tool_calls?.[0]).toMatchObject({
				name: 'getWeather',
				args: { city: 'Berlin' },
			});
		});

		it('preserves thinking output as reasoning content', async () => {
			mockedProxyFetch.mockResolvedValue(
				new Response(
					JSON.stringify({
						...ollamaResponse,
						message: { role: 'assistant', content: 'pong', thinking: 'let me check' },
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);

			const node = new LmChatOllama();
			const { response } = await node.supplyData.call(setupContext({ streaming: false }), 0);
			const model = response as unknown as {
				invoke: (input: string) => Promise<{
					content: string;
					additional_kwargs?: { reasoning_content?: string };
				}>;
			};

			const result = await model.invoke('ping');

			expect(sentStreamFlag()).toBe(false);
			expect(result.content).toBe('pong');
			expect(result.additional_kwargs?.reasoning_content).toBe('let me check');
		});
	});

	describe('with Streaming enabled', () => {
		it('sends stream: true to Ollama', async () => {
			const node = new LmChatOllama();
			const { response } = await node.supplyData.call(setupContext({ streaming: true }), 0);
			const model = response as unknown as { invoke: (input: string) => Promise<unknown> };

			await model.invoke('ping');

			expect(sentStreamFlag()).toBe(true);
		});
	});

	describe('with Streaming untouched', () => {
		it('keeps the existing streaming behavior', async () => {
			const node = new LmChatOllama();
			const { response } = await node.supplyData.call(setupContext({}), 0);
			const model = response as unknown as { invoke: (input: string) => Promise<unknown> };

			await model.invoke('ping');

			expect(sentStreamFlag()).toBe(true);
		});
	});
});
