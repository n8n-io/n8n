import { type IDataObject, type INodeExecutionData, type NodeApiError } from 'n8n-workflow';
import { NodeTestHelper } from 'n8n-nodes-base/dist/NodeTestHelper'; // Adjust path as needed
import { VectorStoreVertexAI } from './VectorStoreVertexAI.node';

// Mock LangChain modules
jest.mock('@langchain/community/vectorstores/googlevertexai', () => ({
	MatchingEngine: jest.fn().mockImplementation(() => ({
		similaritySearch: jest.fn().mockResolvedValue([]), // Default mock for similaritySearch
		addDocuments: jest.fn().mockResolvedValue(undefined),
		// Add other methods that might be called by the node
	})),
}));

jest.mock('@langchain/community/stores/doc/gcs', () => ({
	GoogleCloudStorageDocstore: jest.fn().mockImplementation(() => ({
		// Mock methods of GoogleCloudStorageDocstore if they are directly used
	})),
}));

import { FakeEmbeddings } from '@langchain/core/utils/testing';
import { Document } from '@langchain/core/documents';

// Keep existing mocks and add/refine as necessary
const mockMatchingEngineFromDocuments = jest.fn().mockResolvedValue(undefined);
const mockMatchingEngineSimilaritySearch = jest.fn().mockResolvedValue([]);
const mockMatchingEngineAddDocuments = jest.fn().mockResolvedValue(undefined);

jest.mock('@langchain/community/vectorstores/googlevertexai', () => {
	// This is the module factory
	return {
		MatchingEngine: jest.fn().mockImplementation(() => ({
			similaritySearch: mockMatchingEngineSimilaritySearch,
			addDocuments: mockMatchingEngineAddDocuments,
			// Ensure all methods used by the node are mocked
		})),
	};
});

// Now, specifically attach the static method mock to the class mock
require('@langchain/community/vectorstores/googlevertexai').MatchingEngine.fromDocuments = mockMatchingEngineFromDocuments;


jest.mock('@langchain/community/stores/doc/gcs', () => ({
	GoogleCloudStorageDocstore: jest.fn().mockImplementation(() => ({
		// Mock methods of GoogleCloudStorageDocstore if they are directly used
	})),
}));

// Mock Google Cloud AI Platform clients
const mockListIndexes = jest.fn();
const mockListIndexEndpoints = jest.fn();

jest.mock('@google-cloud/aiplatform/build/src/v1', () => ({
	IndexServiceClient: jest.fn().mockImplementation(() => ({
		listIndexes: mockListIndexes,
	})),
	IndexEndpointServiceClient: jest.fn().mockImplementation(() => ({
		listIndexEndpoints: mockListIndexEndpoints,
	})),
}));


