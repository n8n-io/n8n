/**
 * E2E Tests for VoyageAI Multimodal Embeddings
 * Tests with real API calls using provided API key
 */

import { VoyageAIClient } from 'voyageai';

// Use environment variable for API key
const API_KEY = process.env.VOYAGEAI_API_KEY || '';
const BASE_URL = 'https://api.voyageai.com/v1';

// Test image URLs (publicly accessible)
const TEST_IMAGES = {
	n8nLogo: 'https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png',
	picsum200: 'https://picsum.photos/200/300',
	picsum400: 'https://picsum.photos/400/600',
};

describe('VoyageAI Multimodal Embeddings E2E Tests', () => {
	let client: VoyageAIClient;

	beforeAll(() => {
		if (!API_KEY) {
			console.warn(
				'Skipping VoyageAI Multimodal E2E tests: VOYAGEAI_API_KEY environment variable not set',
			);
		}

		client = new VoyageAIClient({
			apiKey: API_KEY,
			environment: BASE_URL,
		});
	});

	describe('Text-Only Embeddings', () => {
		it('should successfully generate embeddings for text input', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'VoyageAI provides state-of-the-art embedding models for AI applications.',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response).toBeDefined();
			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(1);
			expect(response.data![0].embedding).toBeDefined();
			expect(response.data![0].embedding!.length).toBe(1024);
			expect(response.data![0].embedding!.every((val) => typeof val === 'number')).toBe(true);
			expect(response.model).toBe('voyage-multimodal-3');
			expect(response.usage).toBeDefined();
		}, 30000);

		it('should generate different embeddings for different texts', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'This is about artificial intelligence.',
							},
						],
					},
					{
						content: [
							{
								type: 'text',
								text: 'This is about cooking recipes.',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(2);

			const embedding1 = response.data![0]?.embedding;
			const embedding2 = response.data![1]?.embedding;

			expect(embedding1).toBeDefined();
			expect(embedding2).toBeDefined();
			expect(embedding1!.length).toBe(1024);
			expect(embedding2!.length).toBe(1024);
			expect(embedding1).not.toEqual(embedding2);
		}, 30000);
	});

	describe('Image URL Embeddings', () => {
		it('should successfully generate embeddings for image URL', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.n8nLogo,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response).toBeDefined();
			expect(response.data!.length).toBe(1);
			expect(response.data![0].embedding!.length).toBe(1024);
			expect(response.data![0].embedding!.every((val) => typeof val === 'number')).toBe(true);
		}, 30000);

		it('should generate different embeddings for different images', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.picsum200,
							},
						],
					},
					{
						content: [
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.picsum400,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(2);

			const embedding1 = response.data![0]?.embedding;
			const embedding2 = response.data![1]?.embedding;

			expect(embedding1).toBeDefined();
			expect(embedding2).toBeDefined();
			expect(embedding1!.length).toBe(1024);
			expect(embedding2!.length).toBe(1024);
			// Note: Different image sizes should produce different embeddings
			expect(embedding1).not.toEqual(embedding2);
		}, 30000);
	});

	describe('Text + Image URL Combination', () => {
		it('should successfully generate embeddings for text + image URL', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'This is the n8n workflow automation logo',
							},
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.n8nLogo,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response).toBeDefined();
			expect(response.data!.length).toBe(1);
			expect(response.data![0].embedding!.length).toBe(1024);
			expect(response.data![0].embedding!.every((val) => typeof val === 'number')).toBe(true);
		}, 30000);

		it('should produce different embeddings for text-only vs text+image', async () => {
			if (!API_KEY) return;
			const textOnly = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'This is the n8n workflow automation logo',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			const textWithImage = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'This is the n8n workflow automation logo',
							},
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.n8nLogo,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(textOnly.data![0].embedding).not.toEqual(textWithImage.data![0].embedding);
		}, 30000);
	});

	describe('Multiple Items (Batch Processing)', () => {
		it('should handle multiple mixed inputs in a single batch', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'First item: text only',
							},
						],
					},
					{
						content: [
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.n8nLogo,
							},
						],
					},
					{
						content: [
							{
								type: 'text',
								text: 'Third item: text with image',
							},
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.picsum200,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(3);
			response.data!.forEach((item) => {
				expect(item.embedding).toBeDefined();
				expect(item.embedding!.length).toBe(1024);
				expect(item.embedding!.every((val) => typeof val === 'number')).toBe(true);
			});
		}, 30000);

		it('should handle batch of 10 items efficiently', async () => {
			if (!API_KEY) return;
			const inputs = Array.from({ length: 10 }, (_, i) => ({
				content: [
					{
						type: 'text',
						text: `Item ${i + 1}: This is a test document for batch processing.`,
					},
				],
			}));

			const response = await client.multimodalEmbed({
				inputs,
				model: 'voyage-multimodal-3',
			});

			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(10);
			response.data!.forEach((item) => {
				expect(item.embedding).toBeDefined();
				expect(item.embedding!.length).toBe(1024);
			});
		}, 30000);
	});

	describe('Input Type Options', () => {
		it('should support inputType: query', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'What is the best way to use embeddings?',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: 'query',
			});

			expect(response.data!.length).toBe(1);
			expect(response.data![0].embedding!.length).toBe(1024);
		}, 30000);

		it('should support inputType: document', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'Embeddings are dense vector representations of data that capture semantic meaning.',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: 'document',
			});

			expect(response.data!.length).toBe(1);
			expect(response.data![0].embedding!.length).toBe(1024);
		}, 30000);

		it('should produce different embeddings for query vs document input types', async () => {
			if (!API_KEY) return;
			const text = 'Understanding machine learning concepts';

			const queryResponse = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: 'query',
			});

			const documentResponse = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: 'document',
			});

			// Different input types should produce different embeddings
			expect(queryResponse.data![0].embedding).not.toEqual(documentResponse.data![0].embedding);
		}, 30000);
	});

	describe('Truncation Option', () => {
		it('should support truncation: true for long text', async () => {
			if (!API_KEY) return;
			const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(1000);

			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: longText,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				truncation: true,
			});

			expect(response.data!.length).toBe(1);
			expect(response.data![0].embedding!.length).toBe(1024);
		}, 30000);

		it('should support truncation: false (may error on very long text)', async () => {
			if (!API_KEY) return;
			const shortText = 'This is a short text that will not be truncated.';

			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: shortText,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				truncation: false,
			});

			expect(response.data!.length).toBe(1);
			expect(response.data![0].embedding!.length).toBe(1024);
		}, 30000);
	});

	describe('Error Handling', () => {
		it('should handle invalid model name', async () => {
			if (!API_KEY) return;
			await expect(
				client.multimodalEmbed({
					inputs: [
						{
							content: [
								{
									type: 'text',
									text: 'Test text',
								},
							],
						},
					],
					model: 'invalid-model-name' as any,
				}),
			).rejects.toThrow();
		}, 30000);

		it('should handle empty content array', async () => {
			if (!API_KEY) return;
			await expect(
				client.multimodalEmbed({
					inputs: [
						{
							content: [],
						},
					],
					model: 'voyage-multimodal-3',
				}),
			).rejects.toThrow();
		}, 30000);

		it('should handle invalid image URL', async () => {
			if (!API_KEY) return;
			await expect(
				client.multimodalEmbed({
					inputs: [
						{
							content: [
								{
									type: 'image_url',
									imageUrl: 'https://invalid-url-that-does-not-exist-12345.com/image.jpg',
								},
							],
						},
					],
					model: 'voyage-multimodal-3',
				}),
			).rejects.toThrow();
		}, 30000);

		it('should handle empty inputs array', async () => {
			if (!API_KEY) return;
			await expect(
				client.multimodalEmbed({
					inputs: [],
					model: 'voyage-multimodal-3',
				}),
			).rejects.toThrow();
		}, 30000);
	});

	describe('Response Structure Validation', () => {
		it('should return correct response structure', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'Test text for response structure validation',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			// Validate response structure
			expect(response).toHaveProperty('data');
			expect(response).toHaveProperty('model');
			expect(response).toHaveProperty('usage');

			// Validate data array
			expect(Array.isArray(response.data)).toBe(true);
			expect(response.data!.length).toBeGreaterThan(0);

			// Validate embedding object
			const embeddingObj = response.data![0];
			expect(embeddingObj).toHaveProperty('embedding');
			expect(embeddingObj).toHaveProperty('index');

			// Validate embedding is array of numbers
			expect(Array.isArray(embeddingObj.embedding)).toBe(true);
			expect(embeddingObj.embedding!.length).toBe(1024);
			expect(embeddingObj.embedding!.every((val) => typeof val === 'number')).toBe(true);

			// Validate usage
			expect(response.usage).toBeDefined();
			// The API returns totalTokens (camelCase) not total_tokens
			expect(response.usage).toHaveProperty('totalTokens');
			expect(typeof response.usage!.totalTokens).toBe('number');
		}, 30000);

		it('should have embeddings with correct dimensionality (1024)', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'Dimensionality test',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response.data![0].embedding!.length).toBe(1024);
		}, 30000);

		it('should have numeric embeddings (floats)', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'Numeric validation test',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			const embedding = response.data![0].embedding;

			// All values should be numbers
			expect(embedding!.every((val) => typeof val === 'number')).toBe(true);

			// Should have both positive and negative values (typical for embeddings)
			const hasPositive = embedding!.some((val) => val > 0);
			const hasNegative = embedding!.some((val) => val < 0);

			expect(hasPositive).toBe(true);
			expect(hasNegative).toBe(true);
		}, 30000);
	});

	describe('Binary Image Processing (Data URI)', () => {
		it('should successfully process base64 encoded image', async () => {
			if (!API_KEY) return;
			// Create a minimal 1x1 red PNG in base64
			const redPixelPNG =
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
			const dataUri = `data:image/png;base64,${redPixelPNG}`;

			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'image_base64',
								imageBase64: dataUri,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response.data!.length).toBe(1);
			expect(response.data![0].embedding!.length).toBe(1024);
		}, 30000);

		it('should process text + base64 image combination', async () => {
			if (!API_KEY) return;
			const redPixelPNG =
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
			const dataUri = `data:image/png;base64,${redPixelPNG}`;

			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'This is a red pixel image',
							},
							{
								type: 'image_base64',
								imageBase64: dataUri,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response.data!.length).toBe(1);
			expect(response.data![0].embedding!.length).toBe(1024);
		}, 30000);

		it('should handle multiple base64 images', async () => {
			if (!API_KEY) return;
			const redPixelPNG =
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
			const bluePixelPNG =
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'image_base64',
								imageBase64: `data:image/png;base64,${redPixelPNG}`,
							},
						],
					},
					{
						content: [
							{
								type: 'image_base64',
								imageBase64: `data:image/png;base64,${bluePixelPNG}`,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
			});

			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(2);
			response.data!.forEach((item) => {
				expect(item.embedding).toBeDefined();
				expect(item.embedding!.length).toBe(1024);
			});
		}, 30000);
	});

	describe('Real-World Use Cases', () => {
		it('should handle product description + image scenario', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'n8n is a powerful workflow automation tool that helps you connect different services and automate tasks.',
							},
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.n8nLogo,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: 'document',
			});

			expect(response.data![0].embedding!.length).toBe(1024);
		}, 30000);

		it('should handle search query scenario', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'automation workflow tool with visual interface',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: 'query',
			});

			expect(response.data![0].embedding!.length).toBe(1024);
		}, 30000);

		it('should handle multiple products for similarity search', async () => {
			if (!API_KEY) return;
			const response = await client.multimodalEmbed({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'Product 1: Automation software',
							},
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.n8nLogo,
							},
						],
					},
					{
						content: [
							{
								type: 'text',
								text: 'Product 2: Random image placeholder',
							},
							{
								type: 'image_url',
								imageUrl: TEST_IMAGES.picsum200,
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: 'document',
			});

			expect(response.data).toBeDefined();
			expect(response.data!.length).toBe(2);

			// Embeddings can be used for similarity calculation
			const embedding1 = response.data![0]?.embedding;
			const embedding2 = response.data![1]?.embedding;

			expect(embedding1).toBeDefined();
			expect(embedding2).toBeDefined();

			// Calculate cosine similarity (simplified)
			const dotProduct = embedding1!.reduce((sum, val, i) => sum + val * embedding2![i]!, 0);
			const magnitude1 = Math.sqrt(embedding1!.reduce((sum, val) => sum + val * val, 0));
			const magnitude2 = Math.sqrt(embedding2!.reduce((sum, val) => sum + val * val, 0));
			const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);

			// Similarity should be between -1 and 1
			expect(cosineSimilarity).toBeGreaterThanOrEqual(-1);
			expect(cosineSimilarity).toBeLessThanOrEqual(1);
		}, 30000);
	});
});
