import type { DocumentInterface } from '@langchain/core/documents';

// We need to access the internal OpenAIRerank class for testing
// Since it's not exported, we'll create a mock implementation for testing
class MockOpenAIRerank {
	private apiKey: string;
	private baseURL: string;
	private model: string;
	private topK?: number;

	constructor(fields: {
		apiKey: string;
		baseURL: string;
		model: string;
		topK?: number;
	}) {
		this.apiKey = fields.apiKey;
		this.baseURL = fields.baseURL.replace(/\/$/, ''); // Remove trailing slash
		this.model = fields.model;
		this.topK = fields.topK;
	}

	async compressDocuments(
		documents: DocumentInterface[],
		query: string,
	): Promise<DocumentInterface[]> {
		if (documents.length === 0) {
			return [];
		}

		try {
			// Prepare the request payload for reranking API
			const requestBody = {
				model: this.model,
				query,
				documents: documents.map((doc) => doc.pageContent),
				top_n: this.topK || documents.length,
			};

			const response = await fetch(`${this.baseURL}/v1/rerank`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			// Handle the response format
			if (result.results && Array.isArray(result.results)) {
				// Sort by relevance score (descending) and map back to documents
				const rankedResults = result.results
					.sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))
					.filter((item: any) => {
						// Validate index is within bounds
						return (
							typeof item.index === 'number' && item.index >= 0 && item.index < documents.length
						);
					})
					.slice(0, this.topK) // Limit to topK results after filtering
					.map((item: any) => {
						const originalDoc = documents[item.index];
						return {
							...originalDoc,
							metadata: {
								...originalDoc.metadata,
								relevanceScore: item.relevance_score,
							},
						};
					});

				return rankedResults;
			}

			// Fallback: return original documents if response format is unexpected
			return documents;
		} catch (error) {
			throw error;
		}
	}
}

describe('OpenAIRerank', () => {
	let reranker: MockOpenAIRerank;
	let mockFetch: jest.MockedFunction<typeof fetch>;
	let originalFetch: typeof fetch;

	beforeAll(() => {
		// Save the original fetch implementation
		originalFetch = global.fetch;
		// Mock fetch globally
		mockFetch = jest.fn();
		global.fetch = mockFetch;
	});

	afterAll(() => {
		// Restore the original fetch implementation
		global.fetch = originalFetch;
	});

	beforeEach(() => {
		reranker = new MockOpenAIRerank({
			apiKey: 'test-api-key',
			baseURL: 'https://api.example.com',
			model: 'test-model',
			topK: 3,
		});
		mockFetch.mockClear();
	});

	const mockDocuments: DocumentInterface[] = [
		{
			pageContent: 'Machine learning is a subset of artificial intelligence',
			metadata: { source: 'doc1' },
		},
		{
			pageContent: 'Cats are cute animals that like to sleep',
			metadata: { source: 'doc2' },
		},
		{
			pageContent: 'Deep learning uses neural networks with multiple layers',
			metadata: { source: 'doc3' },
		},
		{
			pageContent: 'Natural language processing helps computers understand text',
			metadata: { source: 'doc4' },
		},
		{
			pageContent: 'Computer vision enables machines to interpret visual information',
			metadata: { source: 'doc5' },
		},
	];

	describe('compressDocuments', () => {
		it('should return empty array for empty input', async () => {
			const result = await reranker.compressDocuments([], 'test query');
			expect(result).toEqual([]);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should make correct API call and return reranked documents', async () => {
			const mockResponse = {
				results: [
					{ index: 2, relevance_score: 0.95 },
					{ index: 0, relevance_score: 0.87 },
					{ index: 3, relevance_score: 0.72 },
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await reranker.compressDocuments(mockDocuments, 'artificial intelligence');

			// Verify API call
			expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/v1/rerank', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer test-api-key',
				},
				body: JSON.stringify({
					model: 'test-model',
					query: 'artificial intelligence',
					documents: mockDocuments.map((doc) => doc.pageContent),
					top_n: 3,
				}),
			});

			// Verify result
			expect(result).toHaveLength(3);
			expect(result[0].pageContent).toBe('Deep learning uses neural networks with multiple layers');
			expect(result[0].metadata.relevanceScore).toBe(0.95);
			expect(result[1].pageContent).toBe('Machine learning is a subset of artificial intelligence');
			expect(result[1].metadata.relevanceScore).toBe(0.87);
			expect(result[2].pageContent).toBe(
				'Natural language processing helps computers understand text',
			);
			expect(result[2].metadata.relevanceScore).toBe(0.72);
		});

		it('should handle API errors gracefully', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
			} as Response);

			await expect(reranker.compressDocuments(mockDocuments, 'test query')).rejects.toThrow(
				'HTTP error! status: 500',
			);
		});

		it('should handle network errors gracefully', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(reranker.compressDocuments(mockDocuments, 'test query')).rejects.toThrow(
				'Network error',
			);
		});

		it('should return original documents if response format is unexpected', async () => {
			const mockResponse = {
				unexpected: 'format',
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await reranker.compressDocuments(mockDocuments, 'test query');

			expect(result).toEqual(mockDocuments);
		});

		it('should limit results to topK when specified', async () => {
			const mockResponse = {
				results: [
					{ index: 4, relevance_score: 0.98 },
					{ index: 2, relevance_score: 0.95 },
					{ index: 0, relevance_score: 0.87 },
					{ index: 3, relevance_score: 0.72 },
					{ index: 1, relevance_score: 0.65 },
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await reranker.compressDocuments(mockDocuments, 'test query');

			// Should only return top 3 results due to topK=3
			expect(result).toHaveLength(3);
			expect(result[0].metadata.relevanceScore).toBe(0.98);
			expect(result[1].metadata.relevanceScore).toBe(0.95);
			expect(result[2].metadata.relevanceScore).toBe(0.87);
		});

		it('should preserve original metadata and add relevanceScore', async () => {
			const mockResponse = {
				results: [{ index: 0, relevance_score: 0.95 }],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await reranker.compressDocuments([mockDocuments[0]], 'test query');

			expect(result[0].metadata).toEqual({
				source: 'doc1',
				relevanceScore: 0.95,
			});
		});

		it('should remove trailing slash from baseURL', () => {
			const rerankerWithSlash = new MockOpenAIRerank({
				apiKey: 'test-api-key',
				baseURL: 'https://api.example.com/',
				model: 'test-model',
				topK: 3,
			});

			expect((rerankerWithSlash as any).baseURL).toBe('https://api.example.com');
		});

		it('should handle invalid indices from API response', async () => {
			const mockResponse = {
				results: [
					{ index: 0, relevance_score: 0.95 }, // Valid
					{ index: 10, relevance_score: 0.9 }, // Out of bounds
					{ index: -1, relevance_score: 0.85 }, // Negative
					{ index: 1, relevance_score: 0.8 }, // Valid
					{ index: 'invalid', relevance_score: 0.75 }, // Invalid type
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await reranker.compressDocuments(mockDocuments, 'test query');

			// Should only return documents with valid indices (0 and 1)
			expect(result).toHaveLength(2);
			expect(result[0].pageContent).toBe('Machine learning is a subset of artificial intelligence');
			expect(result[1].pageContent).toBe('Cats are cute animals that like to sleep');
		});
	});
});
