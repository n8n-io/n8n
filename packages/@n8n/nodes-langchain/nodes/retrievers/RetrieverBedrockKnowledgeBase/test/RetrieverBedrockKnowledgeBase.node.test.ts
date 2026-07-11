import type { ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

const mockSend = vi.fn().mockResolvedValue({ retrievalResults: [] });

vi.mock('@aws-sdk/client-bedrock-agent-runtime', () => ({
	BedrockAgentRuntimeClient: class MockClient {
		send = mockSend;
	},
	RetrieveCommand: class MockRetrieveCommand {
		constructor(public input: any) {}
	},
}));

import { RetrieverBedrockKnowledgeBase } from '../RetrieverBedrockKnowledgeBase.node';

const mockLogger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

describe('RetrieverBedrockKnowledgeBase', () => {
	let node: RetrieverBedrockKnowledgeBase;
	let mockContext: Mocked<ISupplyDataFunctions>;

	beforeEach(() => {
		node = new RetrieverBedrockKnowledgeBase();
		mockContext = {
			logger: mockLogger,
			getNodeParameter: vi.fn(),
		} as unknown as Mocked<ISupplyDataFunctions>;
		vi.clearAllMocks();
		mockSend.mockResolvedValue({ retrievalResults: [] });
	});

	describe('description', () => {
		it('should have correct metadata', () => {
			expect(node.description.displayName).toBe('AWS Bedrock Knowledge Base Retriever');
			expect(node.description.name).toBe('retrieverBedrockKnowledgeBase');
		});

		it('should have knowledge base type options', () => {
			const typeProperty = node.description.properties.find(
				(p) => p.name === 'knowledgeBaseType',
			);
			expect(typeProperty).toBeDefined();
			expect(typeProperty!.default).toBe('MANAGED');
		});
	});

	describe('supplyData', () => {
		it('should create a retriever with managed config', async () => {
			mockContext.getNodeParameter.mockImplementation((param) => {
				if (param === 'knowledgeBaseId') return 'TEST123456';
				if (param === 'region') return 'us-west-2';
				if (param === 'knowledgeBaseType') return 'MANAGED';
				if (param === 'topK') return 5;
				return undefined;
			});

			const result = await node.supplyData.call(mockContext);

			expect(result).toHaveProperty('response');
			expect(result.response).toHaveProperty('getRelevantDocuments');
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('knowledgeBaseId', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('knowledgeBaseType', 0);
		});

		it('should create a retriever with vector config', async () => {
			mockContext.getNodeParameter.mockImplementation((param) => {
				if (param === 'knowledgeBaseId') return 'TEST123456';
				if (param === 'region') return 'us-east-1';
				if (param === 'knowledgeBaseType') return 'VECTOR';
				if (param === 'topK') return 3;
				return undefined;
			});

			const result = await node.supplyData.call(mockContext);
			expect(result).toHaveProperty('response');
		});
	});
});
