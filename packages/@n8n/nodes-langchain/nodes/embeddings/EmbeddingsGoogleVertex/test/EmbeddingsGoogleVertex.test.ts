import { VertexAIEmbeddings } from '@langchain/google-vertexai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { EmbeddingsGoogleVertex } from '../EmbeddingsGoogleVertex.node';

jest.mock('@langchain/google-vertexai');
jest.mock('@utils/logWrapper');
jest.mock('n8n-nodes-base/dist/utils/utilities', () => ({
	formatPrivateKey: jest.fn().mockImplementation((key: string) => key),
}));

const MockedVertexAIEmbeddings = jest.mocked(VertexAIEmbeddings);
const mockedLogWrapper = jest.mocked(logWrapper);

describe('EmbeddingsGoogleVertex', () => {
	let embeddingsGoogleVertex: EmbeddingsGoogleVertex;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Embeddings Google Vertex',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.embeddingsGoogleVertex',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (credentialType: 'googleApi' | 'googleApiAdcApi' = 'googleApi') => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as jest.Mocked<ISupplyDataFunctions>;

		if (credentialType === 'googleApiAdcApi') {
			mockContext.getCredentials = jest.fn().mockImplementation(async (type: string) => {
				if (type === 'googleApiAdcApi') {
					return {
						region: 'us-central1',
						projectId: 'adc-project-id',
					};
				}
				throw new Error(`Unexpected credential type: ${type}`);
			});
		} else {
			mockContext.getCredentials = jest.fn().mockImplementation(async (type: string) => {
				if (type === 'googleApi') {
					return {
						privateKey: 'test-private-key',
						email: 'test@n8n.io',
						region: 'us-central1',
					};
				}
				throw new Error(`Unexpected credential type: ${type}`);
			});
		}
		mockContext.getNode = jest.fn().mockReturnValue(mockNode);
		mockContext.getNodeParameter = jest.fn();

		mockedLogWrapper.mockImplementation((embeddings) => embeddings);

		return mockContext;
	};

	beforeEach(() => {
		embeddingsGoogleVertex = new EmbeddingsGoogleVertex();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('supplyData - Service Account authentication', () => {
		it('should create VertexAIEmbeddings with Service Account credentials', async () => {
			const mockContext = setupMockContext('googleApi');

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'serviceAccount';
				if (paramName === 'modelName') return 'text-embedding-005';
				if (paramName === 'projectId') return 'test-project';
				return undefined;
			});

			await embeddingsGoogleVertex.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('googleApi');
			expect(MockedVertexAIEmbeddings).toHaveBeenCalledWith({
				authOptions: {
					projectId: 'test-project',
					credentials: {
						client_email: 'test@n8n.io',
						private_key: 'test-private-key',
					},
				},
				location: 'us-central1',
				model: 'text-embedding-005',
			});
		});
	});

	describe('supplyData - ADC authentication', () => {
		it('should create VertexAIEmbeddings with ADC credentials and project ID from node parameter', async () => {
			const mockContext = setupMockContext('googleApiAdcApi');

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'adc';
				if (paramName === 'modelName') return 'text-embedding-005';
				if (paramName === 'projectIdAdc') return 'node-param-project-id';
				return undefined;
			});

			await embeddingsGoogleVertex.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('googleApiAdcApi');
			expect(MockedVertexAIEmbeddings).toHaveBeenCalledWith({
				authOptions: {
					projectId: 'node-param-project-id',
				},
				location: 'us-central1',
				model: 'text-embedding-005',
			});

			const callArgs = MockedVertexAIEmbeddings.mock.calls[0][0];
			expect(callArgs?.authOptions).not.toHaveProperty('credentials');
		});

		it('should create VertexAIEmbeddings with ADC credentials and project ID from credential config', async () => {
			const mockContext = setupMockContext('googleApiAdcApi');

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'adc';
				if (paramName === 'modelName') return 'text-embedding-005';
				if (paramName === 'projectIdAdc') return '';
				return undefined;
			});

			await embeddingsGoogleVertex.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('googleApiAdcApi');
			expect(MockedVertexAIEmbeddings).toHaveBeenCalledWith({
				authOptions: {
					projectId: 'adc-project-id',
				},
				location: 'us-central1',
				model: 'text-embedding-005',
			});
		});

		it('should create VertexAIEmbeddings with ADC credentials without project ID for auto-detection', async () => {
			mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
				{},
				mockNode,
			) as jest.Mocked<ISupplyDataFunctions>;

			mockContext.getCredentials = jest.fn().mockImplementation(async (type: string) => {
				if (type === 'googleApiAdcApi') {
					return {
						region: 'us-central1',
						projectId: '',
					};
				}
				throw new Error(`Unexpected credential type: ${type}`);
			});
			mockContext.getNode = jest.fn().mockReturnValue(mockNode);
			mockedLogWrapper.mockImplementation((embeddings) => embeddings);

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'adc';
				if (paramName === 'modelName') return 'text-embedding-005';
				if (paramName === 'projectIdAdc') return '';
				return undefined;
			});

			await embeddingsGoogleVertex.supplyData.call(mockContext, 0);

			expect(MockedVertexAIEmbeddings).toHaveBeenCalledWith({
				authOptions: {},
				location: 'us-central1',
				model: 'text-embedding-005',
			});
		});
	});

	describe('supplyData - response wrapping', () => {
		it('should wrap embeddings with logWrapper', async () => {
			const mockContext = setupMockContext('googleApi');
			const mockEmbeddings = {} as VertexAIEmbeddings;

			MockedVertexAIEmbeddings.mockImplementation(() => mockEmbeddings);

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'serviceAccount';
				if (paramName === 'modelName') return 'text-embedding-005';
				if (paramName === 'projectId') return 'test-project';
				return undefined;
			});

			const result = await embeddingsGoogleVertex.supplyData.call(mockContext, 0);

			expect(mockedLogWrapper).toHaveBeenCalledWith(mockEmbeddings, mockContext);
			expect(result).toEqual({ response: mockEmbeddings });
		});
	});
});
