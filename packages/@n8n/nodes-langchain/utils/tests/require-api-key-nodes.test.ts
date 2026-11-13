// The Zep SDK does not load in Vitest without a mock
vi.mock('@langchain/community/vectorstores/zep', () => ({ ZepVectorStore: vi.fn() }));
vi.mock('@langchain/community/vectorstores/zep_cloud', () => ({ ZepCloudVectorStore: vi.fn() }));

import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeType,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EmbeddingsCohere } from '../../nodes/embeddings/EmbeddingsCohere/EmbeddingsCohere.node';
import { EmbeddingsGoogleGemini } from '../../nodes/embeddings/EmbeddingsGoogleGemini/EmbeddingsGoogleGemini.node';
import { EmbeddingsMistralCloud } from '../../nodes/embeddings/EmbeddingsMistralCloud/EmbeddingsMistralCloud.node';
import { EmbeddingsOpenAi } from '../../nodes/embeddings/EmbeddingsOpenAI/EmbeddingsOpenAi.node';
import { LmChatAnthropic } from '../../nodes/llms/LMChatAnthropic/LmChatAnthropic.node';
import { LmChatOpenAi } from '../../nodes/llms/LMChatOpenAi/LmChatOpenAi.node';
import { LmCohere } from '../../nodes/llms/LMCohere/LmCohere.node';
import { LmOpenAi } from '../../nodes/llms/LMOpenAi/LmOpenAi.node';
import { LmOpenHuggingFaceInference } from '../../nodes/llms/LMOpenHuggingFaceInference/LmOpenHuggingFaceInference.node';
import { LmChatAlibabaCloud } from '../../nodes/llms/LmChatAlibabaCloud/LmChatAlibabaCloud.node';
import { LmChatCohere } from '../../nodes/llms/LmChatCohere/LmChatCohere.node';
import { LmChatDeepSeek } from '../../nodes/llms/LmChatDeepSeek/LmChatDeepSeek.node';
import { LmChatGoogleGemini } from '../../nodes/llms/LmChatGoogleGemini/LmChatGoogleGemini.node';
import { LmChatGroq } from '../../nodes/llms/LmChatGroq/LmChatGroq.node';
import { LmChatMinimax } from '../../nodes/llms/LmChatMinimax/LmChatMinimax.node';
import { LmChatMistralCloud } from '../../nodes/llms/LmChatMistralCloud/LmChatMistralCloud.node';
import { LmChatMoonshot } from '../../nodes/llms/LmChatMoonshot/LmChatMoonshot.node';
import { LmChatOpenRouter } from '../../nodes/llms/LmChatOpenRouter/LmChatOpenRouter.node';
import { LmChatVercelAiGateway } from '../../nodes/llms/LmChatVercelAiGateway/LmChatVercelAiGateway.node';
import { LmChatXAiGrok } from '../../nodes/llms/LmChatXAiGrok/LmChatXAiGrok.node';
import { OpenAiAssistant } from '../../nodes/agents/OpenAiAssistant/OpenAiAssistant.node';
import { EmbeddingsAzureOpenAi } from '../../nodes/embeddings/EmbeddingsAzureOpenAi/EmbeddingsAzureOpenAi.node';
import { MemoryXata } from '../../nodes/memory/MemoryXata/MemoryXata.node';
import { RerankerCohere } from '../../nodes/rerankers/RerankerCohere/RerankerCohere.node';
import { ToolSerpApi } from '../../nodes/tools/ToolSerpApi/ToolSerpApi.node';
import { VectorStoreChromaDB } from '../../nodes/vector_store/VectorStoreChromaDB/VectorStoreChromaDB.node';
import { VectorStoreZep } from '../../nodes/vector_store/VectorStoreZep/VectorStoreZep.node';
import * as assistantMessage from '../../nodes/vendors/OpenAi/v1/actions/assistant/message.operation';

type Run = (ctx: ISupplyDataFunctions & IExecuteFunctions) => Promise<unknown>;

const supplyData =
	(NodeClass: new () => INodeType): Run =>
	async (ctx) =>
		await new NodeClass().supplyData!.call(ctx, 0);

// Runs the Chroma node with Cloud authentication and the given operation parameters
const chromaCloud =
	(run: Run, extra: Record<string, unknown> = {}): Run =>
	async (ctx) => {
		const params: Record<string, unknown> = { authentication: 'chromaCloudApi', ...extra };
		const getNodeParameter = ctx.getNodeParameter;
		ctx.getNodeParameter = vi.fn(
			(name: string, i: number, fallback?: unknown) =>
				params[name] ?? getNodeParameter.call(ctx, name, i, fallback),
		) as unknown as typeof ctx.getNodeParameter;
		ctx.getInputConnectionData = vi.fn().mockResolvedValue([]);
		ctx.getExecutionCancelSignal = vi.fn();
		return await run(ctx);
	};
