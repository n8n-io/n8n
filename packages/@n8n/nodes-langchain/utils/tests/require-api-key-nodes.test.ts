import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, INodeType, ISupplyDataFunctions } from 'n8n-workflow';
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
import { MemoryXata } from '../../nodes/memory/MemoryXata/MemoryXata.node';
import { RerankerCohere } from '../../nodes/rerankers/RerankerCohere/RerankerCohere.node';
import { ToolSerpApi } from '../../nodes/tools/ToolSerpApi/ToolSerpApi.node';

const nodes: Array<[string, new () => INodeType]> = [
	['EmbeddingsCohere', EmbeddingsCohere],
	['EmbeddingsGoogleGemini', EmbeddingsGoogleGemini],
	['EmbeddingsMistralCloud', EmbeddingsMistralCloud],
	['EmbeddingsOpenAi', EmbeddingsOpenAi],
	['LmChatAlibabaCloud', LmChatAlibabaCloud],
	['LmChatAnthropic', LmChatAnthropic],
	['LmChatCohere', LmChatCohere],
	['LmChatDeepSeek', LmChatDeepSeek],
	['LmChatGoogleGemini', LmChatGoogleGemini],
	['LmChatGroq', LmChatGroq],
	['LmChatMinimax', LmChatMinimax],
	['LmChatMistralCloud', LmChatMistralCloud],
	['LmChatMoonshot', LmChatMoonshot],
	['LmChatOpenAi', LmChatOpenAi],
	['LmChatOpenRouter', LmChatOpenRouter],
	['LmChatVercelAiGateway', LmChatVercelAiGateway],
	['LmChatXAiGrok', LmChatXAiGrok],
	['LmCohere', LmCohere],
	['LmOpenAi', LmOpenAi],
	['LmOpenHuggingFaceInference', LmOpenHuggingFaceInference],
	['MemoryXata', MemoryXata],
	['RerankerCohere', RerankerCohere],
	['ToolSerpApi', ToolSerpApi],
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
};

const createContext = (credentials: object) => {
	const ctx = createMockExecuteFunction<ISupplyDataFunctions>({}, node);
	ctx.getNode = vi.fn().mockReturnValue(node);
	ctx.getCredentials = vi.fn().mockResolvedValue(credentials);
	ctx.getNodeParameter = vi
		.fn()
		.mockImplementation(
			(name: string, _i: number, fallback?: unknown) => parameters[name] ?? fallback ?? {},
		);
	ctx.logger = mock();
	ctx.helpers = mock<ISupplyDataFunctions['helpers']>({ getSecureEgressFilter: () => mock() });
	return ctx;
};

describe.each(nodes)('%s', (_, NodeClass) => {
	it.each([
		['empty', { apiKey: '' }],
		['blank', { apiKey: '  ' }],
		['missing', {}],
	])('should throw when the API key is %s', async (_case, credentials) => {
		const ctx = createContext(credentials);

		await expect(new NodeClass().supplyData!.call(ctx, 0)).rejects.toThrow(
			'The credential has no API key',
		);
	});
});
