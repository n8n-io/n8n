import type { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { proxyFetch } from '@n8n/ai-utilities';
import { createResultOk } from '@n8n/utils/result';
import type {
	IExecuteSingleFunctions,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
	NodeEgressFilter,
	PostReceiveAction,
} from 'n8n-workflow';
import { OperationalError, UserError } from '@n8n/errors';
import { mockDeep } from 'vitest-mock-extended';

import { LmChatGoogleGemini } from '../LmChatGoogleGemini.node';

vi.mock('@n8n/ai-utilities', async () => {
	const actual = await vi.importActual('@n8n/ai-utilities');
	return {
		...(actual as Record<string, unknown>),
		proxyFetch: vi.fn(),
	};
});

const mockedProxyFetch = vi.mocked(proxyFetch);

const nodeDef: INode = {
	id: '1',
	name: 'Google Gemini Chat Model',
	typeVersion: 1.2,
	type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
	position: [0, 0],
	parameters: {},
};

describe('LmChatGoogleGemini', () => {
	it('should send every model field to the provider catalog with a Gemini 3.x floor', () => {
		const hints = new LmChatGoogleGemini().description.properties
			.filter((p) => p.name === 'modelName')
			.map((p) => p.builderHint?.propertyHint);

		expect(hints).toHaveLength(3);
		for (const hint of hints) {
			expect(hint).toContain('even with a connected credential');
			expect(hint).toContain('use current Google provider catalog information');
			expect(hint).toContain('Do not choose Gemini 2.x or older');
		}
	});

	it('should not name builder tools in the model hint', () => {
		const hints = new LmChatGoogleGemini().description.properties
			.filter((p) => p.name === 'modelName')
			.map((p) => p.builderHint?.propertyHint);

		for (const hint of hints) {
			expect(hint).not.toMatch(/searchModels|explore-resources|nodes\(/);
		}
	});

	it('should label, sort and pin models in every version', async () => {
		const modelProperties = new LmChatGoogleGemini().description.properties.filter(
			(p) => p.name === 'modelName',
		);
		const options: INodeExecutionData[] = [
			{
				json: {
					name: 'models/gemini-zeta',
					value: 'models/gemini-zeta',
					displayName: '',
					priority: '',
				},
			},
			{
				json: {
					name: 'models/gemini-featured',
					value: 'models/gemini-featured',
					displayName: 'Gemini Featured',
					priority: 10,
				},
			},
			{ json: { name: 'models/gemini-2.5-pro', value: 'models/gemini-2.5-pro' } },
			{
				json: {
					name: 'models/gemini-api-named',
					value: 'models/gemini-api-named',
					displayName: 'Gemini Api Named',
				},
			},
		];

		expect(modelProperties).toHaveLength(3);
		for (const property of modelProperties) {
			const postReceive = property.typeOptions?.loadOptions?.routing?.output
				?.postReceive as PostReceiveAction[];
			const labelModels = postReceive.at(-1);
			if (typeof labelModels !== 'function') throw new Error('Expected a postReceive function');

			const result = await labelModels.call({} as IExecuteSingleFunctions, options, {} as never);

			// The API's displayName labels a model, else its id. A priority pins a model.
			expect(result.map((option) => option.json)).toEqual([
				{ name: 'Gemini Featured', value: 'models/gemini-featured' },
				{ name: 'Gemini Api Named', value: 'models/gemini-api-named' },
				{ name: 'models/gemini-2.5-pro', value: 'models/gemini-2.5-pro' },
				{ name: 'models/gemini-zeta', value: 'models/gemini-zeta' },
			]);
		}
	});

	it('should leave the label of an option without a string value alone', async () => {
		const property = new LmChatGoogleGemini().description.properties.find(
			(p) => p.name === 'modelName',
		);
		const postReceive = property?.typeOptions?.loadOptions?.routing?.output
			?.postReceive as PostReceiveAction[];
		const labelModels = postReceive.at(-1);
		if (typeof labelModels !== 'function') throw new Error('Expected a postReceive function');

		const result = await labelModels.call(
			{} as IExecuteSingleFunctions,
			[{ json: { name: 'Unknown', value: 42, displayName: 'Ignored' } }],
			{} as never,
		);

		expect(result.map((option) => option.json)).toEqual([{ name: 'Unknown', value: 42 }]);
	});

	it('should send model requests through the egress filter', async () => {
		const egressFilter: NodeEgressFilter = {
			validateUrl: vi.fn().mockResolvedValue(createResultOk(undefined)),
			validateConnectionHost: vi.fn().mockReturnValue(createResultOk(undefined)),
			createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
			validateRedirectSync: vi.fn(),
		};
		const ctx = mockDeep<ISupplyDataFunctions>();
		ctx.getNode.mockReturnValue(nodeDef);
		ctx.getCredentials.mockResolvedValue({
			apiKey: 'test-key',
			host: 'https://gemini.example.com',
		});
		ctx.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'modelName') return 'models/gemini-2.5-flash';
			if (name === 'options') return {};
			return null;
		});
		ctx.helpers.getSecureEgressFilter.mockReturnValue(egressFilter);
		mockedProxyFetch.mockResolvedValue(
			new Response(
				JSON.stringify({
					candidates: [
						{ content: { role: 'model', parts: [{ text: 'hi' }] }, finishReason: 'STOP' },
					],
				}),
				{ status: 200 },
			),
		);

		const { response } = await new LmChatGoogleGemini().supplyData.call(ctx, 0);
		const result = await (response as ChatGoogleGenerativeAI).invoke('hello');

		expect(result.content).toBe('hi');
		expect(mockedProxyFetch).toHaveBeenCalledWith(
			expect.objectContaining({
				input: 'https://gemini.example.com/v1beta/models/gemini-2.5-flash:generateContent',
				egressFilter,
			}),
		);
	});

	describe('when Gemini returns no candidates', () => {
		const invokeWithResponse = async (body: object) => {
			const ctx = mockDeep<ISupplyDataFunctions>();
			ctx.getNode.mockReturnValue(nodeDef);
			ctx.getCredentials.mockResolvedValue({ apiKey: 'test-key', host: 'https://gemini.test' });
			ctx.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'modelName') return 'models/gemini-2.5-flash';
				if (name === 'options') return {};
				return null;
			});
			mockedProxyFetch.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

			const { response } = await new LmChatGoogleGemini().supplyData.call(ctx, 0);
			return await (response as ChatGoogleGenerativeAI).invoke('hello');
		};

		it('should throw the block reason', async () => {
			const error = await invokeWithResponse({
				promptFeedback: { blockReason: 'PROHIBITED_CONTENT', blockReasonMessage: 'Not allowed' },
			}).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(UserError);
			expect(error).toMatchObject({
				message: 'Gemini blocked the prompt (reason: PROHIBITED_CONTENT)',
				description: 'Not allowed',
			});
		});

		it('should throw an empty response error without a block reason', async () => {
			const error = await invokeWithResponse({ candidates: [] }).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(OperationalError);
			expect(error).toHaveProperty('message', 'Gemini returned an empty response');
		});

		it('should throw an empty response error when a stream has no candidates', async () => {
			const ctx = mockDeep<ISupplyDataFunctions>();
			ctx.getNode.mockReturnValue(nodeDef);
			ctx.getCredentials.mockResolvedValue({ apiKey: 'test-key', host: 'https://gemini.test' });
			ctx.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'modelName') return 'models/gemini-2.5-flash';
				if (name === 'options') return {};
				return null;
			});
			const event = JSON.stringify({ promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } });
			mockedProxyFetch.mockResolvedValue(new Response(`data: ${event}\n\n`, { status: 200 }));

			const { response } = await new LmChatGoogleGemini().supplyData.call(ctx, 0);
			const consume = async () => {
				for await (const _ of await (response as ChatGoogleGenerativeAI).stream('hello')) {
					// Drain the stream.
				}
			};
			const error = await consume().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(OperationalError);
			expect(error).toHaveProperty('message', 'Gemini returned an empty response');
		});
	});
});
