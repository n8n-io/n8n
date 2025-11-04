import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';

import {
	type GenerateContentRequest,
	type GenerateContentResponse,
	type ImagenResponse,
	Modality,
} from '../../helpers/interfaces';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC('imageGenerationModelSearch'),
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		placeholder: 'e.g. A cute cat eating a dinosaur',
		description: 'A text description of the desired image(s)',
		default: '',
		typeOptions: {
			rows: 2,
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
				displayName: 'Number of Images',
				name: 'sampleCount',
				default: 1,
				description:
					'Number of images to generate. Not supported by Gemini models, supported by Imagen models.',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Put Output in Field',
				name: 'binaryPropertyOutput',
				type: 'string',
				default: 'data',
				hint: 'The name of the output field to put the binary file data in',
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
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const prompt = this.getNodeParameter('prompt', i, '') as string;
	const binaryPropertyOutput = this.getNodeParameter(
		'options.binaryPropertyOutput',
		i,
		'data',
	) as string;

	if (model.includes('gemini')) {
		const generationConfig = {
			responseModalities: [Modality.IMAGE, Modality.TEXT],
		};
		const body: GenerateContentRequest = {
			contents: [
				{
					role: 'user',
					parts: [{ text: prompt }],
				},
			],
			generationConfig,
		};

		const response = (await apiRequest.call(this, 'POST', `/v1beta/${model}:generateContent`, {
			body,
		})) as GenerateContentResponse;
		const promises = response.candidates.map(async (candidate) => {
			const imagePart = candidate.content.parts.find((part) => 'inlineData' in part);
			const buffer = Buffer.from(imagePart?.inlineData.data ?? '', 'base64');
			const binaryData = await this.helpers.prepareBinaryData(
				buffer,
				'image.png',
				imagePart?.inlineData.mimeType,
			);
			return {
				binary: {
					[binaryPropertyOutput]: binaryData,
				},
				json: {
					...binaryData,
					data: undefined,
				},
				pairedItem: { item: i },
			};
		});

		return await Promise.all(promises);
	} else if (model.includes('imagen') || model.includes('flash-image')) {
		// Imagen models use a different endpoint and request/response structure
		const sampleCount = this.getNodeParameter('options.sampleCount', i, 1) as number;
		const body = {
			instances: [
				{
					prompt,
				},
			],
			parameters: {
				sampleCount,
			},
		};
		const response = (await apiRequest.call(this, 'POST', `/v1beta/${model}:predict`, {
			body,
		})) as ImagenResponse;

		const promises = response.predictions.map(async (prediction) => {
			const buffer = Buffer.from(prediction.bytesBase64Encoded ?? '', 'base64');
			const binaryData = await this.helpers.prepareBinaryData(
				buffer,
				'image.png',
				prediction.mimeType,
			);
			return {
				binary: {
					[binaryPropertyOutput]: binaryData,
				},
				json: {
					...binaryData,
					data: undefined,
				},
				pairedItem: { item: i },
			};
		});

		return await Promise.all(promises);
	}

	throw new NodeOperationError(
		this.getNode(),
		`Model ${model} is not supported for image generation`,
		{
			description: 'Please check the model ID and try again.',
		},
	);
}
