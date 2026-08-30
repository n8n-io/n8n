import { ChatOpenAI } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatOpenAiCodex } from '../LmChatOpenAiCodex/LmChatOpenAiCodex.node';

vi.mock('@n8n/ai-utilities', () => ({
	N8nLlmTracing: vi.fn(function () {}),
	makeN8nLlmFailedAttemptHandler: vi.fn(),
	getConnectionHintNoticeField: vi.fn(() => ({})),
	getProxyAgent: vi.fn(() => undefined),
}));

const CONNECTED_CREDENTIAL = {
	accessToken: 'codex-access-token',
	accountId: 'acc_1',
	url: 'https://chatgpt.com/backend-api/codex',
};

describe('LmChatOpenAiCodex', () => {
	const node = new LmChatOpenAiCodex();

	const mockNode: INode = {
		id: '1',
		name: 'OpenAI Codex Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatOpenAiCodex',
		position: [0, 0],
		parameters: {},
	};

	const setupContext = (
		credential: Record<string, unknown> = CONNECTED_CREDENTIAL,
		options: Record<string, unknown> = { maxRetries: 0 },
	) => {
		const context = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		context.getCredentials = vi.fn().mockResolvedValue(credential);
		context.getNode = vi.fn().mockReturnValue(mockNode);
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'gpt-5.6-sol';
			if (name === 'options') return options;
			return undefined;
		});
		return context;
	};

	it('targets the Codex endpoint with the Responses API', async () => {
		const { response } = await node.supplyData.call(setupContext(), 0);
		const model = response as ChatOpenAI;

		expect(model).toBeInstanceOf(ChatOpenAI);
		expect(model.useResponsesApi).toBe(true);
		expect(model.clientConfig.baseURL).toBe('https://chatgpt.com/backend-api/codex');
	});

	it('forces store:false, which the Codex endpoint rejects when true', async () => {
		const { response } = await node.supplyData.call(setupContext(), 0);

		expect((response as ChatOpenAI).modelKwargs).toMatchObject({ store: false });
	});

	it('sends the identity headers Codex requires', async () => {
		const { response } = await node.supplyData.call(setupContext(), 0);
		const headers = (response as ChatOpenAI).clientConfig.defaultHeaders as Record<string, string>;

		expect(headers['chatgpt-account-id']).toBe('acc_1');
		// An unrecognized originator is answered with 403.
		expect(headers.originator).toBe('codex_cli_rs');
		expect(headers['OpenAI-Beta']).toBe('responses=experimental');
	});

	it('sends the residency header only when the workspace enforces one', async () => {
		const without = await node.supplyData.call(setupContext(), 0);
		expect(
			(without.response as ChatOpenAI).clientConfig.defaultHeaders as Record<string, string>,
		).not.toHaveProperty('x-openai-internal-codex-residency');

		const withResidency = await node.supplyData.call(
			setupContext({ ...CONNECTED_CREDENTIAL, residency: 'us' }),
			0,
		);
		expect(
			(withResidency.response as ChatOpenAI).clientConfig.defaultHeaders as Record<string, string>,
		).toMatchObject({ 'x-openai-internal-codex-residency': 'us' });
	});

	it('uses the access token as the bearer credential', async () => {
		const { response } = await node.supplyData.call(setupContext(), 0);

		expect((response as ChatOpenAI).apiKey).toBe('codex-access-token');
	});

	it('passes reasoning effort through, as Codex models are reasoning models', async () => {
		const { response } = await node.supplyData.call(
			setupContext(CONNECTED_CREDENTIAL, { maxRetries: 0, reasoningEffort: 'high' }),
			0,
		);

		expect((response as ChatOpenAI).modelKwargs).toMatchObject({ reasoning_effort: 'high' });
	});

	it('ignores an unrecognized reasoning effort rather than forwarding it', async () => {
		const { response } = await node.supplyData.call(
			setupContext(CONNECTED_CREDENTIAL, { maxRetries: 0, reasoningEffort: 'nonsense' }),
			0,
		);

		expect((response as ChatOpenAI).modelKwargs).not.toHaveProperty('reasoning_effort');
	});

	it('tells the user to sign in when the credential is not connected', async () => {
		await expect(node.supplyData.call(setupContext({ url: 'https://x' }), 0)).rejects.toThrow(
			/not connected yet/,
		);
	});
});
