/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { aiClientFetch } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { OpenAI as OpenAIClient } from 'openai';
import type { Mocked } from 'vitest';

import { OpenAiAssistant } from '../OpenAiAssistant.node';

vi.mock('openai');
vi.mock('@n8n/ai-utilities');

vi.mock('@langchain/classic/experimental/openai_assistant', () => ({
	OpenAIAssistantRunnable: {
		createAssistant: vi.fn().mockResolvedValue({}),
	},
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
	};
});

vi.mock('@utils/tracing', () => ({
	getTracingConfig: vi.fn().mockReturnValue({}),
}));

const MockedOpenAIClient = vi.mocked(OpenAIClient);
const mockedAiClientFetch = vi.mocked(aiClientFetch);

describe('OpenAiAssistant', () => {
	let node: OpenAiAssistant;

	const mockNodeDef: INode = {
		id: '1',
		name: 'OpenAI Assistant',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.openAiAssistant',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		const ctx = createMockExecuteFunction<IExecuteFunctions>(
			{},
			mockNodeDef,
		) as Mocked<IExecuteFunctions>;

		ctx.getInputData = vi.fn().mockReturnValue([{ json: {} }]);
		ctx.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-openai-key' });
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.continueOnFail = vi.fn().mockReturnValue(false);
		ctx.getExecutionCancelSignal = vi.fn().mockReturnValue(undefined);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'text') return 'Hello';
			if (paramName === 'assistantId') return '';
			if (paramName === 'nativeTools') return [];
			if (paramName === 'options') return {};
			if (paramName === 'name') return 'Test Assistant';
			if (paramName === 'instructions') return 'Be helpful';
			if (paramName === 'model') return 'gpt-4o';
			return undefined;
		});
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue({});
		return ctx;
	};

	beforeEach(() => {
		node = new OpenAiAssistant();
		vi.clearAllMocks();
	});

	describe('execute', () => {
		it('should wire the bounded aiClientFetch into the OpenAI client', async () => {
			const ctx = setupMockContext();

			await node.execute.call(ctx);

			expect(ctx.getCredentials).toHaveBeenCalledWith('openAiApi');
			expect(MockedOpenAIClient).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-openai-key',
					fetch: mockedAiClientFetch,
				}),
			);
		});
	});
});
