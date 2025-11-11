/**
 * E2E Tests for VoyageAI Contextualized Embeddings
 * Tests with real API calls using provided API key
 */

import { VoyageAIClient } from 'voyageai';

// Use environment variable for API key
const API_KEY = process.env.VOYAGEAI_API_KEY || '';
const BASE_URL = 'https://api.voyageai.com/v1';

describe('VoyageAI Contextualized Embeddings E2E Tests', () => {
	let client: VoyageAIClient;

	beforeAll(() => {
		if (!API_KEY) {
			console.warn('Skipping VoyageAI E2E tests: VOYAGEAI_API_KEY environment variable not set');
		}

		client = new VoyageAIClient({
			apiKey: API_KEY,
			environment: BASE_URL,
		});
	});

	describe('Basic API Functionality', () => {
		it('should successfully call contextualized embeddings API with single document', async () => {
			if (!API_KEY) return;
			const inputs = [
				[
					'VoyageAI is a company specializing in AI embeddings.',
					'The company offers multiple embedding models.',
					'Their models are optimized for retrieval tasks.',
				],
			];

			const response = await client.contextualizedEmbed({
				inputs,
				model: 'voyage-context-3',
				inputType: 'document',
			});

			expect(response).toBeDefined();
			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(1); // One document
			expect(response.data![0]!.data!.length).toBe(3); // Three chunks
			expect(response.data![0]!.data![0]!.embedding!.length).toBe(1024); // Default 1024 dimensions
		}, 30000);

		it('should successfully call contextualized embeddings API with multiple documents', async () => {
			if (!API_KEY) return;
			const inputs = [
				['Document 1: First chunk about AI.', 'Document 1: Second chunk about machine learning.'],
				['Document 2: First chunk about embeddings.', 'Document 2: Second chunk about vectors.'],
			];

			const response = await client.contextualizedEmbed({
				inputs,
				model: 'voyage-context-3',
				inputType: 'document',
			});

			expect(response).toBeDefined();
			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(2); // Two documents
			expect(response.data![0]!.data!.length).toBe(2); // Two chunks in doc 1
			expect(response.data![1]!.data!.length).toBe(2); // Two chunks in doc 2
		}, 30000);

		it('should support different output dimensions', async () => {
			if (!API_KEY) return;
			// voyage-context-3 supports output dimensions: 256, 512, 1024, 2048
			const inputs = [['Test chunk 1', 'Test chunk 2']];

			const response = await client.contextualizedEmbed({
				inputs,
				model: 'voyage-context-3',
				inputType: 'document',
				outputDimension: 512,
			});

			// Should return 512 dimensions as specified
			expect(response.data![0]!.data![0]!.embedding!.length).toBe(512);
		}, 30000);

		it('should support different input types', async () => {
			if (!API_KEY) return;
			const inputs = [['Query about embeddings']];

			const response = await client.contextualizedEmbed({
				inputs,
				model: 'voyage-context-3',
				inputType: 'query',
			});

			expect(response.data).toBeDefined();
			expect(response.data![0]!.data![0]!.embedding!.length).toBe(1024);
		}, 30000);

		it('should handle long text inputs', async () => {
			if (!API_KEY) return;
			const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100);
			const inputs = [[longText, 'Short text']];

			const response = await client.contextualizedEmbed({
				inputs,
				model: 'voyage-context-3',
			});

			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(1);
			expect(response.data![0]!.data!.length).toBe(2);
		}, 30000);
	});

	describe('Context Preservation Test', () => {
		it('should preserve context between chunks in same document', async () => {
			if (!API_KEY) return;
			// These chunks reference each other but don't contain all info
			const inputs = [
				[
					'Apple Inc. is a technology company.',
					'The company was founded by Steve Jobs in 1976.',
					'Its market cap exceeded $3 trillion in 2024.',
				],
			];

			const response = await client.contextualizedEmbed({
				inputs,
				model: 'voyage-context-3',
				inputType: 'document',
			});

			// All chunks should have embeddings
			expect(response.data![0]!.data!.length).toBe(3);

			// Each embedding should be a 1024-dimensional vector
			response.data![0]!.data!.forEach((embeddingObj) => {
				expect(embeddingObj.embedding!.length).toBe(1024);
				expect(embeddingObj.embedding!.every((val) => typeof val === 'number')).toBe(true);
			});

			// Embeddings should be different (each chunk has unique content)
			const [emb1, emb2, emb3] = response.data![0]!.data!.map((obj) => obj.embedding!);
			expect(emb1).not.toEqual(emb2);
			expect(emb2).not.toEqual(emb3);
		}, 30000);
	});

	describe('Error Handling', () => {
		it('should handle invalid model gracefully', async () => {
			if (!API_KEY) return;
			const inputs = [['Test text']];

			await expect(
				client.contextualizedEmbed({
					inputs,
					model: 'invalid-model-name' as any,
				}),
			).rejects.toThrow();
		}, 30000);

		it('should handle empty inputs', async () => {
			if (!API_KEY) return;
			const inputs: string[][] = [[]];

			await expect(
				client.contextualizedEmbed({
					inputs,
					model: 'voyage-context-3',
				}),
			).rejects.toThrow();
		}, 30000);
	});

	describe('Batch Processing', () => {
		it('should handle multiple documents efficiently', async () => {
			if (!API_KEY) return;
			const inputs = Array.from({ length: 10 }, (_, i) => [
				`Document ${i + 1}: First chunk with important information.`,
				`Document ${i + 1}: Second chunk with related context.`,
				`Document ${i + 1}: Third chunk concluding the topic.`,
			]);

			const response = await client.contextualizedEmbed({
				inputs,
				model: 'voyage-context-3',
				inputType: 'document',
			});

			expect(response.data!.length).toBe(10);
			response.data!.forEach((docObj) => {
				expect(docObj.data!.length).toBe(3);
				docObj.data!.forEach((embeddingObj) => {
					expect(embeddingObj.embedding!.length).toBe(1024);
				});
			});
		}, 30000);
	});

	describe('Output Data Types', () => {
		it('should support float output (default)', async () => {
			if (!API_KEY) return;
			const inputs = [['Test text']];

			const response = await client.contextualizedEmbed({
				inputs,
				model: 'voyage-context-3',
				outputDtype: 'float',
			});

			expect(response.data![0]!.data![0]!.embedding!.every((val) => typeof val === 'number')).toBe(
				true,
			);
		}, 30000);

		it('should support int8 quantization', async () => {
			if (!API_KEY) return;
			// voyage-context-3 supports int8 quantization for smaller embedding sizes
			const inputs = [['Test text']];

			const response = await client.contextualizedEmbed({
				inputs,
				model: 'voyage-context-3',
				outputDtype: 'int8',
			});

			// Should return numbers (int8 values)
			expect(response.data![0]!.data![0]!.embedding!.every((val) => typeof val === 'number')).toBe(
				true,
			);
			// Int8 values should be in the range -128 to 127
			expect(
				response.data![0]!.data![0]!.embedding!.every((val) => val >= -128 && val <= 127),
			).toBe(true);
		}, 30000);
	});
});
