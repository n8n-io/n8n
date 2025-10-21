import type { INodeProperties } from 'n8n-workflow';

export const speechOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['speech'],
			},
		},
		options: [
			{
				name: 'Synthesize',
				value: 'synthesize',
				description: 'Convert text to speech',
				action: 'Synthesize speech',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/speech',
					},
				},
			},
			{
				name: 'Start Synthesis Task',
				value: 'startTask',
				description: 'Start asynchronous speech synthesis task',
				action: 'Start synthesis task',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/synthesisTasks',
					},
				},
			},
			{
				name: 'Get Synthesis Task',
				value: 'getTask',
				description: 'Get synthesis task details',
				action: 'Get synthesis task',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/synthesisTasks/{{$parameter["TaskId"]}}',
					},
				},
			},
			{
				name: 'List Voices',
				value: 'listVoices',
				description: 'List available voices',
				action: 'List voices',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/voices',
					},
				},
			},
		],
		default: 'synthesize',
	},
];

export const speechFields: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'Text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['synthesize', 'startTask'],
			},
		},
		default: '',
		typeOptions: {
			rows: 4,
		},
		routing: {
			request: {
				body: {
					Text: '={{ $value }}',
				},
			},
		},
		description: 'The text to convert to speech',
	},
	{
		displayName: 'Voice ID',
		name: 'VoiceId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['synthesize', 'startTask'],
			},
		},
		default: 'Joanna',
		routing: {
			request: {
				body: {
					VoiceId: '={{ $value }}',
				},
			},
		},
		description: 'The voice to use (e.g., Joanna, Matthew, Amy, Brian)',
	},
	{
		displayName: 'Output Format',
		name: 'OutputFormat',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['synthesize', 'startTask'],
			},
		},
		options: [
			{
				name: 'MP3',
				value: 'mp3',
			},
			{
				name: 'OGG Vorbis',
				value: 'ogg_vorbis',
			},
			{
				name: 'PCM',
				value: 'pcm',
			},
			{
				name: 'JSON',
				value: 'json',
			},
		],
		default: 'mp3',
		routing: {
			request: {
				body: {
					OutputFormat: '={{ $value }}',
				},
			},
		},
		description: 'The audio format for the output',
	},
	{
		displayName: 'Text Type',
		name: 'TextType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['synthesize', 'startTask'],
			},
		},
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'SSML',
				value: 'ssml',
			},
		],
		default: 'text',
		routing: {
			request: {
				body: {
					TextType: '={{ $value }}',
				},
			},
		},
		description: 'Whether the input text is plain text or SSML',
	},
	{
		displayName: 'Engine',
		name: 'Engine',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['synthesize', 'startTask'],
			},
		},
		options: [
			{
				name: 'Standard',
				value: 'standard',
			},
			{
				name: 'Neural',
				value: 'neural',
			},
		],
		default: 'standard',
		routing: {
			request: {
				body: {
					Engine: '={{ $value }}',
				},
			},
		},
		description: 'The synthesis engine (neural provides higher quality)',
	},
	{
		displayName: 'Language Code',
		name: 'LanguageCode',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['synthesize', 'startTask'],
			},
		},
		default: 'en-US',
		routing: {
			request: {
				body: {
					LanguageCode: '={{ $value }}',
				},
			},
		},
		description: 'The language code (e.g., en-US, es-ES, fr-FR)',
	},
	{
		displayName: 'Sample Rate',
		name: 'SampleRate',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['synthesize', 'startTask'],
			},
		},
		default: '22050',
		routing: {
			request: {
				body: {
					SampleRate: '={{ $value }}',
				},
			},
		},
		description: 'The audio sample rate in Hz (8000, 16000, 22050, 24000)',
	},
	{
		displayName: 'Output S3 Bucket',
		name: 'OutputS3BucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['startTask'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					OutputS3BucketName: '={{ $value }}',
				},
			},
		},
		description: 'The S3 bucket for output (async task only)',
	},
	{
		displayName: 'Output S3 Key Prefix',
		name: 'OutputS3KeyPrefix',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['startTask'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					OutputS3KeyPrefix: '={{ $value }}',
				},
			},
		},
		description: 'The S3 key prefix for output',
	},
	{
		displayName: 'Task ID',
		name: 'TaskId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['getTask'],
			},
		},
		default: '',
		description: 'The ID of the synthesis task',
	},
	{
		displayName: 'Language Code Filter',
		name: 'LanguageCode',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['speech'],
				operation: ['listVoices'],
			},
		},
		default: '',
		routing: {
			request: {
				qs: {
					LanguageCode: '={{ $value }}',
				},
			},
		},
		description: 'Filter voices by language code',
	},
];
