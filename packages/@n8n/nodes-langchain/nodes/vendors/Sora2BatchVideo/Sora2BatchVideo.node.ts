import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type {
	AspectRatio,
	Model,
	NodeOptions,
	Operation,
	Provider,
	VideoGenerationRequest,
	VideoResult,
} from './helpers/interfaces';
import { BaseSora2Provider } from './helpers/providers/base.provider';
import { TtapiProvider } from './helpers/providers/ttapi.provider';
import { WuyinkeProvider } from './helpers/providers/wuyinke.provider';

/**
 * Process a single item with failover support
 */
async function processItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	providers: BaseSora2Provider[],
	enableFailover: boolean,
	model: Model,
	waitTimeout: number,
	pollingInterval: number,
): Promise<VideoResult> {
	const operation = ctx.getNodeParameter('operation', itemIndex) as Operation;
	const prompt = ctx.getNodeParameter('prompt', itemIndex) as string;
	const aspectRatio = ctx.getNodeParameter('aspectRatio', itemIndex) as AspectRatio;

	// Get duration based on model
	const duration =
		model === 'sora2pro'
			? (ctx.getNodeParameter('durationPro', itemIndex) as number)
			: (ctx.getNodeParameter('duration', itemIndex) as number);

	// Get reference image URL for image2video
	const referenceImageUrl =
		operation === 'image2video'
			? (ctx.getNodeParameter('referenceImageUrl', itemIndex, '') as string)
			: undefined;

	if (!prompt) {
		return {
			success: false,
			taskId: '',
			provider: providers[0].providerType,
			prompt: '',
			duration,
			aspectRatio,
			error: 'Prompt is required',
			itemIndex,
		};
	}

	const request: VideoGenerationRequest = {
		prompt,
		operation,
		model,
		duration,
		aspectRatio,
		referenceImageUrl: referenceImageUrl || undefined,
	};

	let lastError: Error | undefined;

	// Try each provider with failover
	for (let providerIndex = 0; providerIndex < providers.length; providerIndex++) {
		// Only try backup if failover is enabled
		if (providerIndex > 0 && !enableFailover) {
			break;
		}

		const activeProvider = providers[providerIndex];

		try {
			// Submit the request
			const submitResponse = await activeProvider.submit(request);

			// Wait for completion
			const statusResponse = await activeProvider.waitForCompletion(
				submitResponse.taskId,
				waitTimeout,
				pollingInterval,
			);

			return {
				success: true,
				taskId: submitResponse.taskId,
				provider: activeProvider.providerType,
				videoUrl: statusResponse.videoUrl,
				prompt,
				duration,
				aspectRatio,
				itemIndex,
			};
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Log the error for debugging
			ctx.logger.warn(
				`Provider ${activeProvider.providerType} failed for item ${itemIndex}: ${lastError.message}`,
			);

			// If this is the last provider or failover is disabled, we'll handle outside the loop
		}
	}

	// All providers failed
	if (ctx.continueOnFail()) {
		return {
			success: false,
			taskId: '',
			provider: providers[providers.length - 1].providerType,
			prompt,
			duration,
			aspectRatio,
			error: lastError?.message ?? 'All providers failed',
			itemIndex,
		};
	}

	throw new NodeOperationError(ctx.getNode(), lastError?.message ?? 'All providers failed', {
		itemIndex,
	});
}

