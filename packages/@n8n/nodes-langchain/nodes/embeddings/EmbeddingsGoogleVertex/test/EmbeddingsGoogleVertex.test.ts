import { VertexAIEmbeddings } from '@langchain/google-vertexai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsGoogleVertex } from '../EmbeddingsGoogleVertex.node';

vi.mock('@langchain/google-vertexai');
vi.mock('@n8n/ai-utilities', () => ({
	logWrapper: vi.fn((val: unknown) => val),
	getConnectionHintNoticeField: vi.fn(() => ({})),
}));
vi.mock('@n8n/utils/format-pem-block', () => ({
	formatPemBlock: vi.fn().mockImplementation((key: string) => key),
}));

const MockedVertexAIEmbeddings = vi.mocked(VertexAIEmbeddings);

describe('EmbeddingsGoogleVertex - location resolution', () => {
	let node: EmbeddingsGoogleVertex;
	let mockContext: Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Embeddings Google Vertex',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.embeddingsGoogleVertex',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (location: string | undefined) => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = vi.fn().mockResolvedValue({
			privateKey: 'test-private-key',
			email: 'test@n8n.io',
			region: 'us-central1',
		});
		mockContext.getNode = vi.fn().mockReturnValue(mockNode);
		mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'modelName') return 'text-embedding-005';
			if (paramName === 'projectId') return 'test-project';
			if (paramName === 'location') return location;
			return undefined;
		});

		return mockContext;
	};

	beforeEach(() => {
		node = new EmbeddingsGoogleVertex();
		vi.clearAllMocks();
	});

	it('routes the EU multi-region location through the .rep. data-residency endpoint', async () => {
		const mockContext = setupMockContext('eu');

		await node.supplyData.call(mockContext, 0);

		const callArgs = MockedVertexAIEmbeddings.mock.calls[0][0];
		expect(callArgs.location).toBe('eu');
		expect(callArgs.endpoint).toBe('aiplatform.eu.rep.googleapis.com');
	});

	it('falls back to the credential region with no endpoint override', async () => {
		const mockContext = setupMockContext('');

		await node.supplyData.call(mockContext, 0);

		const callArgs = MockedVertexAIEmbeddings.mock.calls[0][0];
		expect(callArgs.location).toBe('us-central1');
		expect(callArgs).not.toHaveProperty('endpoint');
	});
});
