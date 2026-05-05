/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/unbound-method */
import { OpenAIEmbeddings } from '@langchain/openai';
import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { EmbeddingsOpenAi } from '../EmbeddingsOpenAI/EmbeddingsOpenAi.node';

jest.mock('@langchain/openai');

class MockProxyAgent {}

jest.mock('@n8n/ai-utilities', () => {
	const actual = jest.requireActual('@n8n/ai-utilities');
	return {
		...actual,
		logWrapper: jest.fn().mockImplementation(() => jest.fn()),
		getProxyAgent: jest.fn().mockImplementation(() => new MockProxyAgent()),
	};
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getProxyAgent: mockGetProxyAgent } = jest.mocked(require('@n8n/ai-utilities'));
const MockedOpenAIEmbeddings = jest.mocked(OpenAIEmbeddings);
const { openAiDefaultHeaders: defaultHeaders } = Container.get(AiConfig);

describe('EmbeddingsOpenAi', () => {
	let embeddingsOpenAi: EmbeddingsOpenAi;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Embeddings OpenAI',
		typeVersion: 1.2,
		type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (nodeOverrides: Partial<INode> = {}) => {
		const node = { ...mockNode, ...nodeOverrides };
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			node,
		) as jest.Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = jest.fn().mockResolvedValue({
			apiKey: 'test-api-key',
		});
		mockContext.getNode = jest.fn().mockReturnValue(node);
		mockContext.getNodeParameter = jest.fn();
		mockContext.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
		return mockContext;
	};

	beforeEach(() => {
		embeddingsOpenAi = new EmbeddingsOpenAi();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should create OpenAIEmbeddings with basic configuration', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'text-embedding-3-small';
				if (paramName === 'options') return {};
				return undefined;
			});

			await embeddingsOpenAi.supplyData.call(mockContext, 0);

			expect(MockedOpenAIEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'text-embedding-3-small',
					apiKey: 'test-api-key',
					configuration: expect.objectContaining({
						defaultHeaders,
						fetchOptions: {
							dispatcher: expect.any(MockProxyAgent),
						},
					}),
				}),
			);
		});

		it('should handle custom headers from credentials', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'text-embedding-3-small';
				if (paramName === 'options') return {};
				return undefined;
			});

			await embeddingsOpenAi.supplyData.call(mockContext, 0);

			expect(MockedOpenAIEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'text-embedding-3-small',
					apiKey: 'test-api-key',
					configuration: expect.objectContaining({
						defaultHeaders: {
							...defaultHeaders,
							'X-Custom-Header': 'custom-value',
						},
						fetchOptions: {
							dispatcher: expect.any(MockProxyAgent),
						},
					}),
				}),
			);
		});

		it('should not add custom headers when header option is disabled', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				header: false,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'text-embedding-3-small';
				if (paramName === 'options') return {};
				return undefined;
			});

			await embeddingsOpenAi.supplyData.call(mockContext, 0);

			expect(MockedOpenAIEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						defaultHeaders,
					}),
				}),
			);
		});

		it('should pass TLS options to getProxyAgent when TLS is configured in openAiApi credential', async () => {
			const mockContext = setupMockContext();
			const tlsCreds = {
				ca: '-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----',
				cert: '-----BEGIN CERTIFICATE-----\nCERT\n-----END CERTIFICATE-----',
				key: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----',
				passphrase: 'secret',
			};

			mockContext.getCredentials = jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				sslCertificatesEnabled: true,
				...tlsCreds,
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'text-embedding-3-small';
				if (paramName === 'options') return {};
				return undefined;
			});

			await embeddingsOpenAi.supplyData.call(mockContext, 0);

			expect(mockGetProxyAgent).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Object),
				expect.objectContaining({
					ca: tlsCreds.ca,
					cert: tlsCreds.cert,
					key: tlsCreds.key,
					passphrase: tlsCreds.passphrase,
				}),
			);
		});

		it('should use empty string apiKey when apiKey is empty and TLS is configured', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials = jest.fn().mockResolvedValue({
				apiKey: '',
				sslCertificatesEnabled: true,
				cert: '-----BEGIN CERTIFICATE-----\nCERT\n-----END CERTIFICATE-----',
				key: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'text-embedding-3-small';
				if (paramName === 'options') return {};
				return undefined;
			});

			await embeddingsOpenAi.supplyData.call(mockContext, 0);

			expect(MockedOpenAIEmbeddings).toHaveBeenCalledWith(expect.objectContaining({ apiKey: '' }));
		});

		it('should not pass TLS options to getProxyAgent when sslCertificatesEnabled is false', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials = jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				sslCertificatesEnabled: false,
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'text-embedding-3-small';
				if (paramName === 'options') return {};
				return undefined;
			});

			await embeddingsOpenAi.supplyData.call(mockContext, 0);

			// getProxyAgent called without TLS options (third argument is undefined)
			expect(mockGetProxyAgent).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Object),
				undefined,
			);
		});
	});
});
