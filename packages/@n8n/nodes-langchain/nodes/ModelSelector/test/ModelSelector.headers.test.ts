import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Serialized } from '@langchain/core/load/serializable';
import { N8nLlmTracing } from '@n8n/ai-utilities';
import type { ISupplyDataFunctions, INode } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ModelSelector } from '../ModelSelector.node';

const serializedModel: Serialized = {
	lc: 1,
	type: 'constructor',
	id: ['langchain', 'chat_models', 'openai'],
	kwargs: {
		configuration: {
			defaultHeaders: {
				'User-Agent': 'n8n',
				authorization: 'Bearer My_secret_API_key123456789',
				'x-secret-header': 'My_secret_API_key123456789',
			},
		},
	},
};

describe('ModelSelector Node header handling', () => {
	let selectorContext: Mocked<ISupplyDataFunctions>;

	beforeEach(() => {
		selectorContext = mock<ISupplyDataFunctions>({
			addInputData: vi.fn().mockReturnValue({ index: 0 }),
			getNextRunIndex: vi.fn().mockReturnValue(0),
		});
		selectorContext.getNode.mockReturnValue({ name: 'Model Selector' } as INode);
		selectorContext.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'rules.rule' ? [{ modelIndex: 1, conditions: {} }] : true,
		);
	});

	/** Runs the selected model through the node and returns what the node persisted. */
	const persistHeadersFor = async (callbacks: unknown[]) => {
		const model = { _llmType: () => 'fake-llm', callbacks } as unknown as BaseChatModel;
		selectorContext.getInputConnectionData.mockResolvedValue([model]);

		const { response } = await new ModelSelector().supplyData.call(selectorContext, 0);

		const attached = (response as BaseChatModel).callbacks as Array<{
			handleLLMStart: (llm: Serialized, prompts: string[], runId: string) => Promise<void>;
		}>;
		// the tracer the Model Selector attached on top of the model's own callbacks
		await attached[attached.length - 1].handleLLMStart(serializedModel, ['hello'], 'run-123');

		const inputArg = selectorContext.addInputData.mock.calls[0][1] as Array<
			Array<{ json: { options: { configuration: { defaultHeaders: Record<string, string> } } } }>
		>;
		return inputArg[0][0].json.options.configuration.defaultHeaders;
	};

	it('should mask the header values declared by the selected model', async () => {
		const modelContext = mock<ISupplyDataFunctions>({
			addInputData: vi.fn().mockReturnValue({ index: 0 }),
			getNextRunIndex: vi.fn().mockReturnValue(0),
		});

		const persistedHeaders = await persistHeadersFor([
			new N8nLlmTracing(modelContext, { redactedHeaders: ['x-secret-header'] }),
		]);

		expect(persistedHeaders['x-secret-header']).toBe('**********');
		expect(persistedHeaders['User-Agent']).toBe('n8n');
	});

	it('should mask the header values declared by a model that attaches its own tracer type', async () => {
		const persistedHeaders = await persistHeadersFor([
			{ handleLLMStart: vi.fn(), options: { redactedHeaders: ['x-secret-header'] } },
		]);

		expect(persistedHeaders['x-secret-header']).toBe('**********');
	});

	it('should still mask the always-redacted header names when the model declares none', async () => {
		const persistedHeaders = await persistHeadersFor([{ handleLLMStart: vi.fn() }]);

		expect(persistedHeaders.authorization).toBe('**********');
	});
});
