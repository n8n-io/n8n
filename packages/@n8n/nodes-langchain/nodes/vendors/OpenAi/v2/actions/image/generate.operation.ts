import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../../transport';
import { imageGenerateOptions, imageGenerateOptionsRLC, modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		default: 'dall-e-3',
		description: 'The model to use for image generation',
		options: [
			{
				name: 'DALL·E 2',
				value: 'dall-e-2',
			},
			{
				name: 'DALL·E 3',
				value: 'dall-e-3',
			},
			{
				name: 'GPT Image 1',
				value: 'gpt-image-1',
			},
		],
		displayOptions: {
			show: {
				'@version': [{ _cnd: { lt: 2.2 } }],
			},
		},
	},
	{
		...modelRLC('imageGenerateModelSearch'),
		default: { mode: 'list', value: 'gpt-image-1-mini' },
		displayOptions: {
			show: {
				'@version': [{ _cnd: { gte: 2.2 } }],
			},
		},
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		placeholder: 'e.g. A cute cat eating a dinosaur',
		description:
			'A text description of the desired image(s). The maximum length is 1000 characters for dall-e-2 and 4000 characters for dall-e-3.',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	imageGenerateOptions,
	imageGenerateOptionsRLC,
];

const displayOptions = {
	show: {
		operation: ['generate'],
		resource: ['image'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const nodeVersion = this.getNode().typeVersion;

	let model = '';
	if (nodeVersion >= 2.2) {
		model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	} else {
		model = this.getNodeParameter('model', i) as string;
	}

	const prompt = this.getNodeParameter('prompt', i) as string;
	const options = this.getNodeParameter('options', i, {});
	const supportsResponseFormat = !model.startsWith('gpt-image');
	let response_format = 'b64_json';
	let binaryPropertyOutput = 'data';

	if (options.returnImageUrls && supportsResponseFormat) {
		response_format = 'url';
	}

	if (options.binaryPropertyOutput) {
		binaryPropertyOutput = options.binaryPropertyOutput as string;
		delete options.binaryPropertyOutput;
	}

	if (options.dalleQuality) {
		options.quality = options.dalleQuality;
		delete options.dalleQuality;
	}

	delete options.returnImageUrls;
	const body: IDataObject = {
		prompt,
		model,
		response_format: supportsResponseFormat ? response_format : undefined,
		...options,
	};

	const { data } = await apiRequest.call(this, 'POST', '/images/generations', { body });
	if (response_format === 'url') {
		return ((data as IDataObject[]) || []).map((entry) => ({
			json: entry,
			pairedItem: { item: i },
		}));
	} else {
		const returnData: INodeExecutionData[] = [];

		for (const entry of data) {
			const binaryData = await this.helpers.prepareBinaryData(
				Buffer.from(entry.b64_json as string, 'base64'),
				'data',
			);
			returnData.push({
				json: Object.assign({}, binaryData, {
					data: undefined,
				}),
				binary: {
					[binaryPropertyOutput]: binaryData,
				},
				pairedItem: { item: i },
			});
		}

		return returnData;
	}
}
