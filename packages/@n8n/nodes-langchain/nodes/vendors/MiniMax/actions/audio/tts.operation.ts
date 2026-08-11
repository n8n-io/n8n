import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';

import type { T2AResponse } from '../../helpers/interfaces';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelId',
		type: 'options',
		options: [
			{
				name: 'Speech 02 HD',
				value: 'speech-02-hd',
				description: 'Superior rhythm and stability with outstanding quality',
			},
			{
				name: 'Speech 02 Turbo',
				value: 'speech-02-turbo',
				description: 'Enhanced multilingual capabilities and performance',
			},
			{
				name: 'Speech 2.6 HD',
				value: 'speech-2.6-hd',
				description: 'HD model with outstanding prosody and cloning similarity',
			},
			{
				name: 'Speech 2.6 Turbo',
				value: 'speech-2.6-turbo',
				description: 'Turbo model with support for 40 languages',
			},
			{
				name: 'Speech 2.8 HD',
				value: 'speech-2.8-hd',
				description: 'Latest HD model with ultra-realistic quality and sound tags',
			},
			{
				name: 'Speech 2.8 Turbo',
				value: 'speech-2.8-turbo',
				description: 'Latest Turbo model with seamless speed and natural flow',
			},
		],
		default: 'speech-2.8-hd',
		description: 'The speech synthesis model to use',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		description: 'The text to convert to speech (max 10,000 characters)',
		placeholder: 'e.g. Hello, welcome to our service!',
	},
	{
		displayName: 'Voice ID',
		name: 'voiceId',
		type: 'string',
		default: 'English_Graceful_Lady',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Voice ID to use for speech synthesis. Browse available voices in the <a href="https://platform.minimax.io/docs/faq/system-voice-id">MiniMax documentation</a>.',
		placeholder: 'e.g. English_Graceful_Lady',
	},
	{
		displayName: 'Download Audio',
		name: 'downloadAudio',
		type: 'boolean',
		default: true,
		description:
			'Whether to download the generated audio as binary data. When disabled, only the audio URL is returned.',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Audio Format',
				name: 'audioFormat',
				type: 'options',
				options: [
					{ name: 'MP3', value: 'mp3' },
					{ name: 'PCM', value: 'pcm' },
					{ name: 'FLAC', value: 'flac' },
					{ name: 'WAV', value: 'wav' },
				],
				default: 'mp3',
				description: 'Output audio format. WAV is only supported in non-streaming mode.',
			},
			{
				displayName: 'Emotion',
				name: 'emotion',
				type: 'options',
				options: [
					{ name: 'Angry', value: 'angry' },
					{ name: 'Calm', value: 'calm' },
					{ name: 'Disgusted', value: 'disgusted' },
					{ name: 'Fearful', value: 'fearful' },
					{ name: 'Happy', value: 'happy' },
					{ name: 'Sad', value: 'sad' },
					{ name: 'Surprised', value: 'surprised' },
				],
				default: 'calm',
				description:
					'Emotion for synthesized speech. By default the model auto-selects the most natural emotion.',
			},
			{
				displayName: 'Language Boost',
				name: 'languageBoost',
				type: 'options',
				options: [
					{ name: 'Arabic', value: 'Arabic' },
					{ name: 'Auto Detect', value: 'auto' },
					{ name: 'Chinese', value: 'Chinese' },
					{ name: 'English', value: 'English' },
					{ name: 'French', value: 'French' },
					{ name: 'German', value: 'German' },
					{ name: 'Indonesian', value: 'Indonesian' },
					{ name: 'Italian', value: 'Italian' },
					{ name: 'Japanese', value: 'Japanese' },
					{ name: 'Korean', value: 'Korean' },
					{ name: 'Portuguese', value: 'Portuguese' },
					{ name: 'Russian', value: 'Russian' },
					{ name: 'Spanish', value: 'Spanish' },
					{ name: 'Thai', value: 'Thai' },
					{ name: 'Turkish', value: 'Turkish' },
					{ name: 'Vietnamese', value: 'Vietnamese' },
				],
				default: 'auto',
				description: 'Enhance recognition for a specific language',
			},
			{
				displayName: 'Pitch',
				name: 'pitch',
				type: 'number',
				typeOptions: {
					minValue: -12,
					maxValue: 12,
				},
				default: 0,
				description: 'Speech pitch adjustment (-12 to 12, 0 = original pitch)',
			},
			{
				displayName: 'Speed',
				name: 'speed',
				type: 'number',
				typeOptions: {
					minValue: 0.5,
					maxValue: 2,
					numberPrecision: 1,
				},
				default: 1,
				description: 'Speech speed (0.5-2, higher = faster)',
			},
			{
				displayName: 'Volume',
				name: 'volume',
				type: 'number',
				typeOptions: {
					minValue: 0.1,
					maxValue: 10,
					numberPrecision: 1,
				},
				default: 1,
				description: 'Speech volume (0.1-10, higher = louder)',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['audio'],
		operation: ['textToSpeech'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', itemIndex) as string;
	const text = this.getNodeParameter('text', itemIndex) as string;
	const voiceId = this.getNodeParameter('voiceId', itemIndex) as string;
	const downloadAudio = this.getNodeParameter('downloadAudio', itemIndex, true) as boolean;
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

	const audioFormat = (options.audioFormat as string) || 'mp3';

	const body: IDataObject = {
		model,
		text,
		stream: false,
		output_format: 'url',
		voice_setting: {
			voice_id: voiceId,
			speed: (options.speed as number) ?? 1,
			vol: (options.volume as number) ?? 1,
			pitch: (options.pitch as number) ?? 0,
		},
		audio_setting: {
			format: audioFormat,
		},
	};

	if (options.emotion) {
		(body.voice_setting as IDataObject).emotion = options.emotion;
	}

	if (options.languageBoost) {
		body.language_boost = options.languageBoost;
	}

	const response = (await apiRequest.call(this, 'POST', '/t2a_v2', {
		body,
	})) as T2AResponse;

	if (response.base_resp?.status_code !== 0) {
		throw new NodeOperationError(
			this.getNode(),
			`Text-to-speech failed: ${response.base_resp?.status_msg || 'Unknown error'}`,
		);
	}

	const audioData = response.data?.audio;
	if (!audioData) {
		throw new NodeOperationError(this.getNode(), 'No audio data returned');
	}

	const jsonData: IDataObject = {
		audioLength: response.extra_info?.audio_length,
		audioFormat: response.extra_info?.audio_format,
		audioSize: response.extra_info?.audio_size,
		wordCount: response.extra_info?.word_count,
		usageCharacters: response.extra_info?.usage_characters,
	};

	if (downloadAudio) {
		const audioResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: audioData,
			encoding: 'arraybuffer',
			returnFullResponse: true,
		});

		const mimeType = (audioResponse.headers?.['content-type'] as string) || `audio/${audioFormat}`;
		const binaryBuffer = Buffer.from(audioResponse.body as ArrayBuffer);
		const fileName = `speech.${audioFormat}`;
		const binaryData = await this.helpers.prepareBinaryData(binaryBuffer, fileName, mimeType);

		return [
			{
				binary: { data: binaryData },
				json: jsonData,
				pairedItem: { item: itemIndex },
			},
		];
	}

	return [
		{
			json: { ...jsonData, audioUrl: audioData },
			pairedItem: { item: itemIndex },
		},
	];
}
