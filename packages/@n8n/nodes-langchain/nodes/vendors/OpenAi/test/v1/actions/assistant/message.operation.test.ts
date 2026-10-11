/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { aiClientFetch } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import {
	type IExecuteFunctions,
	type INode,
	NodeOperationError,
	OperationalError,
} from 'n8n-workflow';
import { AgentExecutor } from '@langchain/classic/agents';
import { OpenAI as OpenAIClient } from 'openai';
import type { Mocked } from 'vitest';

import * as messageOperation from '../../../../v1/actions/assistant/message.operation';

vi.mock('openai');
vi.mock('@n8n/ai-utilities');

vi.mock('@langchain/classic/experimental/openai_assistant', () => ({
	OpenAIAssistantRunnable: vi.fn(),
}));

vi.mock('@langchain/classic/agents', () => ({
	AgentExecutor: {
		fromAgentAndTools: vi.fn().mockReturnValue({
			withConfig: vi.fn().mockReturnValue({
				invoke: vi.fn().mockResolvedValue({ output: 'ok' }),
			}),
		}),
	},
}));

vi.mock('@utils/helpers', async () => {
	const actual = await vi.importActual('@utils/helpers');
	return {
		...actual,
		getConnectedTools: vi.fn().mockResolvedValue([]),
		getPromptInputByType: vi.fn().mockReturnValue('Hello'),
	};
});

vi.mock('@utils/tracing', () => ({
	getTracingConfig: vi.fn().mockReturnValue({}),
}));

const MockedOpenAIClient = vi.mocked(OpenAIClient);
const mockedAiClientFetch = vi.mocked(aiClientFetch);

describe('OpenAI assistant message operation', () => {
	const mockNodeDef: INode = {
		id: '1',
		name: 'OpenAI',
		typeVersion: 1.5,
		type: '@n8n/n8n-nodes-langchain.openAi',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		const ctx = createMockExecuteFunction<IExecuteFunctions>(
			{},
			mockNodeDef,
		) as Mocked<IExecuteFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-openai-key',
			url: 'https://api.openai.com/v1',
		});
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.getExecutionCancelSignal = vi.fn().mockReturnValue(undefined);
		ctx.getInputConnectionData = vi.fn().mockResolvedValue(undefined);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'assistantId') return 'asst_1';
			if (paramName === 'options') return {};
			return undefined;
		});
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue({});
		return ctx;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should wire the bounded aiClientFetch into the OpenAI client', async () => {
		const ctx = setupMockContext();

		await messageOperation.execute.call(ctx, 0);

		expect(ctx.getCredentials).toHaveBeenCalledWith('openAiApi');
		expect(MockedOpenAIClient).toHaveBeenCalledWith(
			expect.objectContaining({
				apiKey: 'test-openai-key',
				fetch: mockedAiClientFetch,
			}),
		);
	});

	it('surfaces an OperationalError from the run as a NodeOperationError', async () => {
		const ctx = setupMockContext();
		vi.mocked(AgentExecutor.fromAgentAndTools).mockReturnValueOnce({
			withConfig: vi.fn().mockReturnValue({
				invoke: vi
					.fn()
					.mockRejectedValue(
						new OperationalError('Response body exceeded the maximum allowed size of 10 bytes'),
					),
			}),
		} as never);

		await expect(messageOperation.execute.call(ctx, 0)).rejects.toBeInstanceOf(NodeOperationError);
	});
});
