/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/**
 * Integration-style tests that exercise the *real* `@langchain/anthropic`
 * package (no module mock) and assert on the exact request body LangChain
 * would send to `api.anthropic.com/v1/messages` via `model.invocationParams()`.
 *
 * The companion file `LmChatAnthropic.test.ts` mocks `@langchain/anthropic`
 * and only proves the constructor receives the right args. That leaves a gap:
 * we never observe what LangChain serialises after our `invocationKwargs`
 * spread is applied. These tests close that gap by inspecting the actual
 * request body shape — including that `output_config` lands at the top level
 * and that `temperature` / `top_k` / `top_p` are dropped from the JSON when
 * targeting Claude Opus 4.7+.
 */
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatAnthropic } from '../LmChatAnthropic.node';

jest.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: jest
		.fn()
		.mockReturnValue({ displayName: '', name: 'notice', type: 'notice', default: '' }),
	makeN8nLlmFailedAttemptHandler: jest.fn().mockReturnValue(jest.fn()),
	N8nLlmTracing: jest.fn().mockImplementation(() => ({})),
	getProxyAgent: jest.fn().mockReturnValue({}),
}));

describe('LmChatAnthropic — outgoing request body', () => {
	const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
	const mockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
	const mockedGetProxyAgent = jest.mocked(getProxyAgent);

	const setup = (modelId: string, options: Record<string, unknown>) => {
		const node: INode = {
			id: '1',
			name: 'Anthropic Chat Model',
			typeVersion: 1.4,
			type: 'n8n-nodes-langchain.lmChatAnthropic',
			position: [0, 0],
			parameters: {},
		};
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			node,
		) as jest.Mocked<ISupplyDataFunctions>;
		ctx.getCredentials = jest.fn().mockResolvedValue({ apiKey: 'test-api-key' });
		ctx.getNode = jest.fn().mockReturnValue(node);
		ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model.value') return modelId;
			if (paramName === 'options') return options;
			return undefined;
		});
		mockedN8nLlmTracing.mockImplementation(() => ({}) as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetProxyAgent.mockReturnValue({} as ReturnType<typeof getProxyAgent>);
		return ctx;
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('sends adaptive thinking + effort at top level for Claude Opus 4.7', async () => {
		const node = new LmChatAnthropic();
		const ctx = setup('claude-opus-4-7', {
			thinking: true,
			thinkingBudget: 8000,
			maxTokensToSample: 16000,
		});

		const { response } = await node.supplyData.call(ctx, 0);
		const params = (
			response as { invocationParams: () => Record<string, unknown> }
		).invocationParams();

		expect(params.model).toBe('claude-opus-4-7');
		expect(params.thinking).toEqual({ type: 'adaptive' });
		expect(params.output_config).toEqual({ effort: 'medium' });
		expect(params.max_tokens).toBe(16000);

		const wireBody = JSON.parse(JSON.stringify(params)) as Record<string, unknown>;
		expect(wireBody).not.toHaveProperty('temperature');
		expect(wireBody).not.toHaveProperty('top_k');
		expect(wireBody).not.toHaveProperty('top_p');
		expect(wireBody).not.toHaveProperty('budget_tokens');
	});

	it('sends legacy thinking with budget_tokens for Claude Sonnet 4.6', async () => {
		const node = new LmChatAnthropic();
		const ctx = setup('claude-sonnet-4-6', {
			thinking: true,
			thinkingBudget: 8000,
			maxTokensToSample: 16000,
		});

		const { response } = await node.supplyData.call(ctx, 0);
		const params = (
			response as { invocationParams: () => Record<string, unknown> }
		).invocationParams();

		expect(params.model).toBe('claude-sonnet-4-6');
		expect(params.thinking).toEqual({ type: 'enabled', budget_tokens: 8000 });
		expect(params.max_tokens).toBe(16000);
		expect(params).not.toHaveProperty('output_config');

		const wireBody = JSON.parse(JSON.stringify(params)) as Record<string, unknown>;
		expect(wireBody).not.toHaveProperty('temperature');
		expect(wireBody).not.toHaveProperty('top_k');
		expect(wireBody).not.toHaveProperty('top_p');
	});

	it('drops sampling params for Claude Opus 4.7 even when thinking is disabled', async () => {
		const node = new LmChatAnthropic();
		const ctx = setup('claude-opus-4-7', {
			thinking: false,
			temperature: 0.8,
			topK: 40,
			topP: 0.9,
		});

		const { response } = await node.supplyData.call(ctx, 0);
		const params = (
			response as { invocationParams: () => Record<string, unknown> }
		).invocationParams();

		const wireBody = JSON.parse(JSON.stringify(params)) as Record<string, unknown>;
		expect(wireBody).not.toHaveProperty('temperature');
		expect(wireBody).not.toHaveProperty('top_k');
		expect(wireBody).not.toHaveProperty('top_p');
		expect(wireBody).not.toHaveProperty('output_config');
		// Anthropic accepts thinking: { type: "disabled" } as the legacy "off" marker; harmless on 4.7.
		expect((wireBody.thinking as { type?: string } | undefined)?.type ?? 'disabled').toBe(
			'disabled',
		);
	});

	it('keeps user sampling params for Claude Sonnet 4.6 when thinking is disabled', async () => {
		const node = new LmChatAnthropic();
		const ctx = setup('claude-sonnet-4-6', {
			thinking: false,
			temperature: 0.8,
			topK: 40,
			topP: 0.9,
		});

		const { response } = await node.supplyData.call(ctx, 0);
		const params = (
			response as { invocationParams: () => Record<string, unknown> }
		).invocationParams();

		expect(params.temperature).toBe(0.8);
		expect(params.top_k).toBe(40);
		expect(params.top_p).toBe(0.9);
	});
});
