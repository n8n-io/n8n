import { AgentExecutor } from '@langchain/classic/agents';
import { ChatOpenAI } from '@langchain/openai';
import {
	NodeConnectionTypes,
	NodeHelpers,
	type IExecuteFunctions,
	type INode,
	type INodeParameters,
	type ISupplyDataFunctions,
	type IWorkflowMetadata,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as helpers from '../../../../../utils/helpers';
import { LmChatOpenAi } from '../../../../llms/LMChatOpenAi/LmChatOpenAi.node';
import { toolsAgentExecute } from '../../agents/ToolsAgent/V2/execute';

vi.mock('@n8n/ai-utilities', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities')>()),
	getProxyAgent: vi.fn(),
}));

describe('Tools Agent V2 with a custom OpenAI-compatible endpoint', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	async function setup(modelId: string, parameterOverrides: INodeParameters = {}) {
		const chatModel = new LmChatOpenAi();
		const baseURL = 'http://gateway.example:20128/v1';
		const modelNode: INode = {
			id: 'chat-model',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1.3,
			position: [0, 0],
			parameters: {
				model: { __rl: true, mode: 'id', value: modelId },
				options: {},
				...parameterOverrides,
			},
		};
		// AGENT-857: Load the node defaults to match a new OpenAI Chat Model sub-node.
		const parameters = NodeHelpers.getNodeParameters(
			chatModel.description.properties,
			modelNode.parameters,
			true,
			false,
			modelNode,
			chatModel.description,
		);
		const supplyContext = mock<ISupplyDataFunctions>({
			helpers: mock<ISupplyDataFunctions['helpers']>(),
		});
		supplyContext.getNode.mockReturnValue(modelNode);
		supplyContext.getCredentials.mockResolvedValue({ apiKey: 'test-api-key', url: baseURL });
		supplyContext.getNodeParameter.mockImplementation((name, _index, fallback) => {
			if (name === 'model.value') return modelId;
			return parameters?.[name] ?? fallback;
		});

		const { response } = await chatModel.supplyData.call(supplyContext, 0);
		expect(response).toBeInstanceOf(ChatOpenAI);
		expect(response).toMatchObject({ model: modelId, clientConfig: { baseURL } });

		const context = mock<IExecuteFunctions>({
			logger: mock<IExecuteFunctions['logger']>(),
		});
		context.getNode.mockReturnValue(mock<INode>({ name: 'AI Agent', typeVersion: 2 }));
		context.getInputData.mockReturnValue([{ json: { text: 'Hello' } }]);
		context.getInputConnectionData.mockImplementation(async (type) =>
			type === NodeConnectionTypes.AiLanguageModel ? response : undefined,
		);
		context.getNodeParameter.mockImplementation((name, _index, fallback) => {
			if (name === 'text') return 'Hello';
			return fallback;
		});
		context.getWorkflow.mockReturnValue(mock<IWorkflowMetadata>({ name: 'Test Workflow' }));
		context.getExecutionId.mockReturnValue('test-execution');
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue([]);

		const executor = mock<AgentExecutor>();
		executor.withConfig.mockReturnValue(executor);
		executor.invoke.mockResolvedValue({ output: 'Gateway response' });
		vi.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(executor);

		return { context, executor };
	}

	it.each(['auto/balanced', 'auto/cheapest', 'combo/my-combo'])(
		'accepts the custom model ID %s with the default chat-model settings',
		async (modelId) => {
			const { context, executor } = await setup(modelId);

			await expect(toolsAgentExecute.call(context)).resolves.toEqual([
				[{ json: { output: 'Gateway response' }, pairedItem: { item: 0 } }],
			]);
			expect(executor.invoke).toHaveBeenCalledOnce();
		},
	);

	it('accepts a custom model ID when the Responses API is disabled', async () => {
		const { context, executor } = await setup('auto/balanced', { responsesApiEnabled: false });

		await expect(toolsAgentExecute.call(context)).resolves.toEqual([
			[{ json: { output: 'Gateway response' }, pairedItem: { item: 0 } }],
		]);
		expect(executor.invoke).toHaveBeenCalledOnce();
	});
});
