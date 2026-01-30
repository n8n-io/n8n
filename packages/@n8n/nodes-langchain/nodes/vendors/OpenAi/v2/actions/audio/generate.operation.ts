import type {
	INodeProperties,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

const commonVoices = [
	{ name: 'Alloy', value: 'alloy' },
	{ name: 'Ash', value: 'ash' },
	{ name: 'Coral', value: 'coral' },
	{ name: 'Echo', value: 'echo' },
	{ name: 'Fable', value: 'fable' },
	{ name: 'Nova', value: 'nova' },
	{ name: 'Onyx', value: 'onyx' },
	{ name: 'Sage', value: 'sage' },
	{ name: 'Shimmer', value: 'shimmer' },
];

const gpt4oMiniVoices = [
	{ name: 'Ballad', value: 'ballad' },
	{ name: 'Verse', value: 'verse' },
];

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		default: 'tts-1',
		options: [
			{
				name: 'GPT-4o Mini TTS',
				value: 'gpt-4o-mini-tts',
			},
			{
				name: 'TTS-1',
				value: 'tts-1',
			},
			{
				name: 'TTS-1-HD',
				value: 'tts-1-hd',
			},
		],
	},
	{
		displayName: 'Text Input',
		name: 'input',
		type: 'string',
		placeholder: 'e.g. The quick brown fox jumped over the lazy dog',
		description: 'The text to generate audio for. The maximum length is 4096 characters.',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Voice',
		name: 'voice',
		type: 'options',
		default: 'alloy',
		description: 'The voice to use when generating the audio',
		displayOptions: {
			show: {
				model: ['tts-1', 'tts-1-hd'],
			},
		},
		options: commonVoices,
	},
	{
		displayName: 'Voice',
		name: 'voice',
		type: 'options',
		default: 'alloy',
		description: 'The voice to use when generating the audio',
		displayOptions: {
			show: {
				model: ['gpt-4o-mini-tts'],
			},
		},
		options: [...commonVoices, ...gpt4oMiniVoices].sort((a, b) => a.name.localeCompare(b.name)),
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Response Format',
				name: 'response_format',
				type: 'options',
				default: 'mp3',
				options: [
					{
						name: 'AAC',
						value: 'aac',
					},
					{
						name: 'FLAC',
						value: 'flac',
					},
					{
						name: 'MP3',
						value: 'mp3',
					},
					{
						name: 'OPUS',
						value: 'opus',
					},
					{
						name: 'PCM',
						value: 'pcm',
					},
					{
						name: 'WAV',
						value: 'wav',
					},
				],
			},
			{
				displayName: 'Audio Speed',
				name: 'speed',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 0.25,
					maxValue: 4,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Instructions',
				name: 'instructions',
				type: 'string',
				default: '',
				placeholder: 'e.g. Speak like a friendly customer service agent',
				description:
					'Additional instructions to control the voice of the generated audio. Only works with gpt-4o-mini-tts model.',
				displayOptions: {
					show: {
						'/model': ['gpt-4o-mini-tts'],
					},
				},
				typeOptions: {
					rows: 2,
				},
			},
			{
				displayName: 'Stream Format',
				name: 'stream_format',
				type: 'options',
				default: 'audio',
				description: 'The format to stream the audio in',
				displayOptions: {
					show: {
						'/model': ['gpt-4o-mini-tts'],
					},
				},
				options: [
					{
						name: 'Audio',
						value: 'audio',
					},
					{
						name: 'SSE',
						value: 'sse',
						description: 'Server-Sent Events format',
					},
				],
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
		resource: ['audio'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('model', i) as string;
	const input = this.getNodeParameter('input', i) as string;
	const voice = this.getNodeParameter('voice', i) as string;
	let response_format = 'mp3';
	let speed = 1;

	const options = this.getNodeParameter('options', i, {});

	if (options.response_format) {
		response_format = options.response_format as string;
	}

	if (options.speed) {
		speed = options.speed as number;
	}

	const body: IDataObject = {
		model,
		input,
		voice,
		response_format,
		speed,
	};

	if (options.instructions) {
		body.instructions = options.instructions as string;
	}

	if (options.stream_format) {
		body.stream_format = options.stream_format as string;
	}

	const option = {
		useStream: true,
		returnFullResponse: true,
		encoding: 'arraybuffer',
		json: false,
	};

	const response = await apiRequest.call(this, 'POST', '/audio/speech', { body, option });

	const binaryData = await this.helpers.prepareBinaryData(
		response,
		`audio.${response_format}`,
		`audio/${response_format}`,
	);

	const binaryPropertyOutput = (options.binaryPropertyOutput as string) || 'data';

	const newItem: INodeExecutionData = {
		json: {
			...binaryData,
			data: undefined,
		},
		pairedItem: { item: i },
		binary: {
			[binaryPropertyOutput]: binaryData,
		},
	};

	return [newItem];
}
