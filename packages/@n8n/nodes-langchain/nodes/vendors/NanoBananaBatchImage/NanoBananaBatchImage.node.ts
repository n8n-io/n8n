import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type {
	AspectRatio,
	HarmBlockThreshold,
	ImageGenerationRequest,
	ImageMimeType,
	ImageSize,
	PersonGeneration,
	Provider,
} from './helpers/interfaces';
import type { BaseImageProvider } from './helpers/providers/base.provider';
import { NanoBananaProvider } from './helpers/providers/nanoBanana.provider';
import { WuyinkeProvider } from './helpers/providers/wuyinke.provider';

export class NanoBananaBatchImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nano Banana Batch Image',
		name: 'nanoBananaBatchImage',
		icon: 'file:nanoBanana.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Batch generate images using Gemini 3 Pro Image Preview with dual-provider support',
		defaults: {
			name: 'Nano Banana Batch Image',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'nanoBananaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Batch Generate',
						value: 'batchGenerate',
						description: 'Generate multiple images in parallel from prompts',
						action: 'Batch generate images',
					},
				],
				default: 'batchGenerate',
			},
			// Provider selection
			{
				displayName: 'Provider',
				name: 'provider',
				type: 'options',
				options: [
					{
						name: 'Auto (Load Balance)',
						value: 'auto',
						description: 'Automatically distribute requests between providers when parallel > 2',
					},
					{
						name: 'NanoBanana (Google AI)',
						value: 'nanoBanana',
						description: 'Use Google AI Platform / Gemini API only',
					},
					{
						name: 'Wuyinke',
						value: 'wuyinke',
						description: 'Use Wuyinke API only',
					},
				],
				default: 'auto',
				description: 'Select image generation provider',
			},
			// Failover toggle
			{
				displayName: 'Enable Failover',
				name: 'enableFailover',
				type: 'boolean',
				default: true,
				description: 'Whether to try backup provider if primary fails',
			},
			// Model selection (for NanoBanana provider)
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'Gemini 3 Pro Image Preview',
						value: 'gemini-3-pro-image-preview',
					},
					{
						name: 'Gemini 2.0 Flash',
						value: 'gemini-2.0-flash-exp',
					},
				],
				default: 'gemini-3-pro-image-preview',
				description: 'The model to use for image generation (NanoBanana provider)',
			},
			// Prompt field - for each input item
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 3,
				},
				description:
					'Text description of the image to generate. Use expressions to map from input data.',
				placeholder: 'e.g. {{ $json.prompt }} or "A cute cat eating a dinosaur"',
			},
			// Reference image URLs - optional, supports array of URLs (max 14)
			{
				displayName: 'Reference Image URLs',
				name: 'referenceImageUrls',
				type: 'json',
				default: '[]',
				description:
					'Array of reference image URLs for image-to-image generation (max 14). Use expression {{ $JSON.imageUrls }} or a JSON array ["url1", "url2"].',
				placeholder:
					'e.g. {{ $json.imageUrls }} or ["https://example.com/1.png", "https://example.com/2.png"]',
			},
			// System instruction
			{
				displayName: 'System Instruction',
				name: 'systemInstruction',
				type: 'string',
				default: 'image',
				description:
					'System instruction to guide the model (e.g., "image" for image generation mode)',
			},
			// Options collection
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Aspect Ratio',
						name: 'aspectRatio',
						type: 'options',
						options: [
							{ name: '1:1 (Square)', value: '1:1' },
							{ name: '16:9 (Landscape)', value: '16:9' },
							{ name: '3:4', value: '3:4' },
							{ name: '4:3', value: '4:3' },
							{ name: '9:16 (Portrait)', value: '9:16' },
						],
						default: '1:1',
						description: 'Aspect ratio of the generated image',
					},
					{
						displayName: 'Image Size',
						name: 'imageSize',
						type: 'options',
						options: [
							{ name: '1K', value: '1K' },
							{ name: '2K', value: '2K' },
							{ name: '4K', value: '4K' },
						],
						default: '1K',
						description: 'Resolution of the generated image',
					},
					{
						displayName: 'Output Format',
						name: 'mimeType',
						type: 'options',
						options: [
							{ name: 'PNG', value: 'image/png' },
							{ name: 'JPEG', value: 'image/jpeg' },
							{ name: 'WebP', value: 'image/webp' },
						],
						default: 'image/png',
						description: 'Output image format (NanoBanana only)',
					},
					{
						displayName: 'Person Generation',
						name: 'personGeneration',
						type: 'options',
						options: [
							{ name: 'Allow All', value: 'ALLOW_ALL' },
							{ name: 'Allow Adult Only', value: 'ALLOW_ADULT' },
							{ name: "Don't Allow", value: 'DONT_ALLOW' },
						],
						default: 'ALLOW_ALL',
						description: 'Control generation of people in images (NanoBanana only)',
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 2,
							numberPrecision: 1,
						},
						default: 1,
						description: 'Controls randomness in generation (0-2, NanoBanana only)',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 0.95,
						description: 'Nucleus sampling parameter (NanoBanana only)',
					},
					{
						displayName: 'Max Output Tokens',
						name: 'maxOutputTokens',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 32768,
						description: 'Maximum tokens in the response (NanoBanana only)',
					},
					{
						displayName: 'Safety Threshold',
						name: 'safetyThreshold',
						type: 'options',
						options: [
							{ name: 'Block Low and Above', value: 'BLOCK_LOW_AND_ABOVE' },
							{ name: 'Block Medium and Above', value: 'BLOCK_MEDIUM_AND_ABOVE' },
							{ name: 'Block None', value: 'BLOCK_NONE' },
							{ name: 'Block Only High', value: 'BLOCK_ONLY_HIGH' },
							{ name: 'Off (No Filtering)', value: 'OFF' },
						],
						default: 'OFF',
						description: 'Safety filtering threshold for all categories (NanoBanana only)',
					},
					{
						displayName: 'Output Property Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Name of the binary property to store the generated image',
					},
					{
						displayName: 'Parallel Requests',
						name: 'parallelRequests',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 20,
						},
						default: 5,
						description:
							'Number of parallel API requests. When > 2 and Provider is Auto, enables round-robin load balancing.',
					},
					{
						displayName: 'Wait Timeout (Wuyinke)',
						name: 'waitTimeout',
						type: 'number',
						typeOptions: {
							minValue: 30,
							maxValue: 600,
						},
						default: 300,
						description:
							'Max seconds to wait for Wuyinke async generation (only applies when using Wuyinke provider)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get parameters
		const provider = this.getNodeParameter('provider', 0) as Provider;
		const enableFailover = this.getNodeParameter('enableFailover', 0) as boolean;
		const model = this.getNodeParameter('model', 0) as string;
		const systemInstruction = this.getNodeParameter('systemInstruction', 0) as string;
		const options = this.getNodeParameter('options', 0, {}) as {
			aspectRatio?: AspectRatio;
			imageSize?: ImageSize;
			mimeType?: ImageMimeType;
			personGeneration?: PersonGeneration;
			temperature?: number;
			topP?: number;
			maxOutputTokens?: number;
			safetyThreshold?: HarmBlockThreshold;
			binaryPropertyName?: string;
			parallelRequests?: number;
			waitTimeout?: number;
		};

		const parallelRequests = options.parallelRequests ?? 5;
		const binaryPropertyName = options.binaryPropertyName ?? 'data';

		// Create provider instances
		const providerInstances: Record<'nanoBanana' | 'wuyinke', BaseImageProvider> = {
			nanoBanana: new NanoBananaProvider(this),
			wuyinke: new WuyinkeProvider(this),
		};

		// Determine if auto load-balancing should be used
		// Only when provider is 'auto' AND parallelRequests > 2
		const useAutoDistribution = provider === 'auto' && parallelRequests > 2;

		// Default provider order (NanoBanana primary, Wuyinke backup)
		const defaultProviders: BaseImageProvider[] =
			provider === 'wuyinke'
				? [providerInstances.wuyinke, providerInstances.nanoBanana]
				: [providerInstances.nanoBanana, providerInstances.wuyinke];

		/**
		 * Process a single item with failover support
		 */
		const processItem = async (
			index: number,
			itemProviders: BaseImageProvider[],
		): Promise<INodeExecutionData[]> => {
			const prompt = this.getNodeParameter('prompt', index, '') as string;
			const referenceImageUrlsInput = this.getNodeParameter('referenceImageUrls', index, []) as
				| string
				| string[];

			if (!prompt) {
				throw new NodeOperationError(this.getNode(), 'Prompt is required', {
					itemIndex: index,
				});
			}

			// Parse reference image URLs
			let imageUrls: string[] = [];
			if (typeof referenceImageUrlsInput === 'string') {
				try {
					const parsed = JSON.parse(referenceImageUrlsInput);
					if (Array.isArray(parsed)) {
						imageUrls = parsed.filter(
							(url): url is string => typeof url === 'string' && url.trim() !== '',
						);
					}
				} catch {
					if (referenceImageUrlsInput.trim() !== '' && referenceImageUrlsInput.trim() !== '[]') {
						imageUrls = [referenceImageUrlsInput.trim()];
					}
				}
			} else if (Array.isArray(referenceImageUrlsInput)) {
				imageUrls = referenceImageUrlsInput.filter(
					(url): url is string => typeof url === 'string' && url.trim() !== '',
				);
			}

			// Limit to 14 images max
			const limitedUrls = imageUrls.slice(0, 14);

			// Build normalized request
			const request: ImageGenerationRequest = {
				prompt,
				referenceImageUrls: limitedUrls.length > 0 ? limitedUrls : undefined,
				aspectRatio: options.aspectRatio ?? '1:1',
				imageSize: options.imageSize ?? '1K',
				mimeType: options.mimeType ?? 'image/png',
				model,
				systemInstruction,
				temperature: options.temperature ?? 1,
				topP: options.topP ?? 0.95,
				maxOutputTokens: options.maxOutputTokens ?? 32768,
				safetyThreshold: options.safetyThreshold ?? 'OFF',
				personGeneration: options.personGeneration ?? 'ALLOW_ALL',
			};

			let lastError: Error | undefined;
			let usedProvider: string | undefined;

			// Try each provider with failover
			for (let providerIndex = 0; providerIndex < itemProviders.length; providerIndex++) {
				// Only try backup provider if failover is enabled
				if (providerIndex > 0 && !enableFailover) {
					break;
				}

				const activeProvider = itemProviders[providerIndex];
				usedProvider = activeProvider.providerType;

				try {
					const result = await activeProvider.generate(request);

					if (result.success && result.imageData) {
						// Success - return the image
						const binaryData = await this.helpers.prepareBinaryData(
							result.imageData,
							'generated_image.png',
							result.mimeType ?? 'image/png',
						);

						return [
							{
								json: {
									prompt,
									referenceImageUrls: limitedUrls.length > 0 ? limitedUrls : undefined,
									mimeType: result.mimeType,
									model,
									provider: activeProvider.providerType,
									success: true,
								},
								binary: {
									[binaryPropertyName]: binaryData,
								},
								pairedItem: { item: index },
							},
						];
					}

					// Provider returned failure (not exception)
					if (!result.success) {
						lastError = new Error(result.error || 'Image generation failed');

						// If there's a text response, include it in the error
						if (result.textResponse) {
							return [
								{
									json: {
										prompt,
										referenceImageUrls: limitedUrls.length > 0 ? limitedUrls : undefined,
										model,
										provider: activeProvider.providerType,
										success: false,
										error: result.error || 'No image was generated',
										textResponse: result.textResponse,
									},
									pairedItem: { item: index },
								},
							];
						}

						// Continue to next provider if failover enabled
						continue;
					}
				} catch (error) {
					lastError = error instanceof Error ? error : new Error(String(error));
					// Log and continue to next provider
					this.logger.warn(
						`Provider ${activeProvider.providerType} failed for item ${index}: ${lastError.message}`,
					);
					continue;
				}
			}

			// All providers failed
			if (this.continueOnFail()) {
				return [
					{
						json: {
							prompt,
							referenceImageUrls: limitedUrls.length > 0 ? limitedUrls : undefined,
							model,
							provider: usedProvider,
							success: false,
							error: lastError?.message || 'All providers failed',
						},
						pairedItem: { item: index },
					},
				];
			}

			throw new NodeOperationError(
				this.getNode(),
				lastError?.message || 'All providers failed to generate image',
				{ itemIndex: index },
			);
		};

		/**
		 * Process a batch of items
		 */
		const processBatch = async (batchItems: Array<{ index: number }>) => {
			const promises = batchItems.map(async ({ index }) => {
				let itemProviders: BaseImageProvider[];

				if (useAutoDistribution) {
					// Round-robin: alternate based on item index
					const primaryIndex = index % 2;
					const providerKeys: Array<'nanoBanana' | 'wuyinke'> = ['nanoBanana', 'wuyinke'];
					itemProviders = [
						providerInstances[providerKeys[primaryIndex]],
						providerInstances[providerKeys[1 - primaryIndex]],
					];
				} else {
					itemProviders = defaultProviders;
				}

				try {
					return await processItem(index, itemProviders);
				} catch (error) {
					if (this.continueOnFail()) {
						return [
							{
								json: {
									error: error instanceof Error ? error.message : String(error),
									success: false,
								},
								pairedItem: { item: index },
							},
						];
					}
					throw error;
				}
			});

			return await Promise.all(promises);
		};

		// Split items into batches
		const itemsWithIndex = items.map((_, index) => ({ index }));
		const batches: Array<Array<{ index: number }>> = [];

		for (let i = 0; i < itemsWithIndex.length; i += parallelRequests) {
			batches.push(itemsWithIndex.slice(i, i + parallelRequests));
		}

		// Process batches sequentially, items within batches in parallel
		for (const batch of batches) {
			const batchResults = await processBatch(batch);
			for (const results of batchResults) {
				returnData.push.apply(returnData, results);
			}
		}

		return [returnData];
	}
}