const chromaExecute: Run = async (ctx) => await new VectorStoreChromaDB().execute.call(ctx);

// Every node that passes a credential API key through getRequiredApiKey
const nodes: Array<[string, Run]> = [
	['EmbeddingsAzureOpenAi', supplyData(EmbeddingsAzureOpenAi)],
	['EmbeddingsCohere', supplyData(EmbeddingsCohere)],
	['EmbeddingsGoogleGemini', supplyData(EmbeddingsGoogleGemini)],
	['EmbeddingsMistralCloud', supplyData(EmbeddingsMistralCloud)],
	['EmbeddingsOpenAi', supplyData(EmbeddingsOpenAi)],
	['LmChatAlibabaCloud', supplyData(LmChatAlibabaCloud)],
	['LmChatAnthropic', supplyData(LmChatAnthropic)],
	['LmChatCohere', supplyData(LmChatCohere)],
	['LmChatDeepSeek', supplyData(LmChatDeepSeek)],
	['LmChatGoogleGemini', supplyData(LmChatGoogleGemini)],
	['LmChatGroq', supplyData(LmChatGroq)],
	['LmChatMinimax', supplyData(LmChatMinimax)],
	['LmChatMistralCloud', supplyData(LmChatMistralCloud)],
	['LmChatMoonshot', supplyData(LmChatMoonshot)],
	['LmChatOpenAi', supplyData(LmChatOpenAi)],
	['LmChatOpenRouter', supplyData(LmChatOpenRouter)],
	['LmChatVercelAiGateway', supplyData(LmChatVercelAiGateway)],
	['LmChatXAiGrok', supplyData(LmChatXAiGrok)],
	['LmCohere', supplyData(LmCohere)],
	['LmOpenAi', supplyData(LmOpenAi)],
	['LmOpenHuggingFaceInference', supplyData(LmOpenHuggingFaceInference)],
	['MemoryXata', supplyData(MemoryXata)],
	['OpenAI assistant message', async (ctx) => await assistantMessage.execute.call(ctx, 0)],
	['OpenAiAssistant', async (ctx) => await new OpenAiAssistant().execute.call(ctx)],
	['RerankerCohere', supplyData(RerankerCohere)],
	['ToolSerpApi', supplyData(ToolSerpApi)],
	[
		'VectorStoreChromaDB (cloud, collection list)',
		chromaCloud(
			async (ctx) =>
				await new VectorStoreChromaDB().methods!.listSearch!.chromaCollectionsSearch.call(
					ctx as unknown as ILoadOptionsFunctions,
				),
		),
	],
	['VectorStoreChromaDB (cloud, retrieve)', chromaCloud(supplyData(VectorStoreChromaDB))],
	['VectorStoreChromaDB (cloud, load)', chromaCloud(chromaExecute, { mode: 'load' })],
	[
		'VectorStoreChromaDB (cloud, insert with Clear Collection)',
		chromaCloud(chromaExecute, { mode: 'insert', options: { clearCollection: true } }),
	],
	['VectorStoreZep (cloud)', supplyData(VectorStoreZep)],
];

const node: INode = {
	id: '1',
	name: 'Node',
	type: 'test',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const parameters: Record<string, unknown> = {
	model: 'test-model',
	sessionIdType: 'customKey',
	sessionKey: 'session',
	sessionId: 'session',
	mode: 'retrieve',
	collectionName: 'collection',
	assistantId: 'asst_1',
	text: 'Hello',
};

const createContext = (credentials: object) => {
	const ctx = createMockExecuteFunction<ISupplyDataFunctions & IExecuteFunctions>({}, node);
	ctx.getNode = vi.fn().mockReturnValue(node);
	// cloud selects the Zep Cloud path, which needs a key
	ctx.getCredentials = vi.fn().mockResolvedValue({ cloud: true, ...credentials });
	ctx.getInputData = vi.fn().mockReturnValue([{ json: {} }]);
	ctx.continueOnFail = vi.fn().mockReturnValue(false);
	ctx.getInputConnectionData = vi.fn().mockResolvedValue(undefined);
	ctx.getNodeParameter = vi
		.fn()
		.mockImplementation(
			(name: string, _i: number, fallback?: unknown) => parameters[name] ?? fallback ?? {},
		);
	ctx.logger = mock();
	ctx.helpers = mock<ISupplyDataFunctions['helpers']>({ getSecureEgressFilter: () => mock() });
	return ctx;
};

describe.each(nodes)('%s', (_, run) => {
	it.each([
		['empty', { apiKey: '' }],
		['blank', { apiKey: '  ' }],
		['missing', {}],
	])('should throw when the API key is %s', async (_case, credentials) => {
		const ctx = createContext(credentials);

		// The check runs while the client options are built, so a throw means no client exists
		await expect(run(ctx)).rejects.toThrow('The credential has no API key');
	});
});
