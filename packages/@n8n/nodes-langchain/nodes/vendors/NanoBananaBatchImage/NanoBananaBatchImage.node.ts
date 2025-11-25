import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type {
	AspectRatio,
	Content,
	ContentPart,
	GeminiImageRequest,
	GeminiImageResponse,
	HarmBlockThreshold,
	ImageMimeType,
	ImageSize,
	PersonGeneration,
	SafetySetting,
} from './helpers/interfaces';
import { apiRequest, downloadImage, getMimeTypeFromUrl, imageToBase64 } from './helpers/transport';

export class NanoBananaBatchImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nano Banana Batch Image',
		name: 'nanoBananaBatchImage',
		icon: 'file:nanoBanana.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Batch generate images using Gemini 3 Pro Image Preview',
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
			// Model selection
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
				description: 'The model to use for image generation',
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
					'Array of reference image URLs for image-to-image generation (max 14). Use expression {{ $json.imageUrls }} or JSON array ["url1", "url2"].',
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
							{ name: '9:16 (Portrait)', value: '9:16' },
							{ name: '4:3', value: '4:3' },
							{ name: '3:4', value: '3:4' },
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
						description: 'Output image format',
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
						description: 'Control generation of people in images',
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
						description: 'Controls randomness in generation (0-2)',
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
						description: 'Nucleus sampling parameter',
					},
					{
						displayName: 'Max Output Tokens',
						name: 'maxOutputTokens',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 32768,
						description: 'Maximum tokens in the response',
					},
					{
						displayName: 'Safety Threshold',
						name: 'safetyThreshold',
						type: 'options',
						options: [
							{ name: 'Off (No Filtering)', value: 'OFF' },
							{ name: 'Block None', value: 'BLOCK_NONE' },
							{ name: 'Block Low and Above', value: 'BLOCK_LOW_AND_ABOVE' },
							{ name: 'Block Medium and Above', value: 'BLOCK_MEDIUM_AND_ABOVE' },
							{ name: 'Block Only High', value: 'BLOCK_ONLY_HIGH' },
						],
						default: 'OFF',
						description: 'Safety filtering threshold for all categories',
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
						description: 'Number of parallel API requests to make',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

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
		};

		const parallelRequests = options.parallelRequests ?? 5;
		const binaryPropertyName = options.binaryPropertyName ?? 'data';

		// Build safety settings
		const safetyThreshold = options.safetyThreshold ?? 'OFF';
		const safetySettings: SafetySetting[] = [
			{ category: 'HARM_CATEGORY_HATE_SPEECH', threshold: safetyThreshold },
			{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: safetyThreshold },
			{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: safetyThreshold },
			{ category: 'HARM_CATEGORY_HARASSMENT', threshold: safetyThreshold },
		];

		// Process items in batches for parallel execution
		const processBatch = async (batchItems: Array<{ index: number }>) => {
			const promises = batchItems.map(async ({ index }) => {
				try {
					const prompt = this.getNodeParameter('prompt', index, '') as string;
					const referenceImageUrlsInput = this.getNodeParameter('referenceImageUrls', index, []) as
						| string
						| string[];

					if (!prompt) {
						throw new NodeOperationError(this.getNode(), 'Prompt is required', {
							itemIndex: index,
						});
					}

					// Build content parts
					const parts: ContentPart[] = [{ text: prompt }];

					// Parse reference image URLs - handle both string (JSON) and array inputs
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
							// If not valid JSON, treat as single URL if not empty
							if (
								referenceImageUrlsInput.trim() !== '' &&
								referenceImageUrlsInput.trim() !== '[]'
							) {
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

					// Download and include all reference images
					for (const imageUrl of limitedUrls) {
						const imageBuffer = await downloadImage.call(this, imageUrl);
						const base64Image = imageToBase64(imageBuffer);
						const mimeType = getMimeTypeFromUrl(imageUrl);

						parts.unshift({
							inlineData: {
								mimeType,
								data: base64Image,
							},
						});
					}

					const contents: Content[] = [
						{
							role: 'user',
							parts,
						},
					];

					// Build request body
					const requestBody: GeminiImageRequest = {
						contents,
						systemInstruction: {
							parts: [{ text: systemInstruction }],
						},
						generationConfig: {
							temperature: options.temperature ?? 1,
							maxOutputTokens: options.maxOutputTokens ?? 32768,
							responseModalities: ['TEXT', 'IMAGE'],
							topP: options.topP ?? 0.95,
							imageConfig: {
								aspectRatio: options.aspectRatio ?? '1:1',
								imageSize: options.imageSize ?? '1K',
								imageOutputOptions: {
									mimeType: options.mimeType ?? 'image/png',
								},
								personGeneration: options.personGeneration ?? 'ALLOW_ALL',
							},
						},
						safetySettings,
					};

					// Make API request
					const endpoint = `/v1/publishers/google/models/${model}:streamGenerateContent`;
					const response = (await apiRequest.call(this, 'POST', endpoint, {
						body: requestBody,
					})) as GeminiImageResponse | GeminiImageResponse[];

					// Handle streaming response (array of responses)
					const responses = Array.isArray(response) ? response : [response];

					// Find the response with image data
					const outputItems: INodeExecutionData[] = [];

					for (const resp of responses) {
						if (resp.error) {
							throw new NodeOperationError(this.getNode(), `API Error: ${resp.error.message}`, {
								itemIndex: index,
							});
						}

						if (!resp.candidates || resp.candidates.length === 0) {
							continue;
						}

						for (const candidate of resp.candidates) {
							for (const part of candidate.content.parts) {
								if ('inlineData' in part && part.inlineData) {
									const buffer = Buffer.from(part.inlineData.data, 'base64');
									const binaryData = await this.helpers.prepareBinaryData(
										buffer,
										'generated_image.png',
										part.inlineData.mimeType,
									);

									outputItems.push({
										json: {
											prompt,
											referenceImageUrls: limitedUrls.length > 0 ? limitedUrls : undefined,
											mimeType: part.inlineData.mimeType,
											model,
											success: true,
										},
										binary: {
											[binaryPropertyName]: binaryData,
										},
										pairedItem: { item: index },
									});
								}
							}
						}
					}

					// If no images were generated, return an error item
					if (outputItems.length === 0) {
						// Check if there's text response
						let textResponse = '';
						for (const resp of responses) {
							for (const candidate of resp.candidates ?? []) {
								for (const part of candidate.content.parts) {
									if ('text' in part) {
										textResponse += part.text;
									}
								}
							}
						}

						return [
							{
								json: {
									prompt,
									referenceImageUrls: limitedUrls.length > 0 ? limitedUrls : undefined,
									model,
									success: false,
									error: 'No image was generated',
									textResponse: textResponse || undefined,
								},
								pairedItem: { item: index },
							},
						];
					}

					return outputItems;
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
				returnData.push(...results);
			}
		}

		return [returnData];
	}
}
