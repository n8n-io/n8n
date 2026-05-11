import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';

import type { ImageGenerationResponse } from '../../helpers/interfaces';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelId',
		type: 'options',
		options: [
			{
				name: 'Image-01',
				value: 'image-01',
				description: 'High-quality image generation with fine-grained details',
			},
		],
		default: 'image-01',
		description: 'The model to use for image generation',
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		description: 'Text description of the image to generate (max 1500 characters)',
		placeholder: 'e.g. A serene mountain landscape at sunset with reflections in a lake',
	},
	{
		displayName: 'Aspect Ratio',
		name: 'aspectRatio',
		type: 'options',
		options: [
			{ name: '1:1 (1024x1024)', value: '1:1' },
			{ name: '16:9 (1280x720)', value: '16:9' },
			{ name: '2:3 (832x1248)', value: '2:3' },
			{ name: '21:9 (1344x576)', value: '21:9' },
			{ name: '3:2 (1248x832)', value: '3:2' },
			{ name: '3:4 (864x1152)', value: '3:4' },
			{ name: '4:3 (1152x864)', value: '4:3' },
			{ name: '9:16 (720x1280)', value: '9:16' },
		],
		default: '1:1',
		description: 'Aspect ratio of the generated image',
	},
	{
		displayName: 'Number of Images',
		name: 'numberOfImages',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 9,
		},
		default: 1,
		description: 'Number of images to generate per request (1-9)',
	},
	{
		displayName: 'Download Image',
		name: 'downloadImage',
		type: 'boolean',
		default: true,
		description:
			'Whether to download the generated image as binary data. When disabled, only the image URL is returned.',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Prompt Optimizer',
				name: 'promptOptimizer',
				type: 'boolean',
				default: false,
				description: 'Whether to automatically optimize the prompt for better results',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: 0,
				description:
					'Random seed for reproducible outputs. Using the same seed and parameters produces the same image.',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['generate'],
		resource: ['image'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i) as string;
	const prompt = this.getNodeParameter('prompt', i) as string;
	const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
	const numberOfImages = this.getNodeParameter('numberOfImages', i, 1) as number;
	const downloadImage = this.getNodeParameter('downloadImage', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {}) as {
		promptOptimizer?: boolean;
		seed?: number;
	};

	const body: IDataObject = {
		model,
		prompt,
		aspect_ratio: aspectRatio,
		n: numberOfImages,
		response_format: 'url',
	};

	if (options.promptOptimizer !== undefined) {
		body.prompt_optimizer = options.promptOptimizer;
	}

	if (options.seed !== undefined) {
		body.seed = options.seed;
	}

	const response = (await apiRequest.call(this, 'POST', '/image_generation', {
		body,
	})) as ImageGenerationResponse;

	if (response.base_resp?.status_code !== 0) {
		throw new NodeOperationError(
			this.getNode(),
			`Image generation failed: ${response.base_resp?.status_msg || 'Unknown error'}`,
		);
	}

	const imageUrls = response.data?.image_urls ?? [];
	if (imageUrls.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No images were generated');
	}

	const results: INodeExecutionData[] = [];

	for (let idx = 0; idx < imageUrls.length; idx++) {
		const imageUrl = imageUrls[idx];

		if (downloadImage) {
			const imageResponse = await this.helpers.httpRequest({
				method: 'GET',
				url: imageUrl,
				encoding: 'arraybuffer',
				returnFullResponse: true,
			});

			const contentType = (imageResponse.headers?.['content-type'] as string) || 'image/png';
			const fileContent = Buffer.from(imageResponse.body as ArrayBuffer);
			const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
			const binaryData = await this.helpers.prepareBinaryData(
				fileContent,
				`image_${idx}.${ext}`,
				contentType,
			);

			results.push({
				binary: { data: binaryData },
				json: { imageUrl },
				pairedItem: { item: i },
			});
		} else {
			results.push({
				json: { imageUrl },
				pairedItem: { item: i },
			});
		}
	}

	return results;
}
