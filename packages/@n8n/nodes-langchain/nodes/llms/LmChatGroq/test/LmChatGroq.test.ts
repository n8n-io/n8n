/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatGroq } from '@langchain/groq';
import {
	getNodeProxyAgent,
	getProxyAgent,
	makeN8nLlmFailedAttemptHandler,
} from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatGroq } from '../LmChatGroq.node';

vi.mock('@langchain/groq');
vi.mock('@n8n/ai-utilities');

const MockedChatGroq = vi.mocked(ChatGroq);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetNodeProxyAgent = vi.mocked(getNodeProxyAgent);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);

describe('LmChatGroq', () => {
	let node: LmChatGroq;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Groq Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatGroq',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-groq-key' });
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'llama3-8b-8192';
			if (paramName === 'options') return {};
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatGroq();
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		// groq-sdk hands `httpAgent` straight to node-fetch's `agent` option, which requires a Node
		// http(s).Agent — an undici Agent/ProxyAgent (from getProxyAgent) throws a TypeError there.
		it('should build the http agent with getNodeProxyAgent, not getProxyAgent', async () => {
			const ctx = setupMockContext();
			const nodeAgent = { fake: 'node-agent' };
			mockedGetNodeProxyAgent.mockReturnValue(nodeAgent as never);

			await node.supplyData.call(ctx, 0);

			expect(mockedGetNodeProxyAgent).toHaveBeenCalledWith('https://api.groq.com/openai/v1');
			expect(mockedGetProxyAgent).not.toHaveBeenCalled();
			expect(MockedChatGroq).toHaveBeenCalledWith(
				expect.objectContaining({ httpAgent: nodeAgent }),
			);
		});

		it('should create ChatGroq with credentials and node parameters', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('groqApi');
			expect(MockedChatGroq).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-groq-key',
					model: 'llama3-8b-8192',
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should pass options to ChatGroq', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'llama-3.3-70b-versatile';
				if (paramName === 'options') return { maxTokensToSample: 2048, temperature: 0.3 };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatGroq).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'llama-3.3-70b-versatile',
					maxTokens: 2048,
					temperature: 0.3,
				}),
			);
		});
	});
});
