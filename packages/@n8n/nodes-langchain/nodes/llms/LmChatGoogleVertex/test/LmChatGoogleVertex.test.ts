import { ChatVertexAI } from '@langchain/google-vertexai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { makeN8nLlmFailedAttemptHandler } from '../../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../../N8nLlmTracing';
import { LmChatGoogleVertex } from '../LmChatGoogleVertex.node';

jest.mock('@langchain/google-vertexai');
jest.mock('../../N8nLlmTracing');
jest.mock('../../n8nLlmFailedAttemptHandler');
jest.mock('n8n-nodes-base/dist/utils/utilities', () => ({
	formatPrivateKey: jest.fn().mockImplementation((key: string) => key),
}));

const MockedChatVertexAI = jest.mocked(ChatVertexAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);

describe('LmChatGoogleVertex', () => {
	let lmChatGoogleVertex: LmChatGoogleVertex;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Google Vertex Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatGoogleVertex',
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

		MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

		return mockContext;
	};

	beforeEach(() => {
		lmChatGoogleVertex = new LmChatGoogleVertex();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('supplyData - Service Account authentication', () => {
		it('should create ChatVertexAI with Service Account credentials', async () => {
			const mockContext = setupMockContext('googleApi');

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'serviceAccount';
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 2048,
						temperature: 0.4,
						topK: 40,
						topP: 0.9,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('googleApi');
			expect(MockedChatVertexAI).toHaveBeenCalledWith(
				expect.objectContaining({
					authOptions: {
						projectId: 'test-project',
						credentials: {
							client_email: 'test@n8n.io',
							private_key: 'test-private-key',
						},
					},
					location: 'us-central1',
					model: 'gemini-2.5-flash',
				}),
			);
		});
	});

	describe('supplyData - ADC authentication', () => {
		it('should create ChatVertexAI with ADC credentials and project ID from node parameter', async () => {
			const mockContext = setupMockContext('googleApiAdcApi');

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'adc';
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectIdAdc') return 'node-param-project-id';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 2048,
						temperature: 0.4,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('googleApiAdcApi');
			expect(MockedChatVertexAI).toHaveBeenCalledWith(
				expect.objectContaining({
					authOptions: {
						projectId: 'node-param-project-id',
					},
					location: 'us-central1',
					model: 'gemini-2.5-flash',
				}),
			);

			const callArgs = MockedChatVertexAI.mock.calls[0][0];
			expect(callArgs?.authOptions).not.toHaveProperty('credentials');
		});

		it('should create ChatVertexAI with ADC credentials and project ID from credential config', async () => {
			const mockContext = setupMockContext('googleApiAdcApi');

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'adc';
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectIdAdc') return '';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 2048,
						temperature: 0.4,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('googleApiAdcApi');
			expect(MockedChatVertexAI).toHaveBeenCalledWith(
				expect.objectContaining({
					authOptions: {
						projectId: 'adc-project-id',
					},
					location: 'us-central1',
					model: 'gemini-2.5-flash',
				}),
			);
		});

		it('should create ChatVertexAI with ADC credentials without project ID for auto-detection', async () => {
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
			MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
			mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'adc';
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectIdAdc') return '';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 2048,
						temperature: 0.4,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(mockContext, 0);

			expect(MockedChatVertexAI).toHaveBeenCalledWith(
				expect.objectContaining({
					authOptions: {},
					location: 'us-central1',
					model: 'gemini-2.5-flash',
				}),
			);
		});
	});

	describe('supplyData - thinking budget parameter passing', () => {
		it('should not include thinkingBudget in model config when not specified', async () => {
			const mockContext = setupMockContext('googleApi');

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'serviceAccount';
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 2048,
						temperature: 0.4,
						topK: 40,
						topP: 0.9,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(mockContext, 0);
			expect(MockedChatVertexAI).toHaveBeenCalledTimes(1);
			const callArgs = MockedChatVertexAI.mock.calls[0][0];
			expect(callArgs).not.toHaveProperty('thinkingBudget');
			expect(callArgs).toMatchObject({
				authOptions: {
					projectId: 'test-project',
					credentials: {
						client_email: 'test@n8n.io',
						private_key: 'test-private-key',
					},
				},
				location: 'us-central1',
				model: 'gemini-2.5-flash',
				topK: 40,
				topP: 0.9,
				temperature: 0.4,
				maxOutputTokens: 2048,
			});
		});

		it('should include thinkingBudget in model config when specified', async () => {
			const mockContext = setupMockContext('googleApi');
			const expectedThinkingBudget = 1024;

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'authentication') return 'serviceAccount';
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'options') {
					return {
						maxOutputTokens: 2048,
						temperature: 0.4,
						topK: 40,
						topP: 0.9,
						thinkingBudget: expectedThinkingBudget,
					};
				}
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(mockContext, 0);
			expect(MockedChatVertexAI).toHaveBeenCalledWith(
				expect.objectContaining({
					authOptions: {
						projectId: 'test-project',
						credentials: {
							client_email: 'test@n8n.io',
							private_key: 'test-private-key',
						},
					},
					location: 'us-central1',
					model: 'gemini-2.5-flash',
					topK: 40,
					topP: 0.9,
					temperature: 0.4,
					maxOutputTokens: 2048,
					thinkingBudget: expectedThinkingBudget,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					callbacks: expect.arrayContaining([expect.any(Object)]),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					onFailedAttempt: expect.any(Function),
				}),
			);
		});
	});
});