export class Sora2BatchVideo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sora2 Batch Video',
		name: 'sora2BatchVideo',
		icon: 'file:sora2.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + " - " + $parameter["model"]}}',
		description: 'Generate videos using Sora 2 with multi-provider failover support',
		defaults: {
			name: 'Sora2 Batch Video',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ttapiSora2Api',
				required: false,
			},
			{
				name: 'wuyinkeSora2Api',
				required: false,
			},
		],
		properties: [
			// Operation
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Text to Video',
						value: 'text2video',
						description: 'Generate video from text prompt',
						action: 'Generate video from text',
					},
					{
						name: 'Image to Video',
						value: 'image2video',
						description: 'Generate video from image and text prompt',
						action: 'Generate video from image',
					},
				],
				default: 'text2video',
			},
			// Provider
			{
				displayName: 'Primary Provider',
				name: 'provider',
				type: 'options',
				options: [
					{
						name: 'ttapi.io',
						value: 'ttapi',
						description: 'Use ttapi.io as the primary provider',
					},
					{
						name: 'Wuyinke',
						value: 'wuyinke',
						description: 'Use wuyinkeji.com as the primary provider',
					},
				],
				default: 'ttapi',
				description: 'Primary API provider for video generation',
			},
			// Failover
			{
				displayName: 'Enable Failover',
				name: 'enableFailover',
				type: 'boolean',
				default: true,
				description: 'Whether to try the backup provider if the primary fails',
			},
			// Model
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'Sora 2 (Standard)',
						value: 'sora2',
						description: '10-15 second videos',
					},
					{
						name: 'Sora 2 Pro',
						value: 'sora2pro',
						description: '15-25 second videos, enhanced quality',
					},
				],
				default: 'sora2',
				description: 'Video generation model to use',
			},
			// Duration for Standard model
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'options',
				displayOptions: {
					show: {
						model: ['sora2'],
					},
				},
				options: [
					{ name: '10 seconds', value: 10 },
					{ name: '15 seconds', value: 15 },
				],
				default: 15,
				description: 'Video clip duration in seconds',
			},
			// Duration for Pro model
			{
				displayName: 'Duration',
				name: 'durationPro',
				type: 'options',
				displayOptions: {
					show: {
						model: ['sora2pro'],
					},
				},
				options: [
					{ name: '15 seconds', value: 15 },
					{ name: '25 seconds', value: 25 },
				],
				default: 25,
				description: 'Video clip duration in seconds (Pro model)',
			},
			// Aspect Ratio
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: [
					{
						name: 'Portrait (9:16)',
						value: '9:16',
						description: 'Vertical video for TikTok, Reels, Shorts',
					},
					{
						name: 'Landscape (16:9)',
						value: '16:9',
						description: 'Horizontal video for YouTube, TV',
					},
				],
				default: '16:9',
				description: 'Video orientation',
			},
			// Prompt
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				typeOptions: {
					rows: 4,
				},
				default: '',
				description:
					'Text description of the video to generate. Use expressions to map from input data.',
				placeholder:
					'e.g. {{ $json.prompt }} or "A majestic eagle soaring over mountains at sunset"',
			},
			// Reference Image URL (for image2video)
			{
				displayName: 'Reference Image URL',
				name: 'referenceImageUrl',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['image2video'],
					},
				},
				default: '',
				description: 'URL of the reference image for image-to-video generation',
				placeholder: 'https://example.com/image.jpg',
			},
			// Options
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Parallel Requests',
						name: 'parallelRequests',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 10,
						},
						default: 3,
						description: 'Number of parallel video generation requests',
					},
					{
						displayName: 'Wait Timeout (Seconds)',
						name: 'waitTimeout',
						type: 'number',
						typeOptions: {
							minValue: 60,
							maxValue: 1800,
						},
						default: 600,
						description:
							'Maximum time to wait for video generation (video generation can take 2-15 minutes)',
					},
					{
						displayName: 'Polling Interval (Seconds)',
						name: 'pollingInterval',
						type: 'number',
						typeOptions: {
							minValue: 5,
							maxValue: 60,
						},
						default: 10,
						description: 'Seconds between status checks',
					},
					{
						displayName: 'Output Property Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'video',
						description: 'Name of the binary property to store the generated video',
					},
					{
						displayName: 'Download Video',
						name: 'downloadVideo',
						type: 'boolean',
						default: true,
						description: 'Whether to download the video file or just return the URL',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 5,
						},
						default: 2,
						description: 'Maximum number of retry attempts per provider',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get global parameters
		const provider = this.getNodeParameter('provider', 0) as Provider;
		const enableFailover = this.getNodeParameter('enableFailover', 0) as boolean;
		const model = this.getNodeParameter('model', 0) as Model;
		const options = this.getNodeParameter('options', 0, {}) as NodeOptions;

		const parallelRequests = options.parallelRequests ?? 3;
		const waitTimeout = options.waitTimeout ?? 600;
		const pollingInterval = options.pollingInterval ?? 10;
		const binaryPropertyName = options.binaryPropertyName ?? 'video';
		const downloadVideo = options.downloadVideo ?? true;

		// Initialize providers based on configuration
		const providers: BaseSora2Provider[] = [];
		const providerOrder: Provider[] =
			provider === 'ttapi' ? ['ttapi', 'wuyinke'] : ['wuyinke', 'ttapi'];

		for (const p of providerOrder) {
			try {
				if (p === 'ttapi') {
					await this.getCredentials('ttapiSora2Api');
					providers.push(new TtapiProvider(this));
				} else {
					await this.getCredentials('wuyinkeSora2Api');
					providers.push(new WuyinkeProvider(this));
				}
			} catch {
				// Credential not configured, skip this provider
			}
		}

		if (providers.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'No provider credentials configured. Please add credentials for at least one provider.',
			);
		}

		// Process items in parallel batches
		for (let i = 0; i < items.length; i += parallelRequests) {
			const batch = items.slice(i, i + parallelRequests);
			const batchPromises = batch.map((_, batchIndex) => {
				const itemIndex = i + batchIndex;
				return processItem(
					this,
					itemIndex,
					providers,
					enableFailover,
					model,
					waitTimeout,
					pollingInterval,
				);
			});

			const batchResults = await Promise.all(batchPromises);

			// Process results
			for (const result of batchResults) {
				if (result.success && result.videoUrl && downloadVideo) {
					try {
						const activeProvider = providers.find((p) => p.providerType === result.provider);
						if (activeProvider) {
							const videoBuffer = await activeProvider.downloadVideo(result.videoUrl);
							const binaryData = await this.helpers.prepareBinaryData(
								videoBuffer,
								'generated_video.mp4',
								'video/mp4',
							);

							returnData.push({
								json: {
									prompt: result.prompt,
									provider: result.provider,
									taskId: result.taskId,
									duration: result.duration,
									aspectRatio: result.aspectRatio,
									success: true,
								},
								binary: {
									[binaryPropertyName]: binaryData,
								},
								pairedItem: { item: result.itemIndex },
							});
						}
					} catch (downloadError) {
						// If download fails, return URL instead
						returnData.push({
							json: {
								...result,
								downloadError:
									downloadError instanceof Error ? downloadError.message : String(downloadError),
							},
							pairedItem: { item: result.itemIndex },
						});
					}
				} else {
					returnData.push({
						json: {
							prompt: result.prompt,
							provider: result.provider,
							taskId: result.taskId,
							duration: result.duration,
							aspectRatio: result.aspectRatio,
							success: result.success,
							videoUrl: result.videoUrl,
							error: result.error,
						},
						pairedItem: { item: result.itemIndex },
					});
				}
			}
		}

		return [returnData];
	}
}
