import FormData from 'form-data';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { getBinaryDataFile } from '../../../helpers/binary-data';
import { apiRequest } from '../../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		default: 'gpt-image-1',
		description: 'The model to use for image generation',
		options: [
			{
				name: 'DALL·E 2',
				value: 'dall-e-2',
			},
			{
				name: 'GPT Image 1',
				value: 'gpt-image-1',
			},
		],
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		default: '',
		description:
			'A text description of the desired image(s). Maximum 1000 characters for dall-e-2, 32000 characters for gpt-image-1.',
		placeholder: 'A beautiful sunset over mountains',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Images',
		name: 'images',
		type: 'fixedCollection',
		placeholder: 'Add Image',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Image',
		},
		default: { values: [{ binaryPropertyName: 'data' }] },
		description:
			'Add one or more binary fields to include images with your prompt. Each image should be a png, webp, or jpg file less than 50MB. You can provide up to 16 images.',
		displayOptions: {
			show: {
				'/model': ['gpt-image-1'],
			},
		},
		options: [
			{
				displayName: 'Image',
				name: 'values',
				values: [
					{
						displayName: 'Binary Field Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						placeholder: 'e.g. data',
						description: 'The name of the binary field containing the image data',
					},
				],
			},
		],
	},
	{
		displayName: 'Binary Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description:
			'Name of the binary property which contains the image. It should be a square png file less than 4MB.',
		displayOptions: {
			show: {
				'/model': ['dall-e-2'],
			},
		},
	},
	{
		displayName: 'Number of Images',
		name: 'n',
		type: 'number',
		default: 1,
		description: 'The number of images to generate. Must be between 1 and 10.',
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
	},
	{
		displayName: 'Size',
		name: 'size',
		type: 'options',
		default: '1024x1024',
		description: 'The size of the generated images',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: '256x256',
				value: '256x256',
			},
			{
				name: '512x512',
				value: '512x512',
			},
			{
				name: '1024x1024',
				value: '1024x1024',
			},
			{
				name: '1024x1536 (Portrait)',
				value: '1024x1536',
			},
			{
				name: '1536x1024 (Landscape)',
				value: '1536x1024',
			},
			{
				name: 'Auto',
				value: 'auto',
			},
		],
	},
	{
		displayName: 'Quality',
		name: 'quality',
		type: 'options',
		default: 'auto',
		description: 'The quality of the image that will be generated',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Auto',
				value: 'auto',
			},
			{
				name: 'High',
				value: 'high',
			},
			{
				name: 'Medium',
				value: 'medium',
			},
			{
				name: 'Low',
				value: 'low',
			},
			{
				name: 'Standard',
				value: 'standard',
			},
		],
		displayOptions: {
			show: {
				'/model': ['gpt-image-1'],
			},
		},
	},
	{
		displayName: 'Response Format',
		name: 'responseFormat',
		type: 'options',
		default: 'url',
		description:
			'The format in which the generated images are returned. URLs are only valid for 60 minutes after generation.',
		options: [
			{
				name: 'URL',
				value: 'url',
			},
			{
				name: 'Base64 JSON',
				value: 'b64_json',
			},
		],
		displayOptions: {
			show: {
				'/model': ['dall-e-2'],
			},
		},
	},
	{
		displayName: 'Output Format',
		name: 'outputFormat',
		type: 'options',
		default: 'png',
		description:
			'The format in which the generated images are returned. Only supported for gpt-image-1.',
		options: [
			{
				name: 'PNG',
				value: 'png',
			},
			{
				name: 'JPEG',
				value: 'jpeg',
			},
			{
				name: 'WebP',
				value: 'webp',
			},
		],
		displayOptions: {
			show: {
				'/model': ['gpt-image-1'],
			},
		},
	},
	{
		displayName: 'Output Compression',
		name: 'outputCompression',
		type: 'number',
		default: 100,
		description:
			'The compression level (0-100%) for the generated images. Only supported for gpt-image-1 with webp or jpeg output formats.',
		typeOptions: {
			minValue: 0,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				'/model': ['gpt-image-1'],
				outputFormat: ['webp', 'jpeg'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'User',
				name: 'user',
				type: 'string',
				default: '',
				description:
					'A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse',
				placeholder: 'user-12345',
			},
			{
				displayName: 'Background',
				name: 'background',
				type: 'options',
				default: 'auto',
				description:
					'Allows to set transparency for the background of the generated image(s). Only supported for gpt-image-1.',
				options: [
					{
						name: 'Auto',
						value: 'auto',
					},
					{
						name: 'Transparent',
						value: 'transparent',
					},
					{
						name: 'Opaque',
						value: 'opaque',
					},
				],
				displayOptions: {
					show: {
						'/model': ['gpt-image-1'],
					},
				},
			},
			{
				displayName: 'Input Fidelity',
				name: 'inputFidelity',
				type: 'options',
				default: 'low',
				description:
					'Control how much effort the model will exert to match the style and features of input images. Only supported for gpt-image-1.',
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'High',
						value: 'high',
					},
				],
				displayOptions: {
					show: {
						'/model': ['gpt-image-1'],
					},
				},
			},
			{
				displayName: 'Image Mask',
				name: 'imageMask',
				type: 'string',
				default: 'data',
				hint: 'The name of the input field containing the binary file data to be processed',
				description:
					'Name of the binary property which contains the image. An additional image whose fully transparent areas (e.g. where alpha is zero) indicate where image should be edited. If there are multiple images provided, the mask will be applied on the first image. Must be a valid PNG file, less than 4MB, and have the same dimensions as image.',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['edit'],
		resource: ['image'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('model', i);
	const prompt = this.getNodeParameter('prompt', i);
	const options = this.getNodeParameter('options', i, {});

	const isGPTImage1 = model === 'gpt-image-1';
	const isDallE2 = model === 'dall-e-2';

	const n = this.getNodeParameter('n', i, 1) as number;
	const size = this.getNodeParameter('size', i, '1024x1024') as string;
	const defaultResponseFormat = isGPTImage1 ? 'b64_json' : 'url';
	const responseFormat = this.getNodeParameter(
		'responseFormat',
		i,
		defaultResponseFormat,
	) as string;
	const quality = this.getNodeParameter('quality', i, 'auto') as string;

	const formData = new FormData();

	if (isGPTImage1) {
		const imagesParam = this.getNodeParameter('images', i, {
			values: [{ binaryPropertyName: 'data' }],
		}) as { values: Array<{ binaryPropertyName: string | IBinaryData }> };

		const imagesUi = imagesParam.values ?? [];
		const imageFieldNames = imagesUi.map((v) => v.binaryPropertyName).filter((n) => Boolean(n));

		for (const fieldName of imageFieldNames) {
			const { fileContent, contentType, filename } = await getBinaryDataFile(this, i, fieldName);
			const buffer = await this.helpers.binaryToBuffer(fileContent);
			formData.append('image[]', buffer, {
				filename,
				contentType,
			});
		}
	} else {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
		const { fileContent, contentType, filename } = await getBinaryDataFile(
			this,
			i,
			binaryPropertyName,
		);
		const buffer = await this.helpers.binaryToBuffer(fileContent);
		formData.append('image', buffer, {
			filename,
			contentType,
		});
	}

	formData.append('prompt', prompt);
	formData.append('model', model);

	if (n) {
		formData.append('n', n.toString());
	}
	if (size) {
		formData.append('size', size);
	}
	if (responseFormat && isDallE2) {
		formData.append('response_format', responseFormat);
	}
	if (options.user) {
		formData.append('user', options.user as string);
	}
	if (options.background && isGPTImage1) {
		formData.append('background', options.background as string);
	}
	if (options.inputFidelity && isGPTImage1) {
		formData.append('input_fidelity', options.inputFidelity as string);
	}
	if (options.outputFormat && isGPTImage1) {
		formData.append('output_format', options.outputFormat as string);
	}
	if (options.outputCompression !== undefined && options.outputCompression !== null) {
		formData.append('output_compression', String(Number(options.outputCompression)));
	}
	if (quality && isGPTImage1) {
		formData.append('quality', quality);
	}

	if (options.imageMask && typeof options.imageMask === 'string') {
		const { fileContent, contentType, filename } = await getBinaryDataFile(
			this,
			i,
			options.imageMask,
		);
		const buffer = await this.helpers.binaryToBuffer(fileContent);
		formData.append('mask', buffer, {
			filename,
			contentType,
		});
	}

	const response = (await apiRequest.call(this, 'POST', '/images/edits', {
		option: { formData },
		headers: formData.getHeaders(),
	})) as IDataObject;

	const returnData: INodeExecutionData[] = [];

	if (responseFormat === 'url') {
		const data = (response.data as IDataObject[]) || [];
		const entries = data.map((entry) => ({
			json: entry,
			pairedItem: { item: i },
		}));
		Array.prototype.push.apply(returnData, entries);
	} else {
		for (const entry of (response.data as IDataObject[]) || []) {
			const binaryData = await this.helpers.prepareBinaryData(
				Buffer.from(entry.b64_json as string, 'base64'),
				'data',
			);
			returnData.push({
				json: Object.assign({}, binaryData, {
					data: undefined,
				}),
				binary: {
					data: binaryData,
				},
				pairedItem: { item: i },
			});
		}
	}
	return returnData;
}