describe('VectorStoreVertexAI Node', () => {
	let helper: NodeTestHelper;

	beforeEach(() => {
		helper = new NodeTestHelper(VectorStoreVertexAI);

		// Reset mocks for each test
		mockMatchingEngineFromDocuments.mockClear();
		mockMatchingEngineSimilaritySearch.mockClear();
		mockMatchingEngineAddDocuments.mockClear();
		mockListIndexes.mockClear();
		mockListIndexEndpoints.mockClear();
		// Clear constructor mocks for AI Platform clients
		(require('@google-cloud/aiplatform/build/src/v1').IndexServiceClient as jest.Mock).mockClear();
		(require('@google-cloud/aiplatform/build/src/v1').IndexEndpointServiceClient as jest.Mock).mockClear();


		// Mock credentials
		helper.mockGetCredentials = (credentialName: string) => {
			if (credentialName === 'googleCloudApi') {
				return Promise.resolve({
					gcpCredentials: {
						client_email: 'test@example.com',
						private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
						project_id: 'test-project',
					},
				});
			}
			return Promise.resolve(undefined);
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Operations', () => {
		// Define common parameters to be used in tests
		const commonParams = {
			indexId: 'test-index',
			indexEndpointId: 'test-endpoint',
			gcsBucketName: 'test-bucket',
		};

		const commonParams = {
			indexId: 'test-index',
			indexEndpointId: 'test-endpoint',
			gcsBucketName: 'test-bucket',
		};
		const fakeEmbeddings = new FakeEmbeddings();
		const mockGcpCredentials = {
			client_email: 'test@example.com',
			private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
			project_id: 'test-project',
		};


		describe('Insert Operation', () => {
			it('should insert documents into Vertex AI', async () => {
				const testDocs = [
					new Document({ pageContent: 'doc1 content', metadata: { id: 1 } }),
					new Document({ pageContent: 'doc2 content', metadata: { id: 2 } }),
				];
				const executionData: INodeExecutionData[][] = [[{ json: { documents: testDocs, embeddings: fakeEmbeddings } }]];

				helper.setWorkflowInfo({
					data: {
						embeddings: fakeEmbeddings, // Make sure embeddings are available in workflow data if needed by the node directly
					},
				} as any);


				const expectedResult = {
					json: {
						success: true,
						message: 'Documents inserted successfully into Vertex AI.',
						documentCount: testDocs.length,
					},
				};

				const result = await helper.executeNode(
					{
						operation: 'insert',
						...commonParams,
					},
					executionData, // Pass executionData here
					0, // itemIndex
				);

				expect(result[0]).toMatchObject(expectedResult);
				expect(mockMatchingEngineFromDocuments).toHaveBeenCalledTimes(1);
				expect(mockMatchingEngineFromDocuments).toHaveBeenCalledWith(
					testDocs,
					fakeEmbeddings,
					expect.objectContaining({
						index: commonParams.indexId,
						indexEndpoint: commonParams.indexEndpointId,
						docstore: expect.any(Object), // Assuming GoogleCloudStorageDocstore is instantiated
						credentials: mockGcpCredentials,
					}),
				);
			});

			it('should handle errors during insertion', async () => {
				const testDocs = [new Document({ pageContent: 'doc1 content' })];
				const executionData: INodeExecutionData[][] = [[{ json: { documents: testDocs, embeddings: fakeEmbeddings } }]];
				const errorMessage = 'Failed to insert documents';
				mockMatchingEngineFromDocuments.mockRejectedValueOnce(new Error(errorMessage));

				helper.setWorkflowInfo({ data: { embeddings: fakeEmbeddings } } as any);


				try {
					await helper.executeNode(
						{
							operation: 'insert',
							...commonParams,
						},
						executionData,
						0,
					);
					fail('Node execution should have thrown an error.');
				} catch (error) {
					expect(error).toBeInstanceOf(NodeApiError);
					expect(error.message).toContain(`Error populating Vertex AI Vector Store: ${errorMessage}`);
				}

				expect(mockMatchingEngineFromDocuments).toHaveBeenCalledTimes(1);
			});
		});

		describe('Retrieve Operation', () => {
			it('should retrieve documents using similarity search', async () => {
				// Placeholder for test logic
				const mockRetrievedDocs = [
					new Document({ pageContent: 'retrieved doc1', metadata: { score: 0.9 } }),
				];
				mockMatchingEngineSimilaritySearch.mockResolvedValue(mockRetrievedDocs);

				const executionData: INodeExecutionData[][] = [[{ json: { query: 'test query', embeddings: fakeEmbeddings } }]];
				helper.setWorkflowInfo({ data: { embeddings: fakeEmbeddings } } as any);


				const result = await helper.executeNode(
					{
						operation: 'retrieve',
						query: 'test query', // This query is used by the shared node logic to pass to similaritySearch
						...commonParams,
					},
					executionData,
					0,
				);

				expect(mockMatchingEngineSimilaritySearch).toHaveBeenCalledTimes(1);
				// TODO: Add more specific assertions for the arguments of similaritySearch
				expect(result[0].json.documents).toEqual(mockRetrievedDocs);

			});

			it('should retrieve documents with Vertex AI filter', async () => {
				// Placeholder for test logic
				const vertexAiFilter = { namespace: 'test', allowList: ['item1'] };
				mockMatchingEngineSimilaritySearch.mockResolvedValue([]);

				const executionData: INodeExecutionData[][] = [[{ json: { query: 'test query', embeddings: fakeEmbeddings } }]];
				helper.setWorkflowInfo({ data: { embeddings: fakeEmbeddings } } as any);


				await helper.executeNode(
					{
						operation: 'retrieve',
						query: 'test query',
						...commonParams,
						options: {
							vertexAiFilter: JSON.stringify(vertexAiFilter), // Pass as JSON string as per node definition
						},
					},
					executionData,
					0,
				);

				expect(mockMatchingEngineSimilaritySearch).toHaveBeenCalledWith(
					expect.any(Array), // Embeddings vector
					expect.anything(), // k (number of results)
					vertexAiFilter, // The filter object
					expect.anything(), // publicEndpoint
				);
			});

			it('should retrieve documents with metadata filter', async () => {
				// Placeholder for test logic
				// This test assumes that the metadataFilterField is translated into a VertexAI compatible filter by LangChain
				// or by our node's logic (which it currently does by passing it to MatchingEngine)
				const metadataFilter = { source: 'n8n' };
				mockMatchingEngineSimilaritySearch.mockResolvedValue([]);

				const executionData: INodeExecutionData[][] = [[{ json: { query: 'test query', embeddings: fakeEmbeddings } }]];
				helper.setWorkflowInfo({ data: { embeddings: fakeEmbeddings } } as any);

				await helper.executeNode(
					{
						operation: 'retrieve',
						query: 'test query',
						...commonParams,
						options: {
							metadataFilter,
						},
					},
					executionData,
					0,
				);
				// The shared createVectorStoreNode translates metadataFilter to Langchain's filter format
				// We expect that the filter passed to MatchingEngine constructor contains this.
				// The actual call to similaritySearch in LangChain's MatchingEngine will then use this filter.
				// For this specific test, we'd be checking the filter object passed to MatchingEngine constructor.
				// Let's adjust the mock to check the filter passed to the constructor.

				// This part is tricky because the filter is passed during MatchingEngine instantiation.
				// We'd need to inspect the arguments to the MatchingEngine constructor.
				// For now, let's assume the shared logic correctly passes it and Langchain handles it.
				// A more direct test would involve inspecting the MatchingEngine instance's filter property if available,
				// or ensuring the constructor was called with the right filter.
				expect(require('@langchain/community/vectorstores/googlevertexai').MatchingEngine)
					.toHaveBeenCalledWith(
						expect.any(Object), // embeddings
						expect.objectContaining({
							filter: metadataFilter, // Check if metadataFilter is passed here
						}),
					);
			});

			it('should handle errors during retrieval', async () => {
				// Placeholder for test logic
				const errorMessage = 'Retrieval failed';
				mockMatchingEngineSimilaritySearch.mockRejectedValueOnce(new Error(errorMessage));
				const executionData: INodeExecutionData[][] = [[{ json: { query: 'test query', embeddings: fakeEmbeddings } }]];
				helper.setWorkflowInfo({ data: { embeddings: fakeEmbeddings } } as any);


				try {
					await helper.executeNode(
						{
							operation: 'retrieve',
							query: 'test query',
							...commonParams,
						},
						executionData,
						0,
					);
					fail('Node execution should have thrown an error.');
				} catch (error) {
					expect(error).toBeInstanceOf(NodeApiError);
					// The error message comes from the shared createVectorStoreNode logic
					expect(error.message).toContain(errorMessage);
				}
			});
		});

		describe('Load Operation', () => {
			// Load operation often mirrors retrieve for vector stores if it's about loading existing index
			it('should load (retrieve) documents from Vertex AI', async () => {
				// Placeholder for test logic, similar to retrieve
				const mockRetrievedDocs = [
					new Document({ pageContent: 'loaded doc1', metadata: { score: 0.8 } }),
				];
				mockMatchingEngineSimilaritySearch.mockResolvedValue(mockRetrievedDocs);

				const executionData: INodeExecutionData[][] = [[{ json: { query: 'load query', embeddings: fakeEmbeddings } }]];
				helper.setWorkflowInfo({ data: { embeddings: fakeEmbeddings } } as any);


				const result = await helper.executeNode(
					{
						operation: 'load', // Changed to load
						query: 'load query',    // Query for the load operation
						...commonParams,
					},
					executionData,
					0,
				);

				expect(mockMatchingEngineSimilaritySearch).toHaveBeenCalledTimes(1);
				expect(result[0].json.documents).toEqual(mockRetrievedDocs);
			});

			it('should handle errors during load', async () => {
				// Placeholder for test logic
				const errorMessage = 'Load failed';
				mockMatchingEngineSimilaritySearch.mockRejectedValueOnce(new Error(errorMessage));
				const executionData: INodeExecutionData[][] = [[{ json: { query: 'test query', embeddings: fakeEmbeddings } }]];
				helper.setWorkflowInfo({ data: { embeddings: fakeEmbeddings } } as any);


				try {
					await helper.executeNode(
						{
							operation: 'load',
							query: 'test query',
							...commonParams,
						},
						executionData,
						0,
					);
					fail('Node execution should have thrown an error.');
				} catch (error) {
					expect(error).toBeInstanceOf(NodeApiError);
					expect(error.message).toContain(errorMessage);
				}
			});
		});

		describe('Update Operation', () => {
			// Update for Vertex AI Matching Engine usually means adding more documents,
			// as direct update of existing vectors is not standard.
			// LangChain's MatchingEngine uses `addDocuments` for this.
			it('should update (add) documents in Vertex AI', async () => {
				// Placeholder for test logic, potentially similar to insert but using addDocuments
				const testDocs = [
					new Document({ pageContent: 'update doc1 content' }),
				];
				const executionData: INodeExecutionData[][] = [[{ json: { documents: testDocs, embeddings: fakeEmbeddings } }]];

				helper.setWorkflowInfo({ data: { embeddings: fakeEmbeddings } } as any);

				const expectedResult = {
					json: {
						success: true,
						message: 'Documents updated successfully in Vertex AI.',
						documentCount: testDocs.length,
					},
				};

				const result = await helper.executeNode(
					{
						operation: 'update',
						...commonParams,
					},
					executionData,
					0,
				);

				expect(result[0]).toMatchObject(expectedResult);
				expect(mockMatchingEngineAddDocuments).toHaveBeenCalledTimes(1);
				expect(mockMatchingEngineAddDocuments).toHaveBeenCalledWith(
					testDocs,
					// expect.objectContaining({ ids: undefined }) // Or specific IDs if your node supports it
				);
			});

			it('should handle errors during update', async () => {
				// Placeholder for test logic
				const testDocs = [new Document({ pageContent: 'update doc1' })];
				const executionData: INodeExecutionData[][] = [[{ json: { documents: testDocs, embeddings: fakeEmbeddings } }]];
				const errorMessage = 'Failed to update documents';
				mockMatchingEngineAddDocuments.mockRejectedValueOnce(new Error(errorMessage));

				helper.setWorkflowInfo({ data: { embeddings: fakeEmbeddings } } as any);

				try {
					await helper.executeNode(
						{
							operation: 'update',
							...commonParams,
						},
						executionData,
						0,
					);
					fail('Node execution should have thrown an error.');
				} catch (error) {
					expect(error).toBeInstanceOf(NodeApiError);
					// This error message comes from the shared createVectorStoreNode logic for update
					expect(error.message).toContain(errorMessage);
				}
			});
		});

		// Vertex AI Matching Engine does not have a direct 'delete' documents method in LangChain
		// If 'delete' implies deleting the index or something else, this section might need adjustment
		// For now, assuming no direct delete document operation.
		// describe('Delete Operation', () => {
		// 	it('should handle delete operation if applicable', async () => {
		// 		// Placeholder
		// 	});
		// });
	});

	describe('listSearch methods', () => {
		const mockNode = {
			getNode: () => helper.getNode(), // Simplified mock getNode
		} as any; // Cast to any to satisfy ILoadOptionsFunctions context

		const mockGcpCredsWithProjectId = {
			gcpCredentials: {
				client_email: 'test@example.com',
				private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
				project_id: 'test-project-id', // Ensure project_id is here
			},
		};

		const mockGcpCredsWithoutProjectId = {
			gcpCredentials: {
				client_email: 'test@example.com',
				private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
				// No project_id
			},
			projectId: 'fallback-project-id', // Fallback if not in gcpCredentials
		};


		describe('vertexAiIndexSearch', () => {
			it('should return a list of indexes', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithProjectId),
					getNodeParameter: jest.fn().mockReturnValue('us-central1'),
				};
				const sampleIndexes = [
					{ name: 'projects/test-project-id/locations/us-central1/indexes/index1', displayName: 'My Index 1' },
					{ name: 'projects/test-project-id/locations/us-central1/indexes/index2', displayName: 'My Index 2' },
					{ name: 'projects/test-project-id/locations/us-central1/indexes/index3', displayName: null }, // Test null display name
				];
				mockListIndexes.mockResolvedValue([sampleIndexes, null, null]); // API returns array [response, request, options]

				const nodeInstance = new VectorStoreVertexAI(); // Access methods via an instance
				const result = await nodeInstance.methods.listSearch!.vertexAiIndexSearch.call(mockContext as any);

				expect(result).toEqual([
					{ name: 'My Index 1', value: 'index1' },
					{ name: 'My Index 2', value: 'index2' },
					{ name: 'index3', value: 'index3' },
				]);
				expect(require('@google-cloud/aiplatform/build/src/v1').IndexServiceClient).toHaveBeenCalledWith({
					apiEndpoint: 'us-central1-aiplatform.googleapis.com',
					credentials: mockGcpCredsWithProjectId.gcpCredentials,
				});
				expect(mockListIndexes).toHaveBeenCalledWith({ parent: 'projects/test-project-id/locations/us-central1' });
			});

			it('should handle errors when listing indexes', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithProjectId),
					getNodeParameter: jest.fn().mockReturnValue('us-central1'),
				};
				const errorMessage = 'API Error for indexes';
				mockListIndexes.mockRejectedValue(new Error(errorMessage));

				const nodeInstance = new VectorStoreVertexAI();
				await expect(
					nodeInstance.methods.listSearch!.vertexAiIndexSearch.call(mockContext as any),
				).rejects.toThrow(NodeApiError);
				await expect(
					nodeInstance.methods.listSearch!.vertexAiIndexSearch.call(mockContext as any),
				).rejects.toThrow(errorMessage);
			});

			it('should return empty options if region is not provided', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithProjectId),
					getNodeParameter: jest.fn().mockReturnValue(''), // Empty region
				};
				const nodeInstance = new VectorStoreVertexAI();
				const result = await nodeInstance.methods.listSearch!.vertexAiIndexSearch.call(mockContext as any);
				expect(result).toEqual([]);
				expect(mockListIndexes).not.toHaveBeenCalled();
			});


			it('should handle API returning empty list for indexes', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithProjectId),
					getNodeParameter: jest.fn().mockReturnValue('us-central1'),
				};
				mockListIndexes.mockResolvedValue([[], null, null]); // Empty array from API

				const nodeInstance = new VectorStoreVertexAI();
				const result = await nodeInstance.methods.listSearch!.vertexAiIndexSearch.call(mockContext as any);
				expect(result).toEqual([]);
			});

			it('should use fallback projectId if not in gcpCredentials for indexes', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithoutProjectId),
					getNodeParameter: jest.fn().mockReturnValue('us-east1'),
				};
				mockListIndexes.mockResolvedValue([[], null, null]);

				const nodeInstance = new VectorStoreVertexAI();
				await nodeInstance.methods.listSearch!.vertexAiIndexSearch.call(mockContext as any);

				expect(require('@google-cloud/aiplatform/build/src/v1').IndexServiceClient).toHaveBeenCalledWith({
					apiEndpoint: 'us-east1-aiplatform.googleapis.com',
					credentials: mockGcpCredsWithoutProjectId.gcpCredentials,
				});
				expect(mockListIndexes).toHaveBeenCalledWith({ parent: 'projects/fallback-project-id/locations/us-east1' });
			});
		});

		describe('vertexAiIndexEndpointSearch', () => {
			it('should return a list of index endpoints', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithProjectId),
					getNodeParameter: jest.fn().mockReturnValue('europe-west1'),
				};
				const sampleEndpoints = [
					{ name: 'projects/test-project-id/locations/europe-west1/indexEndpoints/ep1', displayName: 'Endpoint One' },
					{ name: 'projects/test-project-id/locations/europe-west1/indexEndpoints/ep2', displayName: 'Endpoint Two' },
				];
				mockListIndexEndpoints.mockResolvedValue([sampleEndpoints, null, null]);

				const nodeInstance = new VectorStoreVertexAI();
				const result = await nodeInstance.methods.listSearch!.vertexAiIndexEndpointSearch.call(mockContext as any);

				expect(result).toEqual([
					{ name: 'Endpoint One', value: 'ep1' },
					{ name: 'Endpoint Two', value: 'ep2' },
				]);
				expect(require('@google-cloud/aiplatform/build/src/v1').IndexEndpointServiceClient).toHaveBeenCalledWith({
					apiEndpoint: 'europe-west1-aiplatform.googleapis.com',
					credentials: mockGcpCredsWithProjectId.gcpCredentials,
				});
				expect(mockListIndexEndpoints).toHaveBeenCalledWith({ parent: 'projects/test-project-id/locations/europe-west1' });

			});

			it('should handle errors when listing index endpoints', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithProjectId),
					getNodeParameter: jest.fn().mockReturnValue('us-central1'),
				};
				const errorMessage = 'API Error for endpoints';
				mockListIndexEndpoints.mockRejectedValue(new Error(errorMessage));

				const nodeInstance = new VectorStoreVertexAI();
				await expect(
					nodeInstance.methods.listSearch!.vertexAiIndexEndpointSearch.call(mockContext as any),
				).rejects.toThrow(NodeApiError);
				await expect(
					nodeInstance.methods.listSearch!.vertexAiIndexEndpointSearch.call(mockContext as any),
				).rejects.toThrow(errorMessage);
			});

			it('should return empty options if region is not provided for endpoints', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithProjectId),
					getNodeParameter: jest.fn().mockReturnValue(undefined), // Undefined region
				};
				const nodeInstance = new VectorStoreVertexAI();
				const result = await nodeInstance.methods.listSearch!.vertexAiIndexEndpointSearch.call(mockContext as any);
				expect(result).toEqual([]);
				expect(mockListIndexEndpoints).not.toHaveBeenCalled();
			});

			it('should handle API returning empty list for endpoints', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithProjectId),
					getNodeParameter: jest.fn().mockReturnValue('us-central1'),
				};
				mockListIndexEndpoints.mockResolvedValue([[], null, null]);

				const nodeInstance = new VectorStoreVertexAI();
				const result = await nodeInstance.methods.listSearch!.vertexAiIndexEndpointSearch.call(mockContext as any);
				expect(result).toEqual([]);
			});

			it('should use fallback projectId if not in gcpCredentials for endpoints', async () => {
				const mockContext = {
					...mockNode,
					getCredentials: jest.fn().mockResolvedValue(mockGcpCredsWithoutProjectId),
					getNodeParameter: jest.fn().mockReturnValue('asia-southeast1'),
				};
				mockListIndexEndpoints.mockResolvedValue([[], null, null]);

				const nodeInstance = new VectorStoreVertexAI();
				await nodeInstance.methods.listSearch!.vertexAiIndexEndpointSearch.call(mockContext as any);

				expect(require('@google-cloud/aiplatform/build/src/v1').IndexEndpointServiceClient).toHaveBeenCalledWith({
					apiEndpoint: 'asia-southeast1-aiplatform.googleapis.com',
					credentials: mockGcpCredsWithoutProjectId.gcpCredentials,
				});
				expect(mockListIndexEndpoints).toHaveBeenCalledWith({ parent: 'projects/fallback-project-id/locations/asia-southeast1' });
			});
		});
	});
	// More describe blocks for other functionalities if needed
});
